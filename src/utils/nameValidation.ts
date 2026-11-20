import type { StudentRecord } from '../types.ts';

const APOSTROPHE_REGEX = /['’`ʻʼ‘´]/g;
const SURNAME_SUFFIXES = [
  'ovich',
  'ovna',
  'yeva',
  'yev',
  'skaya',
  'skiy',
  'ova',
  'eva',
  'ov',
  'ev',
];

export function normalizeApostrophes(input: string): string {
  return input.replace(APOSTROPHE_REGEX, "'");
}

export function cleanSpaces(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function normalizeNameToken(input: string): string {
  return cleanSpaces(normalizeApostrophes(input)).toLowerCase();
}

export function formatTitleCaseName(input: string): string {
  const cleaned = cleanSpaces(input);
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function buildStudentNormalizedKey(fullName: string, className: string): string {
  return `${normalizeNameToken(fullName)}::${cleanSpaces(className).toLowerCase()}`;
}

export function hasSurnameSuffix(word: string): boolean {
  const cleanWord = normalizeNameToken(word).replace(/[^a-z']/g, '');
  if (cleanWord.length < 4) return false;
  return SURNAME_SUFFIXES.some((suffix) => cleanWord.endsWith(suffix));
}

export type NameValidationResult =
  | {
      ok: true;
      firstName: string;
      lastName: string;
      fullName: string;
      normalizedKey: string;
      existingStudent: StudentRecord | null;
    }
  | {
      ok: false;
      errorType: 'empty' | 'incomplete' | 'reversed';
      message: string;
      suggestedName?: string;
    };

export function validateAndAnalyzeStudentName(
  rawInput: string,
  className: string,
  existingStudents: StudentRecord[],
): NameValidationResult {
  const cleaned = cleanSpaces(rawInput);
  if (!cleaned) {
    return {
      ok: false,
      errorType: 'empty',
      message: 'Iltimos, ism va familiyangizni kiriting',
    };
  }

  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length < 2 || parts[0].length < 2 || parts[1].length < 2) {
    return {
      ok: false,
      errorType: 'incomplete',
      message: 'Iltimos, avval ismingizni, keyin familiyangizni to‘liq kiriting (masalan: Aziza Karimova)',
    };
  }

  const firstWord = parts[0];
  const restWords = parts.slice(1).join(' ');
  const normalizedInput = normalizeNameToken(cleaned);
  const reversedPairNormalized = normalizeNameToken(`${restWords} ${firstWord}`);

  // Check if input reverses an existing student's "firstName lastName"
  const reversedMatch = existingStudents.find((s) => {
    const existingForward = normalizeNameToken(`${s.firstName} ${s.lastName}`);
    const existingFull = normalizeNameToken(s.fullName);
    return (
      existingForward === reversedPairNormalized ||
      existingFull === reversedPairNormalized
    );
  });

  const firstWordLooksLikeSurname = hasSurnameSuffix(firstWord) && !hasSurnameSuffix(parts[parts.length - 1]);

  if (reversedMatch) {
    const suggestedName = `${reversedMatch.firstName} ${reversedMatch.lastName}`;
    return {
      ok: false,
      errorType: 'reversed',
      message: 'Avval ismingizni, keyin familiyangizni yozing',
      suggestedName,
    };
  }

  if (firstWordLooksLikeSurname) {
    const suggestedName = formatTitleCaseName(`${restWords} ${firstWord}`);
    return {
      ok: false,
      errorType: 'reversed',
      message: 'Avval ismingizni, keyin familiyangizni yozing',
      suggestedName,
    };
  }

  // Also check if someone entered 2 words in reversed order where last word doesn't have surname suffix
  // and first word DOES have surname suffix even if last word also had suffix (rare) -> blocked unless both match
  if (hasSurnameSuffix(firstWord) && !hasSurnameSuffix(parts[1])) {
    const suggestedName = formatTitleCaseName(`${restWords} ${firstWord}`);
    return {
      ok: false,
      errorType: 'reversed',
      message: 'Avval ismingizni, keyin familiyangizni yozing',
      suggestedName,
    };
  }

  const formattedFirst = formatTitleCaseName(firstWord);
  const formattedLast = formatTitleCaseName(restWords);
  const fullName = `${formattedFirst} ${formattedLast}`;
  const normalizedKey = buildStudentNormalizedKey(fullName, className);

  const existingStudent =
    existingStudents.find((s) => {
      if (s.normalizedKey === normalizedKey) return true;
      return (
        normalizeNameToken(s.fullName) === normalizedInput &&
        cleanSpaces(s.className).toLowerCase() === cleanSpaces(className).toLowerCase()
      );
    }) ?? null;

  return {
    ok: true,
    firstName: existingStudent ? existingStudent.firstName : formattedFirst,
    lastName: existingStudent ? existingStudent.lastName : formattedLast,
    fullName: existingStudent ? existingStudent.fullName : fullName,
    normalizedKey,
    existingStudent,
  };
}

export function matchesSmartStudentQuery(student: StudentRecord, rawQuery: string): boolean {
  const q = normalizeNameToken(rawQuery);
  if (!q) return true;

  const forward = normalizeNameToken(student.fullName);
  const reversed = normalizeNameToken(`${student.lastName} ${student.firstName}`);
  const classNorm = normalizeNameToken(student.className);

  if (forward.includes(q) || reversed.includes(q) || classNorm.includes(q)) {
    return true;
  }

  const tokens = q.split(' ').filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every(
      (tok) => forward.includes(tok) || classNorm.includes(tok),
    );
  }

  return false;
}
