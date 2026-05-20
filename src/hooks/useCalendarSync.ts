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
  GoogleCalendarError,
} from '../lib/googleCalendar';

const DEFAULT_REMINDERS = [1440, 120];
const ALL_SCOPES: Scope[] = ['factory', 'personal'];

// Attempt to delete a calendar event, classifying the outcome so callers can
// decide whether to clear the stored reference or keep it for a later retry.
// A 404/410 means the event is already gone — a success for our purpose.
async function tryDeleteEvent(
  token: string,
  calendarId: string,
  eventId: string,
): Promise<'removed' | 'gone' | 'failed'> {
  try {
    await deleteEvent(token, calendarId, eventId);
    return 'removed';
  } catch (err) {
    if (err instanceof GoogleCalendarError && (err.status === 404 || err.status === 410)) {
      return 'gone';
    }
    console.warn('GCal event delete failed — will retry later:', err);
    return 'failed';
  }
}

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
  const [prefs, setPrefs] = useState<UserPreferences | null | undefined>(undefined);
  const [needsCalendarSetup, setNeedsCalendarSetup] = useState(false);
  const [, setPendingFreeTasks] = useState<Array<{ task: Task; scope: Scope }>>([]);
  const hasSyncedOnLogin = useRef(false);

  const token = providerToken;
  const userId = session?.user?.id ?? null;
  const prefsLoaded = prefs !== undefined;

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
    opts?: { silent?: boolean },
  ): Promise<string | null> {
    if (!token) {
      if (!opts?.silent) toast.warning('יש להתחבר ל-Google Calendar');
      return null;
    }

    const calendarId = resolveCalendarId(task, projects);
    const reminders = prefs?.gcal_reminders ?? DEFAULT_REMINDERS;
    const projectName = resolveProjectName(task, projects);
    // An existing event lives in the calendar it was created in (stored on the
    // task); only a brand-new event uses the freshly resolved calendar.
    const eventCalendarId = task.gcal_calendar_id ?? calendarId;

    if (!task.due_date) {
      if (task.gcal_event_id) {
        const outcome = await tryDeleteEvent(token, eventCalendarId, task.gcal_event_id);
        if (outcome !== 'failed') {
          await supabase.from(`${scope}_tasks`).update({ gcal_event_id: null, gcal_calendar_id: null }).eq('id', task.id);
          if (!opts?.silent) toast.success('אירוע הוסר מ-Google Calendar');
        } else if (!opts?.silent) {
          toast.error('הסרת האירוע מ-Google Calendar נכשלה — ננסה שוב אוטומטית');
        }
      }
      return null;
    }

    try {
      if (task.gcal_event_id) {
        await updateEvent(token, eventCalendarId, task.gcal_event_id, task, reminders, projectName);
        // Backfill the calendar id for events created before it was tracked.
        if (!task.gcal_calendar_id) {
          await supabase.from(`${scope}_tasks`).update({ gcal_calendar_id: eventCalendarId }).eq('id', task.id);
        }
        if (!opts?.silent) toast.success('אירוע עודכן ב-Google Calendar');
        return task.gcal_event_id;
      }

      const eventId = await createEvent(token, calendarId, task, reminders, projectName);
      await supabase.from(`${scope}_tasks`).update({ gcal_event_id: eventId, gcal_calendar_id: calendarId }).eq('id', task.id);
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
      let removed = 0;
      for (const scope of ALL_SCOPES) {
        const [{ data: tasks }, { data: allProjects }] = await Promise.all([
          supabase.from(`${scope}_tasks`).select('*').not('due_date', 'is', null).is('gcal_event_id', null).neq('status', 'frozen'),
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
          .or('sync_to_calendar.eq.true,sync_to_calendar.is.null')
          .neq('status', 'frozen');

        for (const project of (pendingProjects ?? []) as Project[]) {
          const result = await syncProject(project, scope, { silent: true });
          if (result) synced++;
        }

        // Remove calendar events for frozen projects that still have gcal_event_id
        const { data: frozenProjects } = await supabase
          .from(`${scope}_projects`)
          .select('*')
          .eq('status', 'frozen')
          .not('gcal_event_id', 'is', null);

        for (const project of (frozenProjects ?? []) as Project[]) {
          const calendarId = project.gcal_calendar_id ?? prefs?.gcal_default_calendar_id ?? 'primary';
          const outcome = await tryDeleteEvent(token!, calendarId, project.gcal_event_id!);
          if (outcome !== 'failed') {
            await supabase.from(`${scope}_projects`).update({ gcal_event_id: null }).eq('id', project.id);
            removed++;
          }
        }

        // Safety net: remove calendar events for frozen tasks that still have
        // gcal_event_id — e.g. a task deleted while the calendar token was
        // briefly unavailable, so removeTaskEvent could not reach Google.
        const { data: frozenTasks } = await supabase
          .from(`${scope}_tasks`)
          .select('id, gcal_event_id, gcal_calendar_id, project_id, due_date')
          .eq('status', 'frozen')
          .not('gcal_event_id', 'is', null);

        for (const t of (frozenTasks ?? []) as Task[]) {
          const calendarId = t.gcal_calendar_id ?? resolveCalendarId(t, (allProjects ?? []) as Project[]);
          const outcome = await tryDeleteEvent(token!, calendarId, t.gcal_event_id!);
          if (outcome !== 'failed') {
            await supabase.from(`${scope}_tasks`).update({ gcal_event_id: null, gcal_calendar_id: null }).eq('id', t.id);
            removed++;
          }
        }
      }

      if (synced > 0) {
        toast.success(`סונכרנו ${synced} אירועים ל-Google Calendar`);
      }
      if (removed > 0) {
        toast.success(`הוסרו ${removed} אירועים מ-Google Calendar`);
      }
    }

    void syncAllPending();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId, prefsLoaded]);

  async function removeTaskEvent(task: Task, taskScope: Scope, taskProjects: Project[]) {
    // Read gcal fields fresh from the DB — a sync may have set them after the
    // last React refresh (task created then deleted moments later), leaving the
    // prop stale.
    const { data: freshTask } = await supabase
      .from(`${taskScope}_tasks`)
      .select('gcal_event_id, gcal_calendar_id')
      .eq('id', task.id)
      .maybeSingle();
    const eventId = freshTask?.gcal_event_id ?? task.gcal_event_id ?? null;
    if (!eventId) return;
    // Delete from the calendar the event actually lives in (stored at creation).
    // Fall back to resolution only for events created before it was tracked.
    const calendarId = freshTask?.gcal_calendar_id ?? task.gcal_calendar_id
      ?? resolveCalendarId(task, taskProjects);

    if (!token) {
      // Can't reach Google now — keep gcal_event_id so the page-load sweep
      // retries once a token is available.
      console.warn('GCal task event not removed yet — no calendar token; will retry on next load');
      return;
    }

    const outcome = await tryDeleteEvent(token, calendarId, eventId);
    if (outcome === 'failed') {
      // Keep gcal_event_id so the sweep retries; surface the failure.
      toast.error('הסרת האירוע מ-Google Calendar נכשלה — ננסה שוב אוטומטית');
      return;
    }
    await supabase.from(`${taskScope}_tasks`).update({ gcal_event_id: null, gcal_calendar_id: null }).eq('id', task.id);
    toast.success('אירוע הוסר מ-Google Calendar');
  }

  async function removeProjectEvent(project: Project, projectScope: Scope) {
    // Read the project's own gcal fields fresh from the DB — a sync may have
    // set gcal_event_id after the last React refresh (e.g. a project created
    // and then deleted moments later), which would leave the prop stale.
    const { data: freshProject } = await supabase
      .from(`${projectScope}_projects`)
      .select('gcal_event_id, gcal_calendar_id')
      .eq('id', project.id)
      .maybeSingle();
    const eventId    = freshProject?.gcal_event_id ?? project.gcal_event_id ?? null;
    const calendarId = freshProject?.gcal_calendar_id ?? project.gcal_calendar_id
      ?? prefs?.gcal_default_calendar_id ?? 'primary';
    if (token && eventId) {
      const outcome = await tryDeleteEvent(token, calendarId, eventId);
      if (outcome !== 'failed') {
        await supabase.from(`${projectScope}_projects`).update({ gcal_event_id: null }).eq('id', project.id);
      }
    }
    // Fetch the project's tasks fresh from the DB — including each task's own
    // stored gcal_calendar_id so its event is deleted from the right calendar.
    const { data: freshTasks } = await supabase
      .from(`${projectScope}_tasks`)
      .select('id, gcal_event_id, gcal_calendar_id, project_id, due_date')
      .eq('project_id', project.id)
      .not('gcal_event_id', 'is', null);
    const tasksWithEvent = (freshTasks ?? []) as Pick<Task, 'id' | 'gcal_event_id' | 'gcal_calendar_id' | 'project_id' | 'due_date'>[];
    await Promise.all(tasksWithEvent.map(async t => {
      // No token — keep gcal_event_id; the page-load sweep will retry.
      if (!token) return;
      const taskCalendarId = t.gcal_calendar_id ?? resolveCalendarId(t as Task, [project]);
      const outcome = await tryDeleteEvent(token, taskCalendarId, t.gcal_event_id!);
      if (outcome !== 'failed') {
        await supabase.from(`${projectScope}_tasks`).update({ gcal_event_id: null, gcal_calendar_id: null }).eq('id', t.id);
      }
    }));
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
