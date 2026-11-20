import type { AttemptRecord, MistakeItem, StudentRecord } from '../types.ts';

export const POINTS_PER_CORRECT = 10;

export interface LevelInfo {
  level: number;
  titleUz: string;
  minScore: number;
  nextScore: number | null;
  progressPercent: number;
}

export const LEVEL_DEFINITIONS: Array<{ level: number; titleUz: string; minScore: number }> = [
  { level: 1, titleUz: 'Boshlang‘ich izlanuvchi', minScore: 0 },
  { level: 2, titleUz: 'Faol o‘rganuvchi', minScore: 1500 },
  { level: 3, titleUz: 'Ishonchli bilimdon', minScore: 4500 },
  { level: 4, titleUz: 'Tajribali mutaxassis', minScore: 10000 },
  { level: 5, titleUz: 'So‘z ustasi', minScore: 18000 },
];

export function calculateLevelInfo(totalScore: number): LevelInfo {
  let current = LEVEL_DEFINITIONS[0];
  let nextMin: number | null = LEVEL_DEFINITIONS[1].minScore;

  for (let i = 0; i < LEVEL_DEFINITIONS.length; i++) {
    if (totalScore >= LEVEL_DEFINITIONS[i].minScore) {
      current = LEVEL_DEFINITIONS[i];
      nextMin = i + 1 < LEVEL_DEFINITIONS.length ? LEVEL_DEFINITIONS[i + 1].minScore : null;
    }
  }

  let progressPercent = 100;
  if (nextMin !== null) {
    const span = nextMin - current.minScore;
    const earned = Math.max(0, totalScore - current.minScore);
    progressPercent = Math.min(100, Math.round((earned / span) * 100));
  }

  return {
    level: current.level,
    titleUz: current.titleUz,
    minScore: current.minScore,
    nextScore: nextMin,
    progressPercent,
  };
}

export interface UnitProgressSummary {
  unitId: number;
  attemptsCount: number;
  bestScore: number;
  bestPercentage: number;
  lastPercentage: number;
  lastAttemptAt: string;
}

export interface AttemptWithDelta extends AttemptRecord {
  deltaFromPrevious: number | null;
}

export interface StudentDashboardStats {
  totalScore: number;
  completedUnitsCount: number;
  totalAttemptsCount: number;
  averageBestPercentage: number;
  overallMasteryPercentage: number;
  recommendedUnitId: number;
  levelInfo: LevelInfo;
  unitSummaryMap: Record<number, UnitProgressSummary>;
  chronologicalAttempts: AttemptWithDelta[];
  mistakeBank: MistakeItem[];
}

export function computeStudentStats(
  studentId: string,
  allAttempts: AttemptRecord[],
  totalUnits = 100,
): StudentDashboardStats {
  const studentAttempts = allAttempts
    .filter((a) => a.studentId === studentId)
    .slice()
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

  const unitSummaryMap: Record<number, UnitProgressSummary> = {};

  for (const att of studentAttempts) {
    const prev = unitSummaryMap[att.unitId];
    if (!prev) {
      unitSummaryMap[att.unitId] = {
        unitId: att.unitId,
        attemptsCount: 1,
        bestScore: att.score,
        bestPercentage: att.percentage,
        lastPercentage: att.percentage,
        lastAttemptAt: att.completedAt,
      };
    } else {
      prev.attemptsCount += 1;
      prev.bestScore = Math.max(prev.bestScore, att.score);
      prev.bestPercentage = Math.max(prev.bestPercentage, att.percentage);
      prev.lastPercentage = att.percentage;
      prev.lastAttemptAt = att.completedAt;
    }
  }

  const completedSummaries = Object.values(unitSummaryMap);
  const completedUnitsCount = completedSummaries.length;
  const totalScore = completedSummaries.reduce((sum, u) => sum + u.bestScore, 0);
  const averageBestPercentage =
    completedUnitsCount > 0
      ? Math.round(
          completedSummaries.reduce((sum, u) => sum + u.bestPercentage, 0) / completedUnitsCount,
        )
      : 0;
  const overallMasteryPercentage = Math.round((completedUnitsCount / totalUnits) * 100);

  // Recommend lowest uncompleted unit 1..totalUnits; if all completed, lowest-scoring unit
  let recommendedUnitId = 1;
  let foundUncompleted = false;
  for (let u = 1; u <= totalUnits; u++) {
    if (!unitSummaryMap[u]) {
      recommendedUnitId = u;
      foundUncompleted = true;
      break;
    }
  }
  if (!foundUncompleted && completedSummaries.length > 0) {
    const lowest = completedSummaries
      .slice()
      .sort((a, b) => a.bestPercentage - b.bestPercentage || a.unitId - b.unitId)[0];
    recommendedUnitId = lowest.unitId;
  }

  // Delta compared to previous attempt on the same unit if available, otherwise previous attempt overall
  const lastUnitPct: Record<number, number> = {};
  const chronologicalAttempts: AttemptWithDelta[] = studentAttempts.map((att, idx) => {
    let delta: number | null = null;
    if (lastUnitPct[att.unitId] !== undefined) {
      delta = att.percentage - lastUnitPct[att.unitId];
    } else if (idx > 0) {
      delta = att.percentage - studentAttempts[idx - 1].percentage;
    }
    lastUnitPct[att.unitId] = att.percentage;
    return {
      ...att,
      deltaFromPrevious: delta,
    };
  });

  // Deduplicated mistake bank (latest occurrence per questionId)
  const mistakeMap = new Map<string, MistakeItem>();
  for (const att of studentAttempts) {
    for (const m of att.mistakes) {
      mistakeMap.set(m.questionId, m);
    }
  }

  return {
    totalScore,
    completedUnitsCount,
    totalAttemptsCount: studentAttempts.length,
    averageBestPercentage,
    overallMasteryPercentage,
    recommendedUnitId,
    levelInfo: calculateLevelInfo(totalScore),
    unitSummaryMap,
    chronologicalAttempts,
    mistakeBank: Array.from(mistakeMap.values()).reverse(),
  };
}

