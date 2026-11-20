import { BookOpen, GraduationCap, LogOut, Moon, ShieldCheck, Sun, User } from 'lucide-react';
import type { StudentRecord } from '../types.ts';

export type AppScreen = 'entry' | 'units' | 'quiz' | 'results' | 'profile' | 'teacher';

interface NavbarProps {
  screen: AppScreen;
  student: StudentRecord | null;
  teacherAuthenticated: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onNavigate: (target: AppScreen) => void;
  onOpenTeacherModal: () => void;
  onLogout: () => void;
}

export function Navbar({
  screen,
  student,
  teacherAuthenticated,
  theme,
  onToggleTheme,
  onNavigate,
  onOpenTeacherModal,
  onLogout,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-[#0B1120]/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:gap-8">
        {/* Zone 1: Single-line Brand wordmark */}
        <button
          type="button"
          onClick={() => onNavigate(student ? 'units' : 'entry')}
          className="flex items-center gap-2.5 text-left font-display text-lg font-bold tracking-tight text-slate-900 transition-colors hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md whitespace-nowrap shrink-0 dark:text-slate-100 dark:hover:text-sky-400"
        >
          <BookOpen className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
          <span>VocabCheck</span>
        </button>

        {/* Zone 2: Single-line navigation links (Desktop & non-logged-in mobile) */}
        <nav
          aria-label="Asosiy navigatsiya"
          className={`${student ? 'hidden md:flex' : 'flex'} items-center gap-5 text-sm font-medium`}
        >
          {student && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('units')}
                className={`whitespace-nowrap shrink-0 border-b-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  screen === 'units'
                    ? 'border-sky-600 text-slate-900 dark:border-sky-400 dark:text-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                Unitlar
              </button>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 border-b-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  screen === 'profile'
                    ? 'border-sky-600 text-slate-900 dark:border-sky-400 dark:text-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <User className="h-4 w-4" aria-hidden="true" />
                <span>Shaxsiy profil</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              if (teacherAuthenticated) {
                onNavigate('teacher');
              } else {
                onOpenTeacherModal();
              }
            }}
            className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 border-b-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              screen === 'teacher'
                ? 'border-sky-600 text-slate-900 dark:border-sky-400 dark:text-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>O‘qituvchi paneli</span>
          </button>
        </nav>

        {/* Zone 3: Primary action + Theme toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Kunduzgi rejimga o‘tish' : 'Tun rejimiga o‘tish'}
            title={theme === 'dark' ? 'Kunduzgi rejim' : 'Tun rejimi'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {student ? (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Chiqish</span>
            </button>
          ) : screen !== 'entry' ? (
            <button
              type="button"
              onClick={() => onNavigate('entry')}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-sky-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 whitespace-nowrap shrink-0"
            >
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              <span>O‘quvchi kirishi</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Compact mobile nav bar for logged-in students (total sticky height <= 102px < 15% of 844px) */}
      {student && (
        <nav
          aria-label="Mobil navigatsiya"
          className="flex items-center justify-around border-t border-slate-200 px-2 py-1.5 text-xs font-semibold md:hidden dark:border-slate-800"
        >
          <button
            type="button"
            onClick={() => onNavigate('units')}
            className={`rounded-md px-2.5 py-1 whitespace-nowrap ${
              screen === 'units'
                ? 'text-sky-700 dark:text-sky-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Unitlar
          </button>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className={`rounded-md px-2.5 py-1 whitespace-nowrap ${
              screen === 'profile'
                ? 'text-sky-700 dark:text-sky-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Shaxsiy profil
          </button>
          <button
            type="button"
            onClick={() => {
              if (teacherAuthenticated) {
                onNavigate('teacher');
              } else {
                onOpenTeacherModal();
              }
            }}
            className={`rounded-md px-2.5 py-1 whitespace-nowrap ${
              screen === 'teacher'
                ? 'text-sky-700 dark:text-sky-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            O‘qituvchi paneli
          </button>
        </nav>
      )}
    </header>
  );
}
