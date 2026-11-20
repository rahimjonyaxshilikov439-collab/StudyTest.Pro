import { ArrowRight, CheckCircle2, Play, Search, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  ALL_UNITS,
  UNIT_RANGES,
  filterAndSortUnits,
  getUnitById,
  type UnitSortMode,
  type UnitStatusFilter,
} from '../data/units.ts';
import type { StudentRecord } from '../types.ts';
import type { StudentDashboardStats } from '../utils/scoring.ts';

interface UnitsCatalogViewProps {
  student: StudentRecord;
  stats: StudentDashboardStats;
  onStartUnit: (unitId: number) => void;
  onOpenProfile: () => void;
}

export function UnitsCatalogView({
  student,
  stats,
  onStartUnit,
  onOpenProfile,
}: UnitsCatalogViewProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>('all');
  const [sortMode, setSortMode] = useState<UnitSortMode>('unit_asc');
  const [rangeId, setRangeId] = useState<string>('all');

  const recommendedUnit = useMemo(
    () => getUnitById(stats.recommendedUnitId) ?? ALL_UNITS[0],
    [stats.recommendedUnitId],
  );

  const visibleUnits = useMemo(
    () =>
      filterAndSortUnits({
        units: ALL_UNITS,
        query,
        statusFilter,
        sortMode,
        rangeId,
        unitSummaryMap: stats.unitSummaryMap,
      }),
    [query, statusFilter, sortMode, rangeId, stats.unitSummaryMap],
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header & Recommended Unit CTA */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {student.fullName} · {student.className}-sinf · Daraja {stats.levelInfo.level} ({stats.levelInfo.titleUz})
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
              Unitlar ro‘yxati
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Kerakli unitni tanlang va testni boshlang. Har bir to‘g‘ri javob 10 ball beradi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenProfile}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span>Shaxsiy profil</span>
            </button>
            <button
              type="button"
              onClick={() => onStartUnit(recommendedUnit.id)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>Tavsiya etilgan: Unit {recommendedUnit.id}</span>
            </button>
          </div>
        </div>

        {/* KPI row + overall progress bar */}
        <div className="mt-6 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Umumiy ball
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {stats.totalScore.toLocaleString('uz-UZ')}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Bajarilgan unitlar
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {stats.completedUnitsCount} / {ALL_UNITS.length}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              O‘rtacha foiz
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {stats.averageBestPercentage}%
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Umumiy o‘zlashtirish</span>
              <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {stats.overallMasteryPercentage}%
              </span>
            </div>
            <div
              className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
              role="progressbar"
              aria-valuenow={stats.overallMasteryPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Umumiy o‘zlashtirish darajasi"
            >
              <div
                className="h-full rounded-full bg-sky-600 transition-all duration-300 dark:bg-sky-500"
                style={{ width: `${stats.overallMasteryPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Search, Filters, Sort & 20-unit Range Tabs */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Unit qidirish"
              placeholder="Unit raqami, nomi yoki so‘z bo‘yicha qidirish..."
              className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div
            className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 lg:col-span-4 dark:bg-slate-950"
            role="group"
            aria-label="Holat filtri"
          >
            {(
              [
                { id: 'all', label: 'Barchasi' },
                { id: 'uncompleted', label: 'Ishlanmagan' },
                { id: 'completed', label: 'Bajarilgan' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id)}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === item.id
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3">
            <label htmlFor="unit-sort-select" className="sr-only">
              Saralash
            </label>
            <select
              id="unit-sort-select"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as UnitSortMode)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="unit_asc">Saralash: Unit raqami</option>
              <option value="uncompleted_first">Avval ishlanmaganlar</option>
              <option value="lowest_score">Eng past natijadan</option>
            </select>
          </div>
        </div>

        {/* 20-unit range tabs */}
        <div
          className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-4 dark:border-slate-800"
          role="tablist"
          aria-label="Unitlar diapazoni"
        >
          {UNIT_RANGES.map((range) => (
            <button
              key={range.id}
              type="button"
              role="tab"
              aria-selected={rangeId === range.id}
              onClick={() => setRangeId(range.id)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold tabular-nums whitespace-nowrap transition-colors ${
                rangeId === range.id
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {range.label}
            </button>
          ))}
          <span className="ml-auto text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
            Ko‘rsatilmoqda: {visibleUnits.length} ta unit
          </span>
        </div>
      </section>

      {/* Units Grid */}
      {visibleUnits.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            Mos keladigan unit topilmadi
          </p>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Qidiruv so‘zini yoki filtrlarni o‘zgartirib ko‘ring.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setStatusFilter('all');
              setRangeId('all');
            }}
            className="mt-4 inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Filtrlarni tozalash
          </button>
        </div>
      ) : (
        <section
          aria-label="Unitlar katalogi"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visibleUnits.map((unit) => {
            const summary = stats.unitSummaryMap[unit.id];
            const isRecommended = unit.id === recommendedUnit.id;

            return (
              <article
                key={unit.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold tabular-nums text-sky-700 dark:text-sky-400">
                      Unit {unit.id}
                    </span>
                    <span className="truncate">
                      {unit.category} · {unit.questions.length} savol
                    </span>
                  </div>

                  <h2 className="mt-2 font-display text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">
                    {unit.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {unit.uzbekTopic}
                  </p>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  {summary ? (
                    <div className="mb-3 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Bajarilgan ({summary.attemptsCount} marta)</span>
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                        Eng yuqori: {summary.bestPercentage}% ({summary.bestScore} ball)
                      </span>
                    </div>
                  ) : (
                    <div className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {isRecommended ? 'Navbatdagi tavsiya etilgan unit' : 'Hali ishlanmagan'}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onStartUnit(unit.id)}
                    className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                      summary
                        ? 'border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800'
                        : 'bg-sky-600 text-white hover:bg-sky-700'
                    }`}
                  >
                    <span>{summary ? 'Qayta ishlash' : 'Testni boshlash'}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
