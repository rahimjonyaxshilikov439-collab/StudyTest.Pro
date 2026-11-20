import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  Target,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import type { MistakeItem, StudentRecord } from '../types.ts';
import { formatDurationUz } from '../utils/quizEngine.ts';
import { LEVEL_DEFINITIONS, type StudentDashboardStats } from '../utils/scoring.ts';

interface StudentProfileViewProps {
  student: StudentRecord;
  stats: StudentDashboardStats;
  returningMessage: string | null;
  onDismissReturningMessage: () => void;
  onBackToUnits: () => void;
  onStartUnit: (unitId: number) => void;
}

export function StudentProfileView({
  student,
  stats,
  returningMessage,
  onDismissReturningMessage,
  onBackToUnits,
  onStartUnit,
}: StudentProfileViewProps) {
  const [revealedMistakes, setRevealedMistakes] = useState<Record<string, boolean>>({});
  const [drillActive, setDrillActive] = useState(false);
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillChoice, setDrillChoice] = useState<number | null>(null);
  const [drillCorrectCount, setDrillCorrectCount] = useState(0);

  const attempts = stats.chronologicalAttempts;
  const chartAttempts = attempts.slice(-14); // latest 14 attempts for crisp chart legibility
  const svgWidth = 680;
  const svgHeight = 220;
  const padX = 40;
  const padY = 24;
  const plotW = svgWidth - padX * 2;
  const plotH = svgHeight - padY * 2;

  const points = chartAttempts.map((att, idx) => {
    const x =
      chartAttempts.length === 1
        ? padX + plotW / 2
        : padX + (idx / (chartAttempts.length - 1)) * plotW;
    const y = padY + (1 - att.percentage / 100) * plotH;
    return { x, y, att };
  });

  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const currentDrillItem: MistakeItem | undefined = stats.mistakeBank[drillIndex];

  function toggleReveal(questionId: string) {
    setRevealedMistakes((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  }

  function startMistakeDrill() {
    setDrillIndex(0);
    setDrillChoice(null);
    setDrillCorrectCount(0);
    setDrillActive(true);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      {returningMessage && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-5 py-3.5 text-sm font-medium text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200"
        >
          <span>{returningMessage}</span>
          <button
            type="button"
            onClick={onDismissReturningMessage}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Yopish
          </button>
        </div>
      )}

      {/* Profile Header + 5-Level System */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-sky-700 dark:text-sky-400">
              Shaxsiy profil · {student.className}-sinf
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-50">
              {student.fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Umumiy ball: <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">{stats.totalScore.toLocaleString('uz-UZ')}</span> · Bajarilgan unitlar: <span className="font-mono font-bold tabular-nums">{stats.completedUnitsCount}/100</span> · O‘rtacha: <span className="font-mono font-bold tabular-nums">{stats.averageBestPercentage}%</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToUnits}
            className="inline-flex h-10 items-center gap-2 self-start rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Unitlarga o‘tish</span>
          </button>
        </div>

        {/* 5-Stage Level Progress */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Award className="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Daraja {stats.levelInfo.level}: {stats.levelInfo.titleUz}
              </span>
            </div>
            <span className="font-mono text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">
              {stats.levelInfo.nextScore !== null
                ? `${stats.totalScore} / ${stats.levelInfo.nextScore} ball (${stats.levelInfo.progressPercent}%)`
                : 'Eng yuqori daraja zabt etildi!'}
            </span>
          </div>

          <div
            className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            role="progressbar"
            aria-valuenow={stats.levelInfo.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Daraja progressi"
          >
            <div
              className="h-full rounded-full bg-sky-600 transition-all duration-300 dark:bg-sky-500"
              style={{ width: `${stats.levelInfo.progressPercent}%` }}
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            {LEVEL_DEFINITIONS.map((lvl) => {
              const reached = stats.levelInfo.level >= lvl.level;
              return (
                <div
                  key={lvl.level}
                  className={`rounded-lg border p-2.5 text-xs ${
                    reached
                      ? 'border-sky-200 bg-white text-slate-900 dark:border-sky-800 dark:bg-slate-900 dark:text-slate-100'
                      : 'border-slate-200/70 bg-transparent text-slate-500 dark:border-slate-800 dark:text-slate-500'
                  }`}
                >
                  <div className="font-mono font-bold tabular-nums">
                    Daraja {lvl.level} · {lvl.minScore}+
                  </div>
                  <div className="mt-0.5 truncate font-medium">{lvl.titleUz}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SVG Progress Chart + History */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Natijalar o‘sish va tushish grafigi
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Oxirgi {chartAttempts.length} ta topshirilgan test bo‘yicha foiz ko‘rsatkichi
          </p>

          {chartAttempts.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Grafik shakllanishi uchun kamida bitta test topshiring.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="h-56 w-full min-w-[460px]"
                role="img"
                aria-label="Test natijalari dinamikasi grafigi"
              >
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = padY + (1 - val / 100) * plotH;
                  return (
                    <g key={val}>
                      <line
                        x1={padX}
                        y1={y}
                        x2={svgWidth - padX}
                        y2={y}
                        className="stroke-slate-200 dark:stroke-slate-800"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={padX - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-400 font-mono text-[11px]"
                      >
                        {val}%
                      </text>
                    </g>
                  );
                })}

                {points.length > 1 && (
                  <path
                    d={linePath}
                    fill="none"
                    className="stroke-sky-600 dark:stroke-sky-400"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {points.map((pt, idx) => (
                  <g key={pt.att.id}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={5}
                      className="fill-sky-600 stroke-white dark:fill-sky-400 dark:stroke-slate-900"
                      strokeWidth="2"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      textAnchor="middle"
                      className="fill-slate-700 font-mono text-[11px] font-semibold dark:fill-slate-300"
                    >
                      {pt.att.percentage}%
                    </text>
                    <text
                      x={pt.x}
                      y={svgHeight - 4}
                      textAnchor="middle"
                      className="fill-slate-400 font-mono text-[10px]"
                    >
                      U{pt.att.unitId}
                      {chartAttempts.length <= 7 ? ` (#${idx + 1})` : ''}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </section>

        {/* Attempt History */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Ishlangan testlar tarixi ({attempts.length})
          </h2>

          {attempts.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Hali birorta test topshirilmagan.
            </div>
          ) : (
            <div className="mt-4 max-h-72 space-y-2.5 overflow-y-auto pr-1">
              {attempts
                .slice()
                .reverse()
                .map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                        Unit {att.unitId}: {att.unitTitle}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {formatDurationUz(att.durationSeconds)} · +{att.score} ball
                        {att.deltaFromPrevious !== null && (
                          <>
                            {' · '}
                            <span
                              className={
                                att.deltaFromPrevious > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : att.deltaFromPrevious < 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : ''
                              }
                            >
                              {att.deltaFromPrevious > 0
                                ? `+${att.deltaFromPrevious}%`
                                : `${att.deltaFromPrevious}%`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                        {att.percentage}%
                      </span>
                      <button
                        type="button"
                        onClick={() => onStartUnit(att.unitId)}
                        title={`Unit ${att.unitId} ni qayta ishlash`}
                        aria-label={`Unit ${att.unitId} ni qayta ishlash`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>

      {/* Mistake Bank + Interactive Mistake Drill */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              Xatolar banki ({stats.mistakeBank.length} ta savol)
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Avvalgi testlarda xato qilingan savollarni qayta ko‘rib chiqing yoki interaktiv mashq qiling.
            </p>
          </div>

          {stats.mistakeBank.length > 0 && (
            <button
              type="button"
              onClick={drillActive ? () => setDrillActive(false) : startMistakeDrill}
              className="inline-flex h-10 items-center gap-2 self-start rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
            >
              {drillActive ? (
                <>
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  <span>Xatolar ro‘yxatiga qaytish</span>
                </>
              ) : (
                <>
                  <Target className="h-4 w-4" aria-hidden="true" />
                  <span>Xatolar ustida mashq</span>
                </>
              )}
            </button>
          )}
        </div>

        {stats.mistakeBank.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Hozircha xatolar banki bo‘sh. Testlarda xato javob bersangiz, ular shu yerda yig‘iladi.
          </div>
        ) : drillActive && currentDrillItem ? (
          /* Interactive Mistake Drill */
          <div className="mt-6 rounded-xl border border-sky-200 bg-slate-50/70 p-6 dark:border-sky-900/60 dark:bg-slate-950/60">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="font-mono tabular-nums">
                Mashq {drillIndex + 1} / {stats.mistakeBank.length} · Unit {currentDrillItem.unitId}
              </span>
              <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                To‘g‘ri topildi: {drillCorrectCount}
              </span>
            </div>

            <h3 className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              {currentDrillItem.question}
            </h3>

            <div className="mt-4 space-y-2.5">
              {currentDrillItem.options.map((opt, idx) => {
                const answered = drillChoice !== null;
                const isRight = idx === currentDrillItem.correctIndex;
                const isPicked = idx === drillChoice;

                let btnClass =
                  'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
                if (answered) {
                  if (isRight) {
                    btnClass =
                      'border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200';
                  } else if (isPicked) {
                    btnClass =
                      'border-red-500 bg-red-50 text-red-950 dark:border-red-600 dark:bg-red-950/50 dark:text-red-200';
                  }
                }

                return (
                  <button
                    key={`${currentDrillItem.questionId}_drill_${idx}`}
                    type="button"
                    disabled={answered}
                    onClick={() => {
                      setDrillChoice(idx);
                      if (idx === currentDrillItem.correctIndex) {
                        setDrillCorrectCount((c) => c + 1);
                      }
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${btnClass}`}
                  >
                    <span>{opt}</span>
                    {answered && isRight && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    )}
                    {answered && isPicked && !isRight && (
                      <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>

            {drillChoice !== null && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">Izoh: </span>
                  {currentDrillItem.explanationUz}
                </p>
                <div className="mt-4 flex justify-end">
                  {drillIndex < stats.mistakeBank.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDrillIndex((i) => i + 1);
                        setDrillChoice(null);
                      }}
                      className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-700"
                    >
                      <span>Keyingi savol</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startMistakeDrill}
                      className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Play className="h-4 w-4" aria-hidden="true" />
                      <span>Mashqni boshidan boshlash</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Mistake Bank list with Show/Hide answer toggle */
          <div className="mt-5 space-y-3">
            {stats.mistakeBank.map((m) => {
              const revealed = Boolean(revealedMistakes[m.questionId]);
              return (
                <article
                  key={m.questionId}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Unit {m.unitId}
                      </span>
                      <h3 className="mt-1 font-display text-base font-bold text-slate-900 dark:text-slate-100">
                        {m.question}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleReveal(m.questionId)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {revealed ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Javobni yashirish</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Javobni ko‘rish</span>
                        </>
                      )}
                    </button>
                  </div>

                  {revealed && (
                    <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                        To‘g‘ri javob: {m.options[m.correctIndex]}
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">{m.explanationUz}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
