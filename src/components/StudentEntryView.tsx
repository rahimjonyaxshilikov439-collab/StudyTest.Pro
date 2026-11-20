import { ArrowRight, BookOpen, CheckCircle2, Sparkles, TriangleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ALL_CLASSES } from '../types.ts';

interface StudentEntryViewProps {
  onEnterStudent: (
    fullName: string,
    className: string,
  ) => Promise<
    | { ok: true }
    | { ok: false; errorType: 'empty' | 'incomplete' | 'reversed'; message: string; suggestedName?: string }
  >;
}

export function StudentEntryView({ onEnterStudent }: StudentEntryViewProps) {
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('8-01');
  const [errorMsg, setErrorMsg] = useState('');
  const [suggestedName, setSuggestedName] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuggestedName(undefined);

    try {
      const result = await onEnterStudent(fullName, className);
      if (!result.ok) {
        setErrorMsg(result.message);
        setSuggestedName(result.suggestedName);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleApplySuggestion() {
    if (!suggestedName) return;
    setFullName(suggestedName);
    setErrorMsg('');
    setSuggestedName(undefined);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
      <div className="grid items-stretch gap-8 lg:grid-cols-12">
        {/* Left column on desktop, second on mobile: Editorial textbook overview */}
        <section className="order-2 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-8 lg:order-1 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <div>
            <p className="text-xs font-semibold tracking-wide text-sky-700 dark:text-sky-400">
              English Vocabulary in Use · Pre-intermediate &amp; Intermediate
            </p>
            <h1 className="mt-3 max-w-xl text-balance font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
              100 ta unit bo‘yicha tizimli lug‘at va test platformasi
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Har bir unit o‘z mavzusi va mashqlari asosida tuzilgan 30 ta takrorlanmas savoldan iborat.
              Unitni tanlang va to‘g‘ridan-to‘g‘ri sinovga kiring.
            </p>

            <div className="mt-8 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-3 dark:border-slate-800">
              <div>
                <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  100
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Asosiy kitob unitlari
                </div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  3 000
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Takrorlanmas test savollari
                </div>
              </div>
              <div>
                <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  15:00
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Har bir unit uchun taymer
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 border-t border-slate-200 pt-6 text-sm text-slate-700 sm:grid-cols-2 dark:border-slate-800 dark:text-slate-300">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Har bir xato javob uchun o‘zbekcha tushuntirish</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Shaxsiy profil, 5 bosqichli daraja va xatolar mashqi</span>
            </div>
          </div>
        </section>

        {/* Right column on desktop, first on mobile: Student Entry Form */}
        <section className="order-1 flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-8 lg:order-2 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                O‘quvchi kirishi
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sinf va ism-familiyangizni kiriting
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="student-class-select"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Sinf va guruh
              </label>
              <select
                id="student-class-select"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {ALL_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}-sinf
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="student-fullname-input"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Ism va familiya
              </label>
              <input
                id="student-fullname-input"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errorMsg) {
                    setErrorMsg('');
                    setSuggestedName(undefined);
                  }
                }}
                placeholder="Masalan: Aziza Karimova"
                autoComplete="name"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Avval ismingizni, keyin familiyangizni yozing.
              </p>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <div className="flex items-start gap-2.5">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <div className="space-y-2.5">
                    <p className="font-medium">{errorMsg}</p>
                    {suggestedName && (
                      <button
                        type="button"
                        onClick={handleApplySuggestion}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/70 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-600 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-900/40"
                      >
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>«{suggestedName}» deb to‘g‘rilash</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60"
            >
              <span>{submitting ? 'Tekshirilmoqda...' : 'Davom etish'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
