export type OptionIndex = 0 | 1 | 2 | 3;

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: OptionIndex;
  explanationUz: string;
}

export interface UnitData {
  id: number;
  title: string;
  uzbekTopic: string;
  category: string;
  keywords: string[];
  questions: QuizQuestion[];
}

export interface StudentRecord {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  normalizedKey: string;
  className: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface MistakeItem {
  questionId: string;
  unitId: number;
  question: string;
  options: [string, string, string, string];
  selectedIndex: number;
  correctIndex: number;
  explanationUz: string;
}

export interface AttemptRecord {
  id: string;
  studentId: string;
  unitId: number;
  unitTitle: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  percentage: number;
  score: number;
  durationSeconds: number;
  completedAt: string;
  mistakes: MistakeItem[];
}

export interface AppSettings {
  timerMinutes: number;
  teacherPassword: string;
  cheaterPassword: string;
}

export interface DatabaseState {
  students: StudentRecord[];
  attempts: AttemptRecord[];
  settings: AppSettings;
}

export interface CheaterLockState {
  locked: boolean;
  unitId: number;
  unitTitle: string;
  studentId: string;
  lockedAt: string;
}

export const ALL_CLASSES: string[] = [
  '5-01', '5-02', '5-03',
  '6-01', '6-02', '6-03',
  '7-01', '7-02', '7-03',
  '8-01', '8-02', '8-03',
  '9-01', '9-02', '9-03',
  '10-01', '10-02', '10-03',
];
