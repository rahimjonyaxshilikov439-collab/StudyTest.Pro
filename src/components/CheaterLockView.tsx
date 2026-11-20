import { KeyRound, ShieldAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { CheaterLockState } from '../types.ts';
import { verifyCheaterUnlockCode } from '../utils/quizEngine.ts';

interface CheaterLockViewProps {
  lock: CheaterLockState;
  expectedCode: string;
  onUnlock: () => void;
}

export function CheaterLockView({ lock, expectedCode, onUnlock }: CheaterLockViewProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (verifyCheaterUnlockCode(code, expectedCode)) {
      setError('');
      setCode('');
      onUnlock();
    } else {
      setError('Ochish kodi noto‘g‘ri. O‘qituvchidan kodni so‘rang.');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-lg rounded-2xl border border-red-500/40 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
          <ShieldAlert className="h-9 w-9" aria-hidden="true" />
        </div>

        <h1 className="mt-5 font-display text-5xl font-extrabold tracking-tight text-red-500 sm:text-6xl">
          Cheater
        </h1>

        <p className="mt-4 text-base font-medium text-slate-200">
          Test vaqtida to‘liq ekran (fullscreen) rejimidan chiqilgani uchun test darhol bloklandi.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Unit {lock.unitId} · {lock.unitTitle}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
          <div>
            <label
              htmlFor="cheater-unlock-input"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Blokdan chiqarish kodi
            </label>
            <div className="relative">
              <KeyRound
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="cheater-unlock-input"
                type="password"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError('');
                }}
                autoFocus
                placeholder="Kod kiriting"
                className="h-12 w-full rounded-lg border border-slate-700 bg-slate-950 pl-10 pr-4 font-mono text-sm text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-red-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Ochish
          </button>
        </form>
      </div>
    </main>
  );
}
