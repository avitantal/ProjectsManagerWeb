import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase, type Task, type Project, type Scope, type UserPreferences } from '../lib/supabase';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  isGoogleCalendarAuthError,
  isGoogleCalendarConfigurationError,
} from '../lib/googleCalendar';

const DEFAULT_REMINDERS = [1440, 120];

async function loadPrefs(userId: string): Promise<UserPreferences | null> {
  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data as UserPreferences | null;
}

async function savePrefs(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const { data } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
    .select()
    .single();
  return data as UserPreferences;
}

export function useCalendarSync(
  session: Session | null,
  providerToken: string | null,
  onCalendarAuthError?: () => void,
) {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [needsCalendarSetup, setNeedsCalendarSetup] = useState(false);
  const [, setPendingFreeTasks] = useState<Array<{ task: Task; scope: Scope }>>([]);

  const token = providerToken;
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    loadPrefs(userId).then(p => setPrefs(p));
  }, [userId]);

  const updatePrefs = useCallback(async (patch: Partial<UserPreferences>) => {
    if (!userId) return;
    const updated = await savePrefs(userId, patch);
    setPrefs(updated);
    return updated;
  }, [userId]);

  function resolveCalendarId(task: Task, projects: Project[]): string {
    if (task.project_id !== null) {
      const proj = projects.find(p => p.id === task.project_id);
      if (proj?.sync_to_calendar && proj.gcal_calendar_id) return proj.gcal_calendar_id;
    }
    return prefs?.gcal_default_calendar_id ?? 'primary';
  }

  function resolveProjectName(task: Task, projects: Project[]): string | null {
    if (task.project_id === null) return null;
    return projects.find(p => p.id === task.project_id)?.name ?? null;
  }

  async function syncTask(
    task: Task,
    scope: Scope,
    projects: Project[],
  ): Promise<string | null> {
    if (!token) {
      toast.warning('יש להתחבר ל-Google Calendar');
      return null;
    }

    const calendarId = resolveCalendarId(task, projects);
    const reminders = prefs?.gcal_reminders ?? DEFAULT_REMINDERS;
    const projectName = resolveProjectName(task, projects);

    if (!task.due_date) {
      if (task.gcal_event_id) {
        try { await deleteEvent(token, calendarId, task.gcal_event_id); } catch { /* already gone */ }
        await supabase.from(`${scope}_tasks`).update({ gcal_event_id: null }).eq('id', task.id);
      }
      return null;
    }

    try {
      if (task.gcal_event_id) {
        await updateEvent(token, calendarId, task.gcal_event_id, task, reminders, projectName);
        toast.success('אירוע עודכן ב-Google Calendar');
        return task.gcal_event_id;
      }

      const eventId = await createEvent(token, calendarId, task, reminders, projectName);
      await supabase.from(`${scope}_tasks`).update({ gcal_event_id: eventId }).eq('id', task.id);
      toast.success('משימה נוספה ל-Google Calendar');
      return eventId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Calendar sync failed:', msg);

      if (isGoogleCalendarAuthError(err)) {
        onCalendarAuthError?.();
        toast.error('סנכרון נכשל: צריך להתחבר מחדש ל-Google Calendar');
      } else if (isGoogleCalendarConfigurationError(err)) {
        toast.error('סנכרון נכשל: Google Calendar API לא פעיל בפרויקט ה-OAuth');
      } else {
        toast.error(`סנכרון נכשל: ${msg.slice(0, 80)}`);
      }
      return null;
    }
  }

  async function removeTaskEvent(task: Task, _taskScope: Scope, taskProjects: Project[]) {
    if (!token || !task.gcal_event_id) return;
    const calendarId = resolveCalendarId(task, taskProjects);
    if (!calendarId) return;
    try { await deleteEvent(token, calendarId, task.gcal_event_id); } catch { /* already gone */ }
  }

  async function flushPending() {
    setPendingFreeTasks([]);
  }

  return {
    syncTask,
    removeTaskEvent,
    prefs,
    updatePrefs,
    needsCalendarSetup,
    setNeedsCalendarSetup,
    flushPending,
    isCalendarReady: !!token,
  };
}
