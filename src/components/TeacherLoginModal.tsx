import { Lock, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface TeacherLoginModalProps {
  open: boolean;
  onClose: () => void;
  onVerify: (password: string) => Promise<boolean>;
  onSuccess: () => void;
}

export function TeacherLoginModal({
  open,
  onClose,
  onVerify,
  onSuccess,
}: TeacherLoginModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError('Parolni kiriting');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const ok = await onVerify(password);
      if (ok) {
        setPassword('');
        onSuccess();
      } else {
        setError('Parol noto‘g‘ri kiritildi');
      }
    } catch {
      setError('Tekshirishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="teacher-login-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="teacher-login-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
              >
                O‘qituvchi boshqaruv paneli
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Kirish uchun o‘qituvchi parolini kiriting
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Oynani yopish"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="teacher-password-input"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Parol
            </label>
            <input
              id="teacher-password-input"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              autoComplete="current-password"
              placeholder="Parolni kiriting"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-60"
            >
              {submitting ? 'Tekshirilmoqda...' : 'Kirish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
