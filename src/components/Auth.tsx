import { useState, type FormEvent } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Auth() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎯</div>
          <h1 className="text-xl font-semibold mb-1">ניהול פרויקטים</h1>
          <p className="text-sm text-muted">התחבר כדי להמשיך</p>
        </div>

        {sent ? (
          <div className="text-center space-y-3">
            <Mail className="mx-auto text-accent" size={32} />
            <p className="text-sm">שלחנו לך קישור התחברות ל:</p>
            <p className="font-medium">{email}</p>
            <p className="text-xs text-muted">לחץ על הקישור במייל כדי להיכנס</p>
            <button onClick={() => { setSent(false); setEmail(''); }} className="btn-ghost text-xs mt-4">
              שלח לכתובת אחרת
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1">כתובת אימייל</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                dir="ltr"
              />
            </div>
            {error && <div className="text-xs text-red-400">{error}</div>}
            <button type="submit" disabled={loading || !email} className="btn-primary w-full disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'שלח קישור התחברות'}
            </button>
            <p className="text-xs text-muted text-center pt-2">
              לא תצטרך סיסמה — קישור חד-פעמי במייל
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
