import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStudentNormalizedKey,
  matchesSmartStudentQuery,
  normalizeApostrophes,
  validateAndAnalyzeStudentName,
} from './nameValidation.ts';
import {
  buildAttemptsCsv,
  calculateLevelInfo,
  computeStudentStats,
  computeTeacherAnalytics,
} from './scoring.ts';
import {
  clearCheaterLock,
  formatTimer,
  gradeAttempt,
  isTimerCritical,
  loadCheaterLock,
  prepareRandomizedQuiz,
  saveCheaterLock,
  verifyCheaterUnlockCode,
} from './quizEngine.ts';
import type { AttemptRecord, QuizQuestion, StudentRecord } from '../types.ts';

function makeStudent(firstName: string, lastName: string, className = '8-01', id = 'stu_1'): StudentRecord {
  const fullName = `${firstName} ${lastName}`;
  return {
    id,
    firstName,
    lastName,
    fullName,
    normalizedKey: buildStudentNormalizedKey(fullName, className),
    className,
    createdAt: '2026-01-01T10:00:00.000Z',
    lastLoginAt: '2026-01-01T10:00:00.000Z',
  };
}

test('normalizeApostrophes unifies all Uzbek apostrophe variants', () => {
  const variants = ["O'g'iloy", 'O’g’iloy', 'O`g`iloy', 'Oʻgʻiloy', 'Oʼgʼiloy'];
  const normalized = variants.map((v) => normalizeApostrophes(v).toLowerCase());
  assert.equal(new Set(normalized).size, 1);
  assert.equal(normalized[0], "o'g'iloy");
});

test('validateAndAnalyzeStudentName rejects surname-first suffixes and suggests fixed order', () => {
  const res = validateAndAnalyzeStudentName('Karimova Aziza', '7-02', []);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.errorType, 'reversed');
    assert.equal(res.message, 'Avval ismingizni, keyin familiyangizni yozing');
    assert.equal(res.suggestedName, 'Aziza Karimova');
  }

  for (const reversed of ['Toshmatov Sardor', 'Aliyeva Madina', 'Saidovich Timur', 'Sokolovskaya Anna']) {
    const check = validateAndAnalyzeStudentName(reversed, '9-01', []);
    assert.equal(check.ok, false, `Expected ${reversed} to be blocked`);
  }
});

test('validateAndAnalyzeStudentName rejects reversed order of an existing student even without -ov suffix', () => {
  const existing = [makeStudent('Dilnoza', 'Rustam', '6-01', 'stu_r')];
  const res = validateAndAnalyzeStudentName('Rustam Dilnoza', '6-01', existing);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.errorType, 'reversed');
    assert.equal(res.suggestedName, 'Dilnoza Rustam');
  }
});

test('validateAndAnalyzeStudentName recognizes returning student across case, extra spaces, and apostrophes', () => {
  const existing = [makeStudent("Oʻgʻiloy", "Yoʻldosheva", '8-02', 'stu_og')];
  const res = validateAndAnalyzeStudentName("  o'g'iloy   YOʼLDOSHEVA ", '8-02', existing);
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.ok(res.existingStudent);
    assert.equal(res.existingStudent.id, 'stu_og');
  }
});

test('matchesSmartStudentQuery matches apostrophe variants and swapped name order', () => {
  const student = makeStudent("Oʻgʻiloy", "Yoʻldosheva", '8-02', 'stu_1');
  assert.equal(matchesSmartStudentQuery(student, "o'g'iloy"), true);
  assert.equal(matchesSmartStudentQuery(student, "Yo`ldosheva O'g'iloy"), true);
  assert.equal(matchesSmartStudentQuery(student, '8-02'), true);
  assert.equal(matchesSmartStudentQuery(student, 'Karimov'), false);
});

test('computeStudentStats sums ONLY max score per unit (prevents infinite farming)', () => {
  const attempts: AttemptRecord[] = [
    {
      id: 'a1',
      studentId: 'stu_1',
      unitId: 1,
      unitTitle: 'Learning vocabulary',
      totalQuestions: 30,
      correctCount: 20,
      wrongCount: 10,
      percentage: 67,
      score: 200,
      durationSeconds: 300,
      completedAt: '2026-01-01T10:00:00.000Z',
      mistakes: [],
    },
    {
      id: 'a2',
      studentId: 'stu_1',
      unitId: 1,
      unitTitle: 'Learning vocabulary',
      totalQuestions: 30,
      correctCount: 25,
      wrongCount: 5,
      percentage: 83,
      score: 250,
      durationSeconds: 260,
      completedAt: '2026-01-01T11:00:00.000Z',
      mistakes: [],
    },
    {
      id: 'a3',
      studentId: 'stu_1',
      unitId: 2,
      unitTitle: 'Keeping a vocabulary notebook',
      totalQuestions: 30,
      correctCount: 15,
      wrongCount: 15,
      percentage: 50,
      score: 150,
      durationSeconds: 400,
      completedAt: '2026-01-01T12:00:00.000Z',
      mistakes: [],
    },
  ];

  const stats = computeStudentStats('stu_1', attempts, 100);
  // Max of unit 1 (250) + max of unit 2 (150) = 400, NOT 200+250+150=600
  assert.equal(stats.totalScore, 400);
  assert.equal(stats.completedUnitsCount, 2);
  assert.equal(stats.recommendedUnitId, 3);
  assert.equal(stats.chronologicalAttempts[1].deltaFromPrevious, 83 - 67);
  assert.equal(calculateLevelInfo(18000).level, 5);
  assert.equal(calculateLevelInfo(1500).level, 2);
});