export interface ClassStat {
  className: string;
  studentCount: number;
  attemptsCount: number;
  averagePercentage: number;
}

export interface HardQuestionStat {
  questionId: string;
  unitId: number;
  question: string;
  correctAnswer: string;
  missCount: number;
}

export interface TeacherAnalytics {
  totalStudents: number;
  totalAttempts: number;
  averageScorePercentage: number;
  classStats: ClassStat[];
  topHardQuestions: HardQuestionStat[];
}

export function computeTeacherAnalytics(
  students: StudentRecord[],
  attempts: AttemptRecord[],
): TeacherAnalytics {
  const totalStudents = students.length;
  const totalAttempts = attempts.length;
  const averageScorePercentage =
    totalAttempts > 0
      ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / totalAttempts)
      : 0;

  const studentClassMap = new Map<string, string>();
  const classBuckets = new Map<
    string,
    { studentIds: Set<string>; attemptsCount: number; pctSum: number }
  >();

  for (const s of students) {
    studentClassMap.set(s.id, s.className);
    if (!classBuckets.has(s.className)) {
      classBuckets.set(s.className, { studentIds: new Set(), attemptsCount: 0, pctSum: 0 });
    }
    classBuckets.get(s.className)!.studentIds.add(s.id);
  }

  const questionMisses = new Map<string, HardQuestionStat>();

  for (const att of attempts) {
    const cls = studentClassMap.get(att.studentId);
    if (cls && classBuckets.has(cls)) {
      const b = classBuckets.get(cls)!;
      b.attemptsCount += 1;
      b.pctSum += att.percentage;
    }

    for (const m of att.mistakes) {
      const existing = questionMisses.get(m.questionId);
      if (existing) {
        existing.missCount += 1;
      } else {
        questionMisses.set(m.questionId, {
          questionId: m.questionId,
          unitId: m.unitId,
          question: m.question,
          correctAnswer: m.options[m.correctIndex] ?? '',
          missCount: 1,
        });
      }
    }
  }

  const classStats: ClassStat[] = Array.from(classBuckets.entries())
    .map(([className, b]) => ({
      className,
      studentCount: b.studentIds.size,
      attemptsCount: b.attemptsCount,
      averagePercentage: b.attemptsCount > 0 ? Math.round(b.pctSum / b.attemptsCount) : 0,
    }))
    .sort((a, b) => b.averagePercentage - a.averagePercentage || a.className.localeCompare(b.className));

  const topHardQuestions = Array.from(questionMisses.values())
    .sort((a, b) => b.missCount - a.missCount || a.unitId - b.unitId)
    .slice(0, 5);

  return {
    totalStudents,
    totalAttempts,
    averageScorePercentage,
    classStats,
    topHardQuestions,
  };
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildAttemptsCsv(
  students: StudentRecord[],
  attempts: AttemptRecord[],
): string {
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const header = [
    'O‘quvchi',
    'Sinf',
    'Unit',
    'Unit nomi',
    'To‘g‘ri',
    'Jami savol',
    'Foiz (%)',
    'Ball',
    'Sarflangan vaqt (soniya)',
    'Topshirilgan sana',
  ];

  const rows = attempts
    .slice()
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .map((att) => {
      const s = studentMap.get(att.studentId);
      return [
        s?.fullName ?? 'Noma’lum',
        s?.className ?? '-',
        att.unitId,
        att.unitTitle,
        att.correctCount,
        att.totalQuestions,
        att.percentage,
        att.score,
        att.durationSeconds,
        att.completedAt,
      ]
        .map(escapeCsvCell)
        .join(',');
    });

  return '\uFEFF' + [header.map(escapeCsvCell).join(','), ...rows].join('\n');
}
