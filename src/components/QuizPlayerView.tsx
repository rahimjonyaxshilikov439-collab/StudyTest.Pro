import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flag,
  LayoutGrid,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuizQuestion, UnitData } from '../types.ts';
import { formatTimer, isTimerCritical } from '../utils/quizEngine.ts';

interface QuizPlayerViewProps {
  unit: UnitData;
  questions: QuizQuestion[];
  timerMinutes: number;
  onComplete: (answers: Record<string, number>, durationSeconds: number) => void;
  onTriggerCheaterLock: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function QuizPlayerView({
  unit,
  questions,
  timerMinutes,
  onComplete,
  onTriggerCheaterLock,
}: QuizPlayerViewProps) {
  const totalSeconds = Math.max(60, timerMinutes * 60);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [mapOpen, setMapOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const remainingRef = useRef(remainingSeconds);
  remainingRef.current = remainingSeconds;
  const hadFullscreenRef = useRef(
    typeof document !== 'undefined' && Boolean(document.fullscreenElement),
  );

  const finalizeQuiz = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const elapsed = Math.max(1, totalSeconds - remainingRef.current);
    onComplete(answersRef.current, elapsed);
  }, [onComplete, totalSeconds]);

  // Countdown timer
  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          finalizeQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [finalizeQuiz]);

  // Anti-cheat: monitor fullscreen exit during active test
  useEffect(() => {
    if (document.fullscreenElement) {
      hadFullscreenRef.current = true;
    }

    function handleFullscreenChange() {
      if (submittedRef.current) return;
      if (document.fullscreenElement) {
        hadFullscreenRef.current = true;
      } else if (hadFullscreenRef.current) {
        submittedRef.current = true;
        onTriggerCheaterLock();
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [onTriggerCheaterLock]);

  const currentQuestion = questions[currentIndex];
  const answeredCount = useMemo(
    () => Object.keys(answers).length,
    [answers],
  );
  const flaggedCount = useMemo(
    () => Object.values(flagged).filter(Boolean).length,
    [flagged],
  );

  const selectOption = useCallback(
    (optionIdx: number) => {
      if (!currentQuestion || submittedRef.current) return;
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: optionIdx,
      }));
    },
    [currentQuestion],
  );

  const toggleFlag = useCallback(() => {
    if (!currentQuestion) return;
    setFlagged((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  }, [currentQuestion]);

  // Keyboard shortcuts: A-D / 1-4, Left/Right arrows, F flag
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if (mapOpen || confirmOpen) {
        if (e.key === 'Escape') {
          setMapOpen(false);
          setConfirmOpen(false);
        }
        return;
      }

      const keyLower = e.key.toLowerCase();
      if (keyLower === 'a' || e.key === '1') {
        e.preventDefault();
        selectOption(0);
      } else if (keyLower === 'b' || e.key === '2') {
        e.preventDefault();
        selectOption(1);
      } else if (keyLower === 'c' || e.key === '3') {
        e.preventDefault();
        selectOption(2);
      } else if (keyLower === 'd' || e.key === '4') {
        e.preventDefault();
        selectOption(3);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (keyLower === 'f') {
        e.preventDefault();
        toggleFlag();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmOpen, mapOpen, questions.length, selectOption, toggleFlag]);

  const criticalTime = isTimerCritical(remainingSeconds);
  const progressPct = Math.round(((currentIndex + 1) / questions.length) * 100);
  const selectedOption = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isFlagged = currentQuestion ? Boolean(flagged[currentQuestion.id]) : false;

  if (!currentQuestion) return null;

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top Quiz Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="font-mono text-xs font-semibold text-sky-700 dark:text-sky-400">
              Unit {unit.id} · {answeredCount}/{questions.length} javob berildi
              {flaggedCount > 0 ? ` · ${flaggedCount} belgilangan` : ''}
            </p>
            <h1 className="font-display text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
              {unit.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 font-mono text-sm font-bold tabular-nums ${
                criticalTime
                  ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-700/60 dark:bg-red-950/50 dark:text-red-400'
                  : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
              }`}
              aria-live="polite"
            >
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{formatTimer(remainingSeconds)}</span>
              {criticalTime && <span className="font-sans text-xs font-semibold">Kam vaqt</span>}
            </div>

            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              <span>Savollar xaritasi</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (answeredCount < questions.length) {
                  setConfirmOpen(true);
                } else {
                  finalizeQuiz();
                }
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-sky-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-sky-700"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Testni yakunlash</span>
            </button>
          </div>
        </header>

        {/* Progress Bar */}
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Test jarayoni"
        >
          <div
            className="h-full rounded-full bg-sky-600 transition-all duration-200 dark:bg-sky-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Question Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">
              Savol {currentIndex + 1} / {questions.length}
            </span>

            <button
              type="button"
              onClick={toggleFlag}
              aria-pressed={isFlagged}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                isFlagged
                  ? 'border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-500 dark:bg-amber-950/80 dark:text-amber-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isFlagged ? 'Belgilangan (F)' : 'Keyinga belgilash (F)'}</span>
            </button>
          </div>

          <h2 className="mt-5 font-display text-xl font-bold leading-snug text-slate-900 sm:text-2xl dark:text-slate-50">
            {currentQuestion.question}
          </h2>

          <div className="mt-6 space-y-3" role="radiogroup" aria-label="Javob variantlari">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              return (
                <button
                  key={`${currentQuestion.id}_${idx}`}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => selectOption(idx)}
                  className={`flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50 text-slate-900 dark:border-sky-500 dark:bg-sky-950/50 dark:text-white'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${
                      isSelected
                        ? 'bg-sky-600 text-white dark:bg-sky-500'
                        : 'border border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    {OPTION_LETTERS[idx]}
                  </span>
                  <span className="pt-0.5 text-base leading-relaxed">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Footer Navigation */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Oldingi</span>
            </button>

            <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
              Tezkor tugmalar: A–D yoki 1–4 · ← → · F belgilash
            </p>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-700"
              >
                <span>Keyingi</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (answeredCount < questions.length) {
                    setConfirmOpen(true);
                  } else {
                    finalizeQuiz();
                  }
                }}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
              >
                <span>Testni yakunlash</span>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Question Map Modal */}
      {mapOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="question-map-title"
        >
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2
                  id="question-map-title"
                  className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
                >
                  Savollar xaritasi
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Joriy · Javob berilgan ({answeredCount}) · Belgilangan ({flaggedCount}) · Javobsiz ({questions.length - answeredCount})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                aria-label="Xaritani yopish"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-5 gap-2.5 sm:grid-cols-6">
              {questions.map((qItem, idx) => {
                const isCurr = idx === currentIndex;
                const isDone = answers[qItem.id] !== undefined;
                const isMark = Boolean(flagged[qItem.id]);

                return (
                  <button
                    key={qItem.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setMapOpen(false);
                    }}
                    className={`relative flex h-11 items-center justify-center rounded-lg border font-mono text-sm font-bold tabular-nums transition-colors ${
                      isCurr
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : isMark
                          ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-200'
                          : isDone
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isMark && (
                      <Flag
                        className="absolute right-1 top-1 h-3 w-3"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Unanswered Warning Modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="finish-confirm-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="finish-confirm-title"
                  className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
                >
                  Testni yakunlaysizmi?
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Siz {questions.length - answeredCount} ta savolga hali javob belgilamadingiz. Belgilanmagan savollar xato hisoblanadi.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Testga qaytish
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  finalizeQuiz();
                }}
                className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Ha, yakunlash
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
