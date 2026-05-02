import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AUTH_EMAIL = 'avitantal@gmail.com';

export function Auth() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: AUTH_EMAIL,
      password,
    });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="text-xl font-semibold mb-1">ניהול פרויקטים</h1>
          <p className="text-sm text-muted">הזן סיסמה כדי להיכנס</p>
        </div>

        <form onSubmit={signIn} className="space-y-4" autoComplete="on">
          <input type="email" name="email" value={AUTH_EMAIL} readOnly hidden autoComplete="username" />
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
                autoFocus
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
          <button type="submit" disabled={loading || !password} className="btn-primary w-full disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'התחבר'}
          </button>
        </form>
      </div>
    </div>
  );
}
