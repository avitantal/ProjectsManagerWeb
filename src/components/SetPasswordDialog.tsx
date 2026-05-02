import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';
import { saveAppPassword } from '../lib/appPassword';

interface Props {
  onClose: () => void;
}

export function SetPasswordDialog({ onClose }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const passwordsMatch = password === confirmPassword;
  const canSave = password.length >= 6 && confirmPassword.length >= 6 && passwordsMatch;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    if (!passwordsMatch) {
      setError('הסיסמאות לא זהות');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveAppPassword(password);
      setPassword('');
      setConfirmPassword('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'לא הצלחתי לשמור סיסמה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-accent" />
            <h2 className="text-lg font-semibold">סיסמת אפליקציה</h2>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-text" aria-label="סגור">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4" autoComplete="on">
          <div>
            <label htmlFor="new-password" className="block text-xs text-muted mb-1">סיסמה חדשה</label>
            <div className="relative">
              <input
                id="new-password"
                name="new-password"
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                className="input pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:bg-surface hover:text-text"
                aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-new-password" className="block text-xs text-muted mb-1">אימות סיסמה</label>
            <input
              id="confirm-new-password"
              name="confirm-new-password"
              type={showPassword ? 'text' : 'password'}
              minLength={6}
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              dir="ltr"
              autoComplete="new-password"
            />
          </div>

          {error && <div className="text-xs text-red-400">{error}</div>}
          {saved && <div className="text-xs text-green-400">הסיסמה נשמרה. מכאן נכנסים איתה בלי מיילים.</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              ביטול
            </button>
            <button type="submit" disabled={saving || !canSave} className="btn-primary disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={16} /> : 'שמור'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
