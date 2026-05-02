import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, Unlock } from 'lucide-react';
import { hasAppPassword, saveAppPassword, setAppUnlocked, verifyAppPassword } from '../lib/appPassword';

interface Props {
  onUnlocked: () => void;
}

export function Auth({ onUnlocked }: Props) {
  const isSetup = !hasAppPassword();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = isSetup
    ? password.length >= 6 && confirmPassword.length >= 6 && passwordsMatch
    : password.length > 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (isSetup && password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    if (isSetup && !passwordsMatch) {
      setError('הסיסמאות לא זהות');
      return;
    }

    setLoading(true);
    try {
      if (isSetup) {
        await saveAppPassword(password);
      } else {
        const ok = await verifyAppPassword(password);
        if (!ok) {
          setError('סיסמה לא נכונה');
          return;
        }
        setAppUnlocked(true);
      }

      onUnlocked();
    } catch (err) {
      setAppUnlocked(false);
      setError(err instanceof Error ? err.message : 'לא הצלחתי להתחבר');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="text-xl font-semibold mb-1">ניהול פרויקטים</h1>
          <p className="text-sm text-muted">
            {isSetup ? 'קבע סיסמה ראשונית לאפליקציה' : 'התחבר עם הסיסמה הקבועה'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4" autoComplete="on">
          <div>
            <label htmlFor="app-password" className="block text-xs text-muted mb-1">
              {isSetup ? 'סיסמה חדשה' : 'סיסמה'}
            </label>
            <div className="relative">
              <input
                id="app-password"
                name={isSetup ? 'new-password' : 'password'}
                type={showPassword ? 'text' : 'password'}
                minLength={isSetup ? 6 : undefined}
                className="input pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                dir="ltr"
                autoComplete={isSetup ? 'new-password' : 'current-password'}
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

          {isSetup && (
            <div>
              <label htmlFor="app-password-confirm" className="block text-xs text-muted mb-1">אימות סיסמה</label>
              <input
                id="app-password-confirm"
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
          )}

          {error && <div className="text-xs text-red-400">{error}</div>}

          <button type="submit" disabled={loading || !canSubmit} className="btn-primary w-full disabled:opacity-50">
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : isSetup ? (
              <>
                <KeyRound size={16} />
                קבע סיסמה והיכנס
              </>
            ) : (
              <>
                <Unlock size={16} />
                היכנס
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
