import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  RotateCcw,
  Send,
  Share2,
  TrendingDown,
  TrendingUp,
  User,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import type { AttemptRecord, StudentRecord } from '../types.ts';
import { formatDurationUz } from '../utils/quizEngine.ts';
import {
  buildResultSummaryText,
  buildTelegramShareHref,
  renderResultCardPng,
} from '../utils/shareResult.ts';

interface QuizResultsViewProps {
  student: StudentRecord;
  attempt: AttemptRecord;
  totalScore: number;
  deltaFromPrevious: number | null;
  onRetryUnit: (unitId: number) => void;
  onBackToUnits: () => void;
  onOpenProfile: () => void;
}

export function QuizResultsView({
  student,
  attempt,
  totalScore,
  deltaFromPrevious,
  onRetryUnit,
  onBackToUnits,
  onOpenProfile,
}: QuizResultsViewProps) {
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

  const summaryText = buildResultSummaryText({
    student,
    attempt,
    totalScore,
    deltaFromPrevious,
  });
  const telegramHref = buildTelegramShareHref(summaryText);

  function handleDownloadPng() {
    const dataUrl = renderResultCardPng({
      student,
      attempt,
      totalScore,
      deltaFromPrevious,
    });
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `vocabcheck-unit-${attempt.unitId}-${attempt.percentage}pct.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareFeedback('Matnni nusxalash imkoni bo‘lmadi');
    }
  }

  async function handleShare() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `VocabCheck — Unit ${attempt.unitId} natijasi`,
          text: summaryText,
        });
        return;
      } catch {
        // User cancelled or share unsupported -> fallback to copy
      }
    }
    await handleCopyText();
    setShareFeedback('Natija matni nusxalandi');
    window.setTimeout(() => setShareFeedback(''), 2500);
  }

  const passed = attempt.percentage >= 70;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      {/* Main Summary Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold text-sky-700 dark:text-sky-400">
              Unit {attempt.unitId} · {student.fullName} ({student.className})
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-50">
              {attempt.unitTitle} — Test natijasi
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  passed
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{passed ? 'Muvaffaqiyatli natija' : 'Qayta mashq tavsiya etiladi'}</span>
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                {deltaFromPrevious === null ? (
                  <span>Birinchi urinish</span>
                ) : deltaFromPrevious > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Oldingisidan +{deltaFromPrevious}% o‘sish
                    </span>
                  </>
                ) : deltaFromPrevious < 0 ? (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                    <span className="text-red-700 dark:text-red-400">
                      Oldingisidan {deltaFromPrevious}% tushish
                    </span>
                  </>
                ) : (
                  <span>Oldingi urinish bilan teng</span>
                )}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-4 text-center dark:border-slate-800 dark:bg-slate-950">
            <div className="font-mono text-4xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {attempt.percentage}%
            </div>
            <div className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              {attempt.correctCount} / {attempt.totalQuestions} to‘g‘ri
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-6 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-800">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">To‘g‘ri javoblar</div>
            <div className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {attempt.correctCount} ta
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">Xato javoblar</div>
            <div className="mt-1 font-mono text-xl font-bold tabular-nums text-red-700 dark:text-red-400">
              {attempt.wrongCount} ta
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">Ushbu test bali</div>
            <div className="mt-1 font-mono text-xl font-bold tabular-nums text-sky-700 dark:text-sky-400">
              +{attempt.score} ball
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">Umumiy ball</div>
            <div className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {totalScore.toLocaleString('uz-UZ')}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs text-slate-500 dark:text-slate-400">Sarflangan vaqt</div>
            <div className="mt-1 font-mono text-base font-bold tabular-nums text-slate-900 dark:text-white">
              {formatDurationUz(attempt.durationSeconds)}
            </div>
          </div>
        </div>

        {/* Share & Navigation Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>PNG skrinshot saqlash</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span>Ulashish</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{copied ? 'Nusxalandi' : 'Matnni nusxalash'}</span>
            </button>

            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3.5 text-xs font-semibold text-sky-800 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/60"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>Telegramdan yuborish</span>
            </a>

            {shareFeedback && (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {shareFeedback}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToUnits}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Unitlar menyusi</span>
            </button>
            <button
              type="button"
              onClick={onOpenProfile}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span>Shaxsiy profil</span>
            </button>
            <button
              type="button"
              onClick={() => onRetryUnit(attempt.unitId)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Qayta topshirish</span>
            </button>
          </div>
        </div>
      </section>

      {/* Wrong Questions Analysis */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
          Xato savollar tahlili ({attempt.mistakes.length} ta)
        </h2>

        {attempt.mistakes.length === 0 ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-center dark:border-emerald-800/60 dark:bg-emerald-950/30">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <p className="mt-2 font-display text-base font-bold text-emerald-900 dark:text-emerald-200">
              Barakalla! Barcha savollarga to‘g‘ri javob berdingiz.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {attempt.mistakes.map((m, idx) => (
              <article
                key={`${m.questionId}_${idx}`}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Xato #{idx + 1}
                </div>
                <h3 className="mt-1.5 font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  {m.question}
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-red-200 bg-red-50/70 p-3 text-sm dark:border-red-900/60 dark:bg-red-950/30">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400">
                      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Sizning javobingiz</span>
                    </div>
                    <p className="mt-1 font-medium text-red-950 dark:text-red-200">
                      {m.selectedIndex >= 0 && m.options[m.selectedIndex]
                        ? m.options[m.selectedIndex]
                        : 'Javob belgilanmagan'}
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>To‘g‘ri javob</span>
                    </div>
                    <p className="mt-1 font-medium text-emerald-950 dark:text-emerald-200">
                      {m.options[m.correctIndex]}
                    </p>
                  </div>
                </div>

                <p className="mt-3.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">Izoh: </span>
                  {m.explanationUz}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