test('prepareRandomizedQuiz & gradeAttempt preserve correct answer mapping after option shuffle', () => {
  const sample: QuizQuestion[] = [
    {
      id: 'u1_q1',
      question: 'What does "routine" mean?',
      options: ['Correct answer', 'Wrong 1', 'Wrong 2', 'Wrong 3'],
      correctIndex: 0,
      explanationUz: 'Routine — muntazam ravishda bajariladigan odatiy tartib.',
    },
  ];

  // Deterministic rng returning 0.4 then 0.1...
  let i = 0;
  const rng = () => [0.42, 0.13, 0.87, 0.25, 0.61][i++ % 5];
  const randomized = prepareRandomizedQuiz(sample, rng);
  assert.equal(randomized.length, 1);
  assert.equal(randomized[0].options[randomized[0].correctIndex], 'Correct answer');

  const gradedRight = gradeAttempt({
    attemptId: 'att_ok',
    studentId: 'stu_1',
    unitId: 1,
    unitTitle: 'Learning vocabulary',
    questions: randomized,
    answers: { u1_q1: randomized[0].correctIndex },
    durationSeconds: 45,
  });
  assert.equal(gradedRight.score, 10);
  assert.equal(gradedRight.mistakes.length, 0);

  const wrongIdx = (randomized[0].correctIndex + 1) % 4;
  const gradedWrong = gradeAttempt({
    attemptId: 'att_bad',
    studentId: 'stu_1',
    unitId: 1,
    unitTitle: 'Learning vocabulary',
    questions: randomized,
    answers: { u1_q1: wrongIdx },
    durationSeconds: 45,
  });
  assert.equal(gradedWrong.score, 0);
  assert.equal(gradedWrong.mistakes.length, 1);
});

test('timer & cheater lock helpers behave deterministically', () => {
  assert.equal(formatTimer(900), '15:00');
  assert.equal(formatTimer(59), '00:59');
  assert.equal(isTimerCritical(60), true);
  assert.equal(isTimerCritical(61), false);
  assert.equal(verifyCheaterUnlockCode(' 2026Al1209.9 ', '2026Al1209.9'), true);
  assert.equal(verifyCheaterUnlockCode('wrong', '2026Al1209.9'), false);

  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  };
  saveCheaterLock(
    { locked: true, unitId: 4, unitTitle: 'Test', studentId: 's1', lockedAt: '2026-01-01' },
    mockStorage,
  );
  assert.equal(loadCheaterLock(mockStorage)?.unitId, 4);
  clearCheaterLock(mockStorage);
  assert.equal(loadCheaterLock(mockStorage), null);
});

test('computeTeacherAnalytics and CSV export calculate class averages and top missed questions', () => {
  const students = [makeStudent('Aziza', 'Karimova', '7-01', 's1')];
  const attempts: AttemptRecord[] = [
    {
      id: 'att1',
      studentId: 's1',
      unitId: 1,
      unitTitle: 'Learning vocabulary',
      totalQuestions: 30,
      correctCount: 28,
      wrongCount: 2,
      percentage: 93,
      score: 280,
      durationSeconds: 120,
      completedAt: '2026-01-01T10:00:00.000Z',
      mistakes: [
        {
          questionId: 'u1_q5',
          unitId: 1,
          question: 'Hard question',
          options: ['A', 'B', 'C', 'D'],
          selectedIndex: 1,
          correctIndex: 0,
          explanationUz: 'Izoh',
        },
      ],
    },
  ];
  const analytics = computeTeacherAnalytics(students, attempts);
  assert.equal(analytics.totalStudents, 1);
  assert.equal(analytics.topHardQuestions[0].questionId, 'u1_q5');
  const csv = buildAttemptsCsv(students, attempts);
  assert.ok(csv.includes('Aziza Karimova'));
  assert.ok(csv.includes('7-01'));
});
