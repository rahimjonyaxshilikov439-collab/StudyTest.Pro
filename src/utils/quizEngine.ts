import type {
  AttemptRecord,
  CheaterLockState,
  MistakeItem,
  OptionIndex,
  QuizQuestion,
} from '../types.ts';
import { POINTS_PER_CORRECT } from './scoring.ts';

export const CHEATER_LOCK_STORAGE_KEY = 'vocabcheck_cheater_lock_v1';

export function shuffleArray<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function prepareRandomizedQuiz(
  questions: readonly QuizQuestion[],
  rng: () => number = Math.random,
): QuizQuestion[] {
  const shuffledQuestions = shuffleArray(questions, rng);
  return shuffledQuestions.map((q) => {
    const indexedOptions = q.options.map((text, idx) => ({
      text,
      isCorrect: idx === q.correctIndex,
    }));
    const shuffledOptions = shuffleArray(indexedOptions, rng);
    const newCorrectIndex = shuffledOptions.findIndex((o) => o.isCorrect) as OptionIndex;
    return {
      ...q,
      options: [
        shuffledOptions[0].text,
        shuffledOptions[1].text,
        shuffledOptions[2].text,
        shuffledOptions[3].text,
      ],
      correctIndex: newCorrectIndex,
    };
  });
}

export function gradeAttempt(params: {
  attemptId: string;
  studentId: string;
  unitId: number;
  unitTitle: string;
  questions: readonly QuizQuestion[];
  answers: Record<string, number>;
  durationSeconds: number;
  completedAt?: string;
}): AttemptRecord {
  const {
    attemptId,
    studentId,
    unitId,
    unitTitle,
    questions,
    answers,
    durationSeconds,
    completedAt = new Date().toISOString(),
  } = params;

  let correctCount = 0;
  const mistakes: MistakeItem[] = [];

  for (const q of questions) {
    const selected = answers[q.id];
    if (selected === q.correctIndex) {
      correctCount += 1;
    } else {
      mistakes.push({
        questionId: q.id,
        unitId,
        question: q.question,
        options: q.options,
        selectedIndex: typeof selected === 'number' ? selected : -1,
        correctIndex: q.correctIndex,
        explanationUz: q.explanationUz,
      });
    }
  }

  const totalQuestions = questions.length;
  const wrongCount = totalQuestions - correctCount;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const score = correctCount * POINTS_PER_CORRECT;

  return {
    id: attemptId,
    studentId,
    unitId,
    unitTitle,
    totalQuestions,
    correctCount,
    wrongCount,
    percentage,
    score,
    durationSeconds: Math.max(0, Math.round(durationSeconds)),
    completedAt,
    mistakes,
  };
}

export function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatDurationUz(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins === 0) return `${secs} soniya`;
  return `${mins} daqiqa ${secs} soniya`;
}

export function isTimerCritical(remainingSeconds: number): boolean {
  return remainingSeconds > 0 && remainingSeconds <= 60;
}

export function saveCheaterLock(
  lock: CheaterLockState,
  storage: Pick<Storage, 'setItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
): void {
  if (!storage) return;
  storage.setItem(CHEATER_LOCK_STORAGE_KEY, JSON.stringify(lock));
}

export function loadCheaterLock(
  storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
): CheaterLockState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CHEATER_LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheaterLockState;
    return parsed && parsed.locked ? parsed : null;
  } catch {
    return null;
  }
}

export function clearCheaterLock(
  storage: Pick<Storage, 'removeItem'> | null = typeof window !== 'undefined' ? window.localStorage : null,
): void {
  if (!storage) return;
  storage.removeItem(CHEATER_LOCK_STORAGE_KEY);
}

export function verifyCheaterUnlockCode(inputCode: string, expectedCode: string): boolean {
  return inputCode.trim() === expectedCode.trim();
}
