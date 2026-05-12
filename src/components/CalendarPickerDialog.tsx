import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import {
  createCalendar,
  isGoogleCalendarAuthError,
  isGoogleCalendarConfigurationError,
  listCalendars,
  type CalendarEntry,
} from '../lib/googleCalendar';
import { signInWithGoogleCalendar } from '../lib/googleAuth';

interface Props {
  token: string;
  title: string;
  description?: string;
  onSelect: (calendarId: string, calendarName: string) => void;
  onAuthError?: () => void;
  onClose: () => void;
}

export function CalendarPickerDialog({ token, title, description, onSelect, onAuthError, onClose }: Props) {
  const [calendars, setCalendars] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReconnect, setShowReconnect] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const onAuthErrorRef = useRef(onAuthError);

  useEffect(() => {
    onAuthErrorRef.current = onAuthError;
  }, [onAuthError]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      setLoading(true);
      setError(null);
      setShowReconnect(false);

      listCalendars(token)
        .then((items) => {
          if (!cancelled) setCalendars(items);
        })
        .catch((err) => {
          if (cancelled) return;
          if (isGoogleCalendarAuthError(err)) {
            onAuthErrorRef.current?.();
            setShowReconnect(true);
            setError('לא ניתן לטעון יומנים כי ההרשאה ל-Google Calendar חסרה או פגה. התחבר מחדש עם Google.');
          } else if (isGoogleCalendarConfigurationError(err)) {
            setError('Google Calendar API חסום בפרויקט Google Cloud. צריך להפעיל את Calendar API עבור פרויקט ה-OAuth.');
          } else {
            setShowReconnect(true);
            setError('לא ניתן לטעון יומנים. נסה להתחבר מחדש.');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => { cancelled = true; };
  }, [token]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const id = await createCalendar(token, newName.trim());
      onSelect(id, newName.trim());
    } catch (err) {
      if (isGoogleCalendarAuthError(err)) {
        onAuthError?.();
        setShowReconnect(true);
        setError('ההרשאה ל-Google Calendar חסרה או פגה. התחבר מחדש עם Google.');
      } else {
        setError('יצירת יומן נכשלה');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-bg border border-border rounded-t-2xl sm:rounded-xl flex flex-col max-h-[82vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="font-semibold text-base">{title}</h3>
            {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-text"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading && (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-muted" size={20} /></div>
          )}
          {error && (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-red-400">{error}</p>
              {showReconnect && (
                <button
                  onClick={() => { onAuthError?.(); void signInWithGoogleCalendar(); }}
                  className="btn-primary text-sm"
                >
                  כניסה מחדש עם Google
                </button>
              )}
            </div>
          )}
          {!loading && !error && calendars.map(cal => (
            <button
              key={cal.id}
              onClick={() => onSelect(cal.id, cal.summary)}
              className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-surface text-sm transition-colors"
            >
              {cal.summary}
            </button>
          ))}
        </div>

        <div className="border-t border-border p-3 shrink-0">
          {creating ? (
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="שם היומן החדש"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleCreate(); }}
                autoFocus
                dir="rtl"
              />
              <button onClick={() => void handleCreate()} disabled={saving || !newName.trim()} className="btn-primary text-sm disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'צור'}
              </button>
              <button onClick={() => { setCreating(false); setNewName(''); }} className="btn-ghost text-sm">ביטול</button>
            </div>
          ) : (
            <button onClick={() => setCreating(true)} className="btn-ghost text-sm w-full justify-center gap-1.5">
              <Plus size={14} /> צור יומן חדש
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
