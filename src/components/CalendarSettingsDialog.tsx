import { useState } from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import type { UserPreferences } from '../lib/supabase';
import { CalendarPickerDialog } from './CalendarPickerDialog';

const REMINDER_PRESETS: { label: string; minutes: number }[] = [
  { label: 'שעה לפני', minutes: 60 },
  { label: 'שעתיים לפני', minutes: 120 },
  { label: '3 שעות לפני', minutes: 180 },
  { label: 'יום לפני', minutes: 1440 },
  { label: 'שבוע לפני', minutes: 10080 },
];

function formatMinutes(m: number): string {
  if (m < 60) return `${m} דקות`;
  if (m < 1440) return `${m / 60} שעות`;
  if (m < 10080) return `${m / 1440} ימים`;
  return `${m / 10080} שבועות`;
}

interface Props {
  token: string;
  prefs: UserPreferences | null;
  onSave: (patch: Partial<UserPreferences>) => Promise<void>;
  onClose: () => void;
}

export function CalendarSettingsDialog({ token, prefs, onSave, onClose }: Props) {
  const [calendarName, setCalendarName] = useState<string | null>(null);
  const [calendarId, setCalendarId] = useState<string | null>(prefs?.gcal_default_calendar_id ?? null);
  const [reminders, setReminders] = useState<number[]>(prefs?.gcal_reminders ?? [1440, 120]);
  const [showPicker, setShowPicker] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  function addPreset(minutes: number) {
    if (!reminders.includes(minutes)) setReminders(r => [...r, minutes].sort((a, b) => b - a));
  }

  function addCustom() {
    const m = parseInt(customMinutes);
    if (!m || m <= 0) return;
    if (!reminders.includes(m)) setReminders(r => [...r, m].sort((a, b) => b - a));
    setCustomMinutes('');
  }

  function removeReminder(m: number) {
    setReminders(r => r.filter(x => x !== m));
  }

  async function handleSave() {
    setSaving(true);
    await onSave({
      gcal_default_calendar_id: calendarId,
      gcal_reminders: reminders,
    });
    setSaving(false);
    onClose();
  }

  const displayName = calendarName ?? (calendarId ? calendarId : 'לא נבחר');

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-bg border border-border rounded-t-2xl sm:rounded-xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">הגדרות גוגל קלנדר</h2>
          <button onClick={onClose} className="text-muted hover:text-text"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Default calendar */}
          <div>
            <h3 className="text-sm font-medium mb-2">יומן ברירת מחדל לכל המשימות</h3>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm text-text/80 truncate border border-border rounded-lg px-3 py-2 bg-surface">
                {displayName}
              </span>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="btn-primary text-sm shrink-0"
              >
                שנה
              </button>
            </div>
          </div>

          {/* Reminders */}
          <div>
            <h3 className="text-sm font-medium mb-2">תזכורות לכל אירוע</h3>
            <div className="space-y-1.5 mb-3">
              {reminders.length === 0 && (
                <p className="text-xs text-muted">אין תזכורות</p>
              )}
              {reminders.map(m => (
                <div key={m} className="flex items-center justify-between px-3 py-1.5 bg-surface rounded-lg border border-border text-sm">
                  <span>{formatMinutes(m)}</span>
                  <button onClick={() => removeReminder(m)} className="text-muted hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted">הוסף תזכורת:</p>
              <div className="flex flex-wrap gap-1.5">
                {REMINDER_PRESETS.filter(p => !reminders.includes(p.minutes)).map(p => (
                  <button
                    key={p.minutes}
                    onClick={() => addPreset(p.minutes)}
                    className="chip bg-surface border border-border text-xs hover:border-accent hover:text-accent"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  min={1}
                  className="input flex-1 text-sm"
                  placeholder="דקות מותאם אישית"
                  value={customMinutes}
                  onChange={e => setCustomMinutes(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCustom(); }}
                  dir="ltr"
                />
                <button onClick={addCustom} className="btn-ghost text-sm" disabled={!customMinutes}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="btn-ghost">ביטול</button>
          <button onClick={() => void handleSave()} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'שמור'}
          </button>
        </div>
      </div>
    </div>

    {showPicker && (
      <CalendarPickerDialog
        token={token}
        title="בחר יומן ברירת מחדל"
        description="לכל המשימות (פרויקטים יכולים לעקוף ליומן ייעודי)"
        onSelect={(id, name) => { setCalendarId(id); setCalendarName(name); setShowPicker(false); }}
        onClose={() => setShowPicker(false)}
      />
    )}
    </>
  );
}

export function CalendarFirstUseDialog({ token, onSave, onClose }: Omit<Props, 'prefs'>) {
  return (
    <CalendarPickerDialog
      token={token}
      title="בחר יומן לסינכרון"
      description="כל המשימות יסונכרנו ליומן שתבחר. פרויקטים יכולים לעקוף ליומן ייעודי. ניתן לשנות מהגדרות קלנדר."
      onSelect={async (id) => {
        await onSave({ gcal_default_calendar_id: id });
        onClose();
      }}
      onClose={onClose}
    />
  );
}
