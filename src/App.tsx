import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheaterLockView } from './components/CheaterLockView.tsx';
import { Navbar, type AppScreen } from './components/Navbar.tsx';
import { QuizPlayerView } from './components/QuizPlayerView.tsx';
import { QuizResultsView } from './components/QuizResultsView.tsx';
import { StudentEntryView } from './components/StudentEntryView.tsx';
import { StudentProfileView } from './components/StudentProfileView.tsx';
import { TeacherDashboardView } from './components/TeacherDashboardView.tsx';
import { TeacherLoginModal } from './components/TeacherLoginModal.tsx';
import { UnitsCatalogView } from './components/UnitsCatalogView.tsx';
import { getUnitById } from './data/units.ts';
import type {
  AppSettings,
  AttemptRecord,
  CheaterLockState,
  DatabaseState,
  QuizQuestion,
  StudentRecord,
  UnitData,
} from './types.ts';
import {
  clearCheaterLock,
  gradeAttempt,
  loadCheaterLock,
  prepareRandomizedQuiz,
  saveCheaterLock,
} from './utils/quizEngine.ts';
import { computeStudentStats } from './utils/scoring.ts';
import {
  bootstrapDatabase,
  createInitialDb,
  deleteStudentRecord,
  enterStudentAccount,
  saveTestAttempt,
  updateAppSettings,
  verifyTeacherPassword,
} from './utils/storage.ts';

const THEME_STORAGE_KEY = 'vocabcheck_theme';
const ACTIVE_STUDENT_STORAGE_KEY = 'vocabcheck_active_student_v1';

interface ActiveQuizSession {
  unit: UnitData;
  questions: QuizQuestion[];
}

interface LatestResultState {
  attempt: AttemptRecord;
  deltaFromPrevious: number | null;
}

