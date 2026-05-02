import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

type AuthMode = 'password' | 'code';
type CodeStage = 'email' | 'code';

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [codeStage, setCodeStage] = useState<CodeStage>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setCode('');
    setCodeStage('email');
  }

  async function signInWithPassword(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) setError(error.message);
  }

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (error) setError(error.message);
    else setCodeStage('code');
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'email',
    });
    setLoading(false);
    if (error) setError(error.message);
  }

  function resetCode() {
    setCodeStage('email');
    setCode('');
    setError(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="text-xl font-semibold mb-1">ניהול פרויקטים</h1>
          <p className="text-sm text-muted">
            {mode === 'password'
              ? 'התחברות עם סיסמה'
              : codeStage === 'email' ? 'שליחת קוד חד-פעמי' : 'הזן את הקוד שקיבלת במייל'}
          </p>
        </div>

        <div className="grid grid-cols-2 rounded-lg border border-border bg-bg p-1 mb-5">
          <button
            type="button"
            onClick={() => switchMode('password')}
            className={cn('btn rounded-md px-2 py-1.5 text-xs', mode === 'password' ? 'bg-accent text-white' : 'text-muted hover:text-text')}
          >
            <KeyRound size={14} />
            סיסמה
          </button>
          <button
            type="button"
            onClick={() => switchMode('code')}
            className={cn('btn rounded-md px-2 py-1.5 text-xs', mode === 'code' ? 'bg-accent text-white' : 'text-muted hover:text-text')}
          >
            <Mail size={14} />
            קוד
          </button>
        </div>

        {mode === 'password' ? (
          <form onSubmit={signInWithPassword} className="space-y-4" autoComplete="on">
            <div>
              <label htmlFor="auth-email" className="block text-xs text-muted mb-1">כתובת אימייל</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                dir="ltr"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-xs text-muted mb-1">סיסמה</label>
              <div className="relative">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  autoComplete="current-password"
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
            {error && <div className="text-xs text-red-400">{error}</div>}
            <button type="submit" disabled={loading || !email.trim() || !password} className="btn-primary w-full disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'התחבר'}
            </button>
          </form>
        ) : codeStage === 'email' ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div>
              <label htmlFor="otp-email" className="block text-xs text-muted mb-1">כתובת אימייל</label>
              <input
                id="otp-email"
                name="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                dir="ltr"
                autoComplete="email"
              />
            </div>
            {error && <div className="text-xs text-red-400">{error}</div>}
            <button type="submit" disabled={loading || !email.trim()} className="btn-primary w-full disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={16} /> : <>שלח קוד <ArrowRight size={14} /></>}
            </button>
            <p className="text-xs text-muted text-center pt-2">
              נשלח אליך קוד 6 ספרות במייל
            </p>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted bg-bg/50 rounded-lg p-3">
              <Mail size={16} className="text-accent shrink-0" />
              <span className="truncate" dir="ltr">{email}</span>
            </div>
            <div>
              <label htmlFor="otp-code" className="block text-xs text-muted mb-1">קוד מהמייל</label>
              <input
                id="otp-code"
                name="one-time-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="input text-center text-2xl tracking-[0.5em] font-mono"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                autoFocus
                dir="ltr"
                autoComplete="one-time-code"
              />
            </div>
            {error && <div className="text-xs text-red-400">{error}</div>}
            <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'התחבר'}
            </button>
            <button type="button" onClick={resetCode} className="btn-ghost w-full text-xs">
              שלח קוד מחדש / שנה כתובת
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
