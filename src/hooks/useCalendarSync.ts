import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase, type Task, type Project, type Scope, type UserPreferences } from '../lib/supabase';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  createProjectEvent,
  updateProjectEvent,
  isGoogleCalendarAuthError,
  isGoogleCalendarConfigurationError,
} from '../lib/googleCalendar';

const DEFAULT_REMINDERS = [1440, 120];
const ALL_SCOPES: Scope[] = ['factory', 'personal'];

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
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [needsCalendarSetup, setNeedsCalendarSetup] = useState(false);
  const [, setPendingFreeTasks] = useState<Array<{ task: Task; scope: Scope }>>([]);
  const hasSyncedOnLogin = useRef(false);

  const token = providerToken;
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) { setPrefsLoaded(false); return; }
    loadPrefs(userId).then(p => {
      setPrefs(p);
      setPrefsLoaded(true);
    });
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
    opts?: { silent?: boolean },
  ): Promise<string | null> {
    if (!token) {
      if (!opts?.silent) toast.warning('יש להתחבר ל-Google Calendar');
      return null;
    }

    const calendarId = resolveCalendarId(task, projects);
    const reminders = prefs?.gcal_reminders ?? DEFAULT_REMINDERS;
    const projectName = resolveProjectName(task, projects);

    if (!task.due_date) {
      if (task.gcal_event_id) {
        try { await deleteEvent(token, calendarId, task.gcal_event_id); } catch { /* already gone */ }
        await supabase.from(`${scope}_tasks`).update({ gcal_event_id: null }).eq('id', task.id);
        if (!opts?.silent) toast.success('אירוע הוסר מ-Google Calendar');
      }
      return null;
    }

    try {
      if (task.gcal_event_id) {
        await updateEvent(token, calendarId, task.gcal_event_id, task, reminders, projectName);
        if (!opts?.silent) toast.success('אירוע עודכן ב-Google Calendar');
        return task.gcal_event_id;
      }

      const eventId = await createEvent(token, calendarId, task, reminders, projectName);
      await supabase.from(`${scope}_tasks`).update({ gcal_event_id: eventId }).eq('id', task.id);
      if (!opts?.silent) toast.success('משימה נוספה ל-Google Calendar');
      return eventId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Calendar sync failed:', msg);

      if (isGoogleCalendarAuthError(err)) {
        onCalendarAuthError?.();
        if (!opts?.silent) toast.error('סנכרון נכשל: צריך להתחבר מחדש ל-Google Calendar');
      } else if (isGoogleCalendarConfigurationError(err)) {
        if (!opts?.silent) toast.error('סנכרון נכשל: Google Calendar API לא פעיל בפרויקט ה-OAuth');
      } else {
        if (!opts?.silent) toast.error(`סנכרון נכשל: ${msg.slice(0, 80)}`);
      }
      return null;
    }
  }

  async function syncProject(project: Project, scope: Scope, opts?: { silent?: boolean }): Promise<string | null> {
    if (!token) return null;
    const calendarId = project.gcal_calendar_id ?? prefs?.gcal_default_calendar_id ?? 'primary';
    const reminders = prefs?.gcal_reminders ?? DEFAULT_REMINDERS;

    if (!project.due_date) {
      if (project.gcal_event_id) {
        try { await deleteEvent(token, calendarId, project.gcal_event_id); } catch { /* already gone */ }
        await supabase.from(`${scope}_projects`).update({ gcal_event_id: null }).eq('id', project.id);
        if (!opts?.silent) toast.success('אירוע הוסר מ-Google Calendar');
      }
      return null;
    }

    try {
      if (project.gcal_event_id) {
        await updateProjectEvent(token, calendarId, project.gcal_event_id, project, reminders);
        if (!opts?.silent) toast.success('פרויקט עודכן ב-Google Calendar');
        return project.gcal_event_id;
      }
      const eventId = await createProjectEvent(token, calendarId, project, reminders);
      await supabase.from(`${scope}_projects`).update({ gcal_event_id: eventId }).eq('id', project.id);
      if (!opts?.silent) toast.success('פרויקט נוסף ל-Google Calendar');
      return eventId;
    } catch (err) {
      console.error('Project calendar sync failed:', err instanceof Error ? err.message : err);
      if (isGoogleCalendarAuthError(err)) {
        onCalendarAuthError?.();
        if (!opts?.silent) toast.error('סנכרון נכשל: צריך להתחבר מחדש ל-Google Calendar');
      } else if (isGoogleCalendarConfigurationError(err)) {
        if (!opts?.silent) toast.error('סנכרון נכשל: Google Calendar API לא פעיל בפרויקט ה-OAuth');
      } else {
        if (!opts?.silent) toast.error(`סנכרון פרויקט נכשל: ${err instanceof Error ? err.message.slice(0, 80) : String(err)}`);
      }
      return null;
    }
  }

  // On page load: sync all tasks/projects that have due_date but no gcal_event_id.
  // Waits for prefs to load so the correct calendar IDs are used.
  useEffect(() => {
    if (!token || !userId) {
      hasSyncedOnLogin.current = false;
      return;
    }
    if (!prefsLoaded) return;
    if (hasSyncedOnLogin.current) return;
    hasSyncedOnLogin.current = true;

    async function syncAllPending() {
      let synced = 0;
      for (const scope of ALL_SCOPES) {
        const [{ data: tasks }, { data: allProjects }] = await Promise.all([
          supabase.from(`${scope}_tasks`).select('*').not('due_date', 'is', null).is('gcal_event_id', null),
          supabase.from(`${scope}_projects`).select('*'),
        ]);

        for (const task of (tasks ?? []) as Task[]) {
          const result = await syncTask(task, scope, (allProjects ?? []) as Project[], { silent: true });
          if (result) synced++;
        }

        const { data: pendingProjects } = await supabase
          .from(`${scope}_projects`)
          .select('*')
          .not('due_date', 'is', null)
          .is('gcal_event_id', null)
          .or('sync_to_calendar.eq.true,sync_to_calendar.is.null');

        for (const project of (pendingProjects ?? []) as Project[]) {
          const result = await syncProject(project, scope, { silent: true });
          if (result) synced++;
        }
      }

      if (synced > 0) {
        toast.success(`סונכרנו ${synced} אירועים ל-Google Calendar`);
      }
    }

    void syncAllPending();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId, prefsLoaded]);

  async function removeTaskEvent(task: Task, _taskScope: Scope, taskProjects: Project[]) {
    if (!token || !task.gcal_event_id) return;
    const calendarId = resolveCalendarId(task, taskProjects);
    if (!calendarId) return;
    try { await deleteEvent(token, calendarId, task.gcal_event_id); } catch { /* already gone */ }
  }

  async function removeProjectEvent(project: Project) {
    if (!token || !project.gcal_event_id) return;
    const calendarId = project.gcal_calendar_id ?? prefs?.gcal_default_calendar_id ?? 'primary';
    try { await deleteEvent(token, calendarId, project.gcal_event_id); } catch { /* already gone */ }
  }

  async function flushPending() {
    setPendingFreeTasks([]);
  }

  return {
    syncTask,
    syncProject,
    removeTaskEvent,
    removeProjectEvent,
    prefs,
    updatePrefs,
    needsCalendarSetup,
    setNeedsCalendarSetup,
    flushPending,
    isCalendarReady: !!token,
  };
}