export default function App() {
  const [db, setDb] = useState<DatabaseState>(() => createInitialDb());
  const [bootstrapped, setBootstrapped] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
    return 'light';
  });

  const [screen, setScreen] = useState<AppScreen>('entry');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(ACTIVE_STUDENT_STORAGE_KEY);
  });

  const [returningMessage, setReturningMessage] = useState<string | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizSession | null>(null);
  const [latestResult, setLatestResult] = useState<LatestResultState | null>(null);
  const [cheaterLock, setCheaterLock] = useState<CheaterLockState | null>(() => loadCheaterLock());

  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [teacherAuthenticated, setTeacherAuthenticated] = useState(false);

  // Bootstrap DB from Express backend or localStorage fallback
  useEffect(() => {
    let mounted = true;
    bootstrapDatabase().then(({ db: loaded }) => {
      if (!mounted) return;
      setDb(loaded);

      const savedId = window.localStorage.getItem(ACTIVE_STUDENT_STORAGE_KEY);
      if (savedId && loaded.students.some((s) => s.id === savedId)) {
        setActiveStudentId(savedId);
        setScreen('units');
      } else if (
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('autostart') === '1'
      ) {
        enterStudentAccount('Aziza Karimova', '8-01')
          .then((res) => {
            if (!mounted) return;
            setDb(res.db);
            setActiveStudentId(res.student.id);
            window.localStorage.setItem(ACTIVE_STUDENT_STORAGE_KEY, res.student.id);
            setScreen('units');
          })
          .catch(() => {});
      }
      setBootstrapped(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const activeStudent: StudentRecord | null = useMemo(
    () => db.students.find((s) => s.id === activeStudentId) ?? null,
    [db.students, activeStudentId],
  );

  const studentStats = useMemo(() => {
    if (!activeStudent) return null;
    return computeStudentStats(activeStudent.id, db.attempts, 100);
  }, [activeStudent, db.attempts]);

  const handleEnterStudent = useCallback(
    async (
      fullName: string,
      className: string,
    ): Promise<
      | { ok: true }
      | { ok: false; errorType: 'empty' | 'incomplete' | 'reversed'; message: string; suggestedName?: string }
    > => {
      try {
        const res = await enterStudentAccount(fullName, className);
        setDb(res.db);
        setActiveStudentId(res.student.id);
        window.localStorage.setItem(ACTIVE_STUDENT_STORAGE_KEY, res.student.id);
        if (res.isReturning) {
          setReturningMessage('Siz avval ham kirgan ekansiz, profilga kiramiz!');
          setScreen('profile');
        } else {
          setReturningMessage(null);
          setScreen('units');
        }
        return { ok: true };
      } catch (err) {
        const payload =
          err && typeof err === 'object' && 'validationPayload' in err
            ? (err as {
                validationPayload: {
                  errorType?: 'empty' | 'incomplete' | 'reversed';
                  message?: string;
                  suggestedName?: string;
                };
              }).validationPayload
            : null;
        return {
          ok: false,
          errorType: payload?.errorType ?? 'incomplete',
          message: payload?.message ?? 'Kirishda xatolik yuz berdi',
          suggestedName: payload?.suggestedName,
        };
      }
    },
    [],
  );

  const handleStartUnit = useCallback((unitId: number) => {
    const unit = getUnitById(unitId);
    if (!unit) return;
    const randomized = prepareRandomizedQuiz(unit.questions);
    setActiveQuiz({ unit, questions: randomized });
    setScreen('quiz');

    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // ignore if browser disallows fullscreen
    }
  }, []);

  const handleCompleteQuiz = useCallback(
    async (answers: Record<string, number>, durationSeconds: number) => {
      if (!activeStudent || !activeQuiz) return;

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      const prevSameUnit = db.attempts
        .filter((a) => a.studentId === activeStudent.id && a.unitId === activeQuiz.unit.id)
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];

      const attempt = gradeAttempt({
        attemptId: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        studentId: activeStudent.id,
        unitId: activeQuiz.unit.id,
        unitTitle: activeQuiz.unit.title,
        questions: activeQuiz.questions,
        answers,
        durationSeconds,
      });

      const deltaFromPrevious = prevSameUnit
        ? attempt.percentage - prevSameUnit.percentage
        : null;

      const nextDb = await saveTestAttempt(attempt);
      setDb(nextDb);
      setLatestResult({ attempt, deltaFromPrevious });
      setActiveQuiz(null);
      setScreen('results');
    },
    [activeQuiz, activeStudent, db.attempts],
  );

  const handleTriggerCheaterLock = useCallback(() => {
    if (!activeQuiz) return;
    const lock: CheaterLockState = {
      locked: true,
      unitId: activeQuiz.unit.id,
      unitTitle: activeQuiz.unit.title,
      studentId: activeStudent?.id ?? '',
      lockedAt: new Date().toISOString(),
    };
    saveCheaterLock(lock);
    setCheaterLock(lock);
  }, [activeQuiz, activeStudent?.id]);

  const handleUnlockCheater = useCallback(() => {
    clearCheaterLock();
    setCheaterLock(null);
    setActiveQuiz(null);
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setScreen(activeStudent ? 'units' : 'entry');
  }, [activeStudent]);

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem(ACTIVE_STUDENT_STORAGE_KEY);
    setActiveStudentId(null);
    setReturningMessage(null);
    setActiveQuiz(null);
    setLatestResult(null);
    setScreen('entry');
  }, []);

  const handleDeleteStudent = useCallback(
    async (studentId: string) => {
      const nextDb = await deleteStudentRecord(studentId);
      setDb(nextDb);
      if (activeStudentId === studentId) {
        window.localStorage.removeItem(ACTIVE_STUDENT_STORAGE_KEY);
        setActiveStudentId(null);
      }
    },
    [activeStudentId],
  );

  const handleUpdateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const nextDb = await updateAppSettings(patch);
    setDb(nextDb);
  }, []);

  // Always show Cheater Lock overlay first when locked
  if (cheaterLock?.locked) {
    return (
      <CheaterLockView
        lock={cheaterLock}
        expectedCode={db.settings.cheaterPassword}
        onUnlock={handleUnlockCheater}
      />
    );
  }

  // Distraction-free Quiz View (no Navbar)
  if (screen === 'quiz' && activeQuiz && activeStudent) {
    return (
      <QuizPlayerView
        unit={activeQuiz.unit}
        questions={activeQuiz.questions}
        timerMinutes={db.settings.timerMinutes}
        onComplete={handleCompleteQuiz}
        onTriggerCheaterLock={handleTriggerCheaterLock}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] dark:bg-[#0B1120] dark:text-[#F1F5F9]">
      <Navbar
        screen={screen}
        student={activeStudent}
        teacherAuthenticated={teacherAuthenticated}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={(target) => {
          if (target === 'teacher' && !teacherAuthenticated) {
            setTeacherModalOpen(true);
            return;
          }
          setScreen(target);
        }}
        onOpenTeacherModal={() => setTeacherModalOpen(true)}
        onLogout={handleLogout}
      />

      {!bootstrapped ? (
        <main className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
          Ma’lumotlar yuklanmoqda...
        </main>
      ) : screen === 'teacher' && teacherAuthenticated ? (
        <TeacherDashboardView
          db={db}
          onDeleteStudent={handleDeleteStudent}
          onUpdateSettings={handleUpdateSettings}
          onExitTeacher={() => {
            setTeacherAuthenticated(false);
            setScreen(activeStudent ? 'units' : 'entry');
          }}
        />
      ) : screen === 'results' && latestResult && activeStudent && studentStats ? (
        <QuizResultsView
          student={activeStudent}
          attempt={latestResult.attempt}
          totalScore={studentStats.totalScore}
          deltaFromPrevious={latestResult.deltaFromPrevious}
          onRetryUnit={handleStartUnit}
          onBackToUnits={() => setScreen('units')}
          onOpenProfile={() => setScreen('profile')}
        />
      ) : screen === 'profile' && activeStudent && studentStats ? (
        <StudentProfileView
          student={activeStudent}
          stats={studentStats}
          returningMessage={returningMessage}
          onDismissReturningMessage={() => setReturningMessage(null)}
          onBackToUnits={() => setScreen('units')}
          onStartUnit={handleStartUnit}
        />
      ) : screen === 'units' && activeStudent && studentStats ? (
        <UnitsCatalogView
          student={activeStudent}
          stats={studentStats}
          onStartUnit={handleStartUnit}
          onOpenProfile={() => setScreen('profile')}
        />
      ) : (
        <StudentEntryView onEnterStudent={handleEnterStudent} />
      )}

      <TeacherLoginModal
        open={teacherModalOpen}
        onClose={() => setTeacherModalOpen(false)}
        onVerify={verifyTeacherPassword}
        onSuccess={() => {
          setTeacherAuthenticated(true);
          setTeacherModalOpen(false);
          setScreen('teacher');
        }}
      />
    </div>
  );
}
