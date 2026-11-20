import type {
  AppSettings,
  AttemptRecord,
  DatabaseState,
  StudentRecord,
} from '../types.ts';
import {
  buildStudentNormalizedKey,
  normalizeNameToken,
  validateAndAnalyzeStudentName,
} from './nameValidation.ts';

export const LOCAL_DB_KEY = 'vocabcheck_db_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  timerMinutes: 15,
  teacherPassword: 'Jalolova@2026',
  cheaterPassword: '2026Al1209.9',
};

export function createInitialDb(): DatabaseState {
  return {
    students: [],
    attempts: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadLocalDb(): DatabaseState {
  if (typeof window === 'undefined') return createInitialDb();
  try {
    const raw = window.localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) return createInitialDb();
    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    return {
      students: Array.isArray(parsed.students) ? parsed.students : [],
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      settings: {
        timerMinutes:
          typeof parsed.settings?.timerMinutes === 'number' &&
          parsed.settings.timerMinutes >= 1 &&
          parsed.settings.timerMinutes <= 120
            ? parsed.settings.timerMinutes
            : DEFAULT_SETTINGS.timerMinutes,
        teacherPassword: parsed.settings?.teacherPassword || DEFAULT_SETTINGS.teacherPassword,
        cheaterPassword: parsed.settings?.cheaterPassword || DEFAULT_SETTINGS.cheaterPassword,
      },
    };
  } catch {
    return createInitialDb();
  }
}

export function saveLocalDb(db: DatabaseState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
  } catch {
    // Ignore storage quota issues
  }
}

async function tryApiJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }
    if (!res.ok) {
      const errData = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(errData?.error || `Server xatosi (${res.status})`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Server xatosi')) {
      throw err;
    }
    // Network error or static Netlify HTML 200 fallback -> switch to localStorage mode
    return null;
  }
}

export async function bootstrapDatabase(): Promise<{ db: DatabaseState; mode: 'server' | 'local' }> {
  const remote = await tryApiJson<DatabaseState>('/api/bootstrap');
  if (remote && Array.isArray(remote.students) && Array.isArray(remote.attempts) && remote.settings) {
    saveLocalDb(remote);
    return { db: remote, mode: 'server' };
  }
  const local = loadLocalDb();
  return { db: local, mode: 'local' };
}

export interface StudentEntryResponse {
  student: StudentRecord;
  isReturning: boolean;
  db: DatabaseState;
}

export async function enterStudentAccount(
  rawName: string,
  className: string,
): Promise<StudentEntryResponse> {
  try {
    const res = await fetch('/api/students/enter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: rawName, className }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        throw Object.assign(new Error(data.message || 'Kirishda xatolik'), {
          validationPayload: data,
        });
      }
      saveLocalDb(data.db);
      return data as StudentEntryResponse;
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'validationPayload' in err) {
      throw err;
    }
  }

  // Static / offline localStorage fallback with identical smart validation & deduplication
  const db = loadLocalDb();
  const analysis = validateAndAnalyzeStudentName(rawName, className, db.students);
  if (!analysis.ok) {
    throw Object.assign(new Error(analysis.message), {
      validationPayload: analysis,
    });
  }

  const now = new Date().toISOString();
  if (analysis.existingStudent) {
    const updatedStudents = db.students.map((s) =>
      s.id === analysis.existingStudent!.id ? { ...s, lastLoginAt: now } : s,
    );
    const updatedStudent = updatedStudents.find((s) => s.id === analysis.existingStudent!.id)!;
    const nextDb: DatabaseState = { ...db, students: updatedStudents };
    saveLocalDb(nextDb);
    return { student: updatedStudent, isReturning: true, db: nextDb };
  }

  const newStudent: StudentRecord = {
    id: `stu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    firstName: analysis.firstName,
    lastName: analysis.lastName,
    fullName: analysis.fullName,
    normalizedKey:
      analysis.normalizedKey ||
      buildStudentNormalizedKey(normalizeNameToken(analysis.fullName), className),
    className,
    createdAt: now,
    lastLoginAt: now,
  };
  const nextDb: DatabaseState = {
    ...db,
    students: [...db.students, newStudent],
  };
  saveLocalDb(nextDb);
  return { student: newStudent, isReturning: false, db: nextDb };
}

export async function saveTestAttempt(attempt: AttemptRecord): Promise<DatabaseState> {
  const remote = await tryApiJson<{ db: DatabaseState }>('/api/attempts', {
    method: 'POST',
    body: JSON.stringify(attempt),
  });
  if (remote?.db) {
    saveLocalDb(remote.db);
    return remote.db;
  }

  const db = loadLocalDb();
  const nextDb: DatabaseState = {
    ...db,
    attempts: [...db.attempts, attempt],
  };
  saveLocalDb(nextDb);
  return nextDb;
}

export async function verifyTeacherPassword(password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/teacher/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as { ok: boolean };
      return Boolean(data.ok);
    }
  } catch {
    // Fallback to local verification when static
  }
  const db = loadLocalDb();
  return password === db.settings.teacherPassword;
}

export async function deleteStudentRecord(studentId: string): Promise<DatabaseState> {
  const remote = await tryApiJson<{ db: DatabaseState }>(`/api/teacher/students/${studentId}`, {
    method: 'DELETE',
  });
  if (remote?.db) {
    saveLocalDb(remote.db);
    return remote.db;
  }

  const db = loadLocalDb();
  const nextDb: DatabaseState = {
    ...db,
    students: db.students.filter((s) => s.id !== studentId),
    attempts: db.attempts.filter((a) => a.studentId !== studentId),
  };
  saveLocalDb(nextDb);
  return nextDb;
}

export async function updateAppSettings(patch: Partial<AppSettings>): Promise<DatabaseState> {
  const remote = await tryApiJson<{ db: DatabaseState }>('/api/teacher/settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  if (remote?.db) {
    saveLocalDb(remote.db);
    return remote.db;
  }

  const db = loadLocalDb();
  const nextSettings: AppSettings = {
    timerMinutes:
      typeof patch.timerMinutes === 'number'
        ? Math.min(120, Math.max(1, Math.round(patch.timerMinutes)))
        : db.settings.timerMinutes,
    teacherPassword: patch.teacherPassword?.trim()
      ? patch.teacherPassword.trim()
      : db.settings.teacherPassword,
    cheaterPassword: patch.cheaterPassword?.trim()
      ? patch.cheaterPassword.trim()
      : db.settings.cheaterPassword,
  };
  const nextDb: DatabaseState = {
    ...db,
    settings: nextSettings,
  };
  saveLocalDb(nextDb);
  return nextDb;
}
