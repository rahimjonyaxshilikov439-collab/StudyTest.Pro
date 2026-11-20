import {
  Download,
  LogOut,
  Search,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { ALL_CLASSES, type AppSettings, type DatabaseState, type StudentRecord } from '../types.ts';
import { matchesSmartStudentQuery } from '../utils/nameValidation.ts';
import {
  buildAttemptsCsv,
  computeStudentStats,
  computeTeacherAnalytics,
} from '../utils/scoring.ts';

interface TeacherDashboardViewProps {
  db: DatabaseState;
  onDeleteStudent: (studentId: string) => Promise<void>;
  onUpdateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  onExitTeacher: () => void;
}

export function TeacherDashboardView({
  db,
  onDeleteStudent,
  onUpdateSettings,
  onExitTeacher,
}: TeacherDashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState<StudentRecord | null>(null);

  const [timerMinutes, setTimerMinutes] = useState(String(db.settings.timerMinutes));
  const [newTeacherPass, setNewTeacherPass] = useState(db.settings.teacherPassword);
  const [newCheaterCode, setNewCheaterCode] = useState(db.settings.cheaterPassword);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');

  const analytics = useMemo(
    () => computeTeacherAnalytics(db.students, db.attempts),
    [db.students, db.attempts],
  );

  const filteredStudents = useMemo(() => {
    return db.students
      .filter((s) => {
        if (classFilter !== 'all' && s.className !== classFilter) return false;
        return matchesSmartStudentQuery(s, searchQuery);
      })
      .map((s) => ({
        student: s,
        stats: computeStudentStats(s.id, db.attempts, 100),
      }))
      .sort((a, b) => b.stats.totalScore - a.stats.totalScore || a.student.fullName.localeCompare(b.student.fullName));
  }, [classFilter, db.attempts, db.students, searchQuery]);

  function handleExportCsv() {
    const csv = buildAttemptsCsv(db.students, db.attempts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabcheck-natijalar-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    const mins = Number(timerMinutes);
    await onUpdateSettings({
      timerMinutes: Number.isFinite(mins) ? Math.min(120, Math.max(1, Math.round(mins))) : 15,
      teacherPassword: newTeacherPass.trim() || db.settings.teacherPassword,
      cheaterPassword: newCheaterCode.trim() || db.settings.cheaterPassword,
    });
    setSettingsSavedMsg('Sozlamalar saqlandi');
    window.setTimeout(() => setSettingsSavedMsg(''), 2500);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-xs font-semibold text-sky-700 dark:text-sky-400">
            Boshqaruv va tahlil
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-50">
            O‘qituvchi boshqaruv paneli
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>CSV yuklab olish</span>
          </button>
          <button
            type="button"
            onClick={onExitTeacher}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Paneldan chiqish</span>
          </button>
        </div>
      </section>

      {/* KPI Strip */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            O‘quvchilar soni
          </div>
          <div className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
            {analytics.totalStudents}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Topshirilgan testlar
          </div>
          <div className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
            {analytics.totalAttempts}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            O‘rtacha natija
          </div>
          <div className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
            {analytics.averageScorePercentage}%
          </div>
        </div>
      </section>

      {/* Class Analytics & Hardest Questions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Sinflar bo‘yicha ko‘rsatkichlar
          </h2>
          {analytics.classStats.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Hali sinflar bo‘yicha ma’lumot mavjud emas.
            </p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {analytics.classStats.map((cls) => (
                <div
                  key={cls.className}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {cls.className}-sinf
                    </span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      {cls.studentCount} o‘quvchi · {cls.attemptsCount} ta test
                    </span>
                  </div>
                  <span className="font-mono font-bold tabular-nums text-sky-700 dark:text-sky-400">
                    {cls.averagePercentage}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Eng ko‘p xato qilingan savollar
          </h2>
          {analytics.topHardQuestions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Hali xato qilingan savollar qayd etilmagan.
            </p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {analytics.topHardQuestions.map((hq) => (
                <article
                  key={hq.questionId}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-sm dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-slate-500 dark:text-slate-400">
                      Unit {hq.unitId}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-red-700 dark:text-red-400">
                      {hq.missCount} marta xato
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {hq.question}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                    To‘g‘ri javob: {hq.correctAnswer}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Students Table with Smart Search */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              O‘quvchilar reytingi va boshqaruvi
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="O‘quvchini qidirish"
                placeholder="Ism, familiya yoki sinf..."
                className="h-10 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <select
              aria-label="Sinf bo‘yicha filtr"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">Barcha sinflar</option>
              {ALL_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}-sinf
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            O‘quvchilar topilmadi.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-3 pr-4">O‘quvchi</th>
                  <th className="py-3 px-4">Sinf</th>
                  <th className="py-3 px-4">Bajarilgan unitlar</th>
                  <th className="py-3 px-4">O‘rtacha foiz</th>
                  <th className="py-3 px-4">Umumiy ball</th>
                  <th className="py-3 pl-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredStudents.map(({ student: s, stats: st }) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-100">
                      {s.fullName}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
                      {s.className}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {st.completedUnitsCount} / 100
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {st.averageBestPercentage}%
                    </td>
                    <td className="py-3 px-4 font-mono font-bold tabular-nums text-sky-700 dark:text-sky-400">
                      {st.totalScore}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteStudent(s)}
                        aria-label={`${s.fullName} o‘quvchisini o‘chirish`}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>O‘chirish</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Settings */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Tizim sozlamalari
          </h2>
        </div>

        <form onSubmit={handleSaveSettings} className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="setting-timer"
              className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Test taymeri (daqiqa)
            </label>
            <input
              id="setting-timer"
              type="number"
              min={1}
              max={120}
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="setting-teacher-pass"
              className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              O‘qituvchi paroli
            </label>
            <input
              id="setting-teacher-pass"
              type="text"
              value={newTeacherPass}
              onChange={(e) => setNewTeacherPass(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="setting-cheater-pass"
              className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Cheater blokdan chiqarish kodi
            </label>
            <input
              id="setting-cheater-pass"
              type="text"
              value={newCheaterCode}
              onChange={(e) => setNewCheaterCode(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-3 sm:col-span-3">
            <button
              type="submit"
              className="h-10 rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
            >
              Sozlamalarni saqlash
            </button>
            {settingsSavedMsg && (
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {settingsSavedMsg}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Delete Confirmation Modal */}
      {confirmDeleteStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-student-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2
              id="delete-student-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              O‘quvchini o‘chirish
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {confirmDeleteStudent.fullName} ({confirmDeleteStudent.className})
              </span>{' '}
              va uning barcha test natijalari o‘chiriladi. Davom etasizmi?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteStudent(null)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = confirmDeleteStudent;
                  setConfirmDeleteStudent(null);
                  await onDeleteStudent(target.id);
                }}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
              >
                Ha, o‘chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
