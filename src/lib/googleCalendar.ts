import type { Task, TaskPriority, Project, Priority } from './supabase';
import { TASK_STATUS_HE, TASK_PRIORITY_HE, PROJECT_STATUS_HE, PRIORITY_HE } from './supabase';

const BASE = 'https://www.googleapis.com/calendar/v3';

// Adds one calendar day to a YYYY-MM-DD string using UTC arithmetic so DST
// transitions in the local zone can't shift the result.
function addOneDayUtc(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

const PRIORITY_EMOJI: Record<TaskPriority, string> = {
  urgent: '🔴',
  high: '🟠',
  normal: '🔵',
  low: '⚪',
};

export interface CalendarEntry {
  id: string;
  summary: string;
}

interface GoogleErrorPayload {
  error?: {
    message?: string;
    status?: string;
    errors?: Array<{
      message?: string;
      reason?: string;
    }>;
  };
}

function parseGoogleError(body: string): GoogleErrorPayload | null {
  try {
    return JSON.parse(body) as GoogleErrorPayload;
  } catch {
    return null;
  }
}

function includesAny(value: string, matches: string[]): boolean {
  const lower = value.toLowerCase();
  return matches.some(match => lower.includes(match.toLowerCase()));
}

export class GoogleCalendarError extends Error {
  status: number;
  body: string;
  reason: string | null;

  constructor(status: number, body: string) {
    const payload = parseGoogleError(body);
    const message = payload?.error?.message ?? body;
    const reason = payload?.error?.errors?.[0]?.reason ?? payload?.error?.status ?? null;

    super(`Google Calendar API ${status}: ${message}`);
    this.name = 'GoogleCalendarError';
    this.status = status;
    this.body = body;
    this.reason = reason;
  }
}

export function isGoogleCalendarAuthError(error: unknown): boolean {
  if (!(error instanceof GoogleCalendarError)) return false;
  if (error.status === 401) return true;
  if (error.status !== 403) return false;

  const details = `${error.reason ?? ''} ${error.message} ${error.body}`;
  return includesAny(details, [
    'insufficient',
    'insufficientPermissions',
    'authError',
    'authentication scopes',
    'forbidden',
  ]);
}

export function isGoogleCalendarConfigurationError(error: unknown): boolean {
  if (!(error instanceof GoogleCalendarError) || error.status !== 403) return false;

  const details = `${error.reason ?? ''} ${error.message} ${error.body}`;
  return includesAny(details, [
    'accessNotConfigured',
    'has not been used in project',
    'is disabled',
    'enable it',
  ]);
}

async function gcalFetch(token: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new GoogleCalendarError(res.status, text);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function listCalendars(token: string): Promise<CalendarEntry[]> {
  const data = await gcalFetch(token, '/users/me/calendarList');
  return (data.items as Array<{ id: string; summary: string; accessRole: string }>)
    .filter(c => c.accessRole === 'owner' || c.accessRole === 'writer')
    .map(c => ({ id: c.id, summary: c.summary }));
}

export async function createCalendar(token: string, name: string): Promise<string> {
  const data = await gcalFetch(token, '/calendars', {
    method: 'POST',
    body: JSON.stringify({ summary: name }),
  });
  return data.id as string;
}

const TZ = 'Asia/Jerusalem';

function buildEventPayload(task: Task, reminders: number[], projectName?: string | null) {
  const date = task.due_date!;

  const description = [
    `📋 ${task.name}`,
    projectName ? `📁 ${projectName}` : '',
    '─────────────────',
    `עדיפות: ${TASK_PRIORITY_HE[task.priority]}`,
    `סטטוס:  ${TASK_STATUS_HE[task.status]}`,
    task.notes ? `\nהערות: ${task.notes}` : '',
    '',
    '─────────────────',
    '✦ נוצר על ידי ProjectsManager',
    'https://avitantal.github.io/ProjectsManagerWeb',
  ].filter(l => l !== '').join('\n');

  const summary = projectName
    ? `${PRIORITY_EMOJI[task.priority]} ${task.name} · ${projectName}`
    : `${PRIORITY_EMOJI[task.priority]} ${task.name}`;

  let startSpec: Record<string, string>;
  let endSpec: Record<string, string>;

  if (task.due_time) {
    // timed event: 1-hour block
    const hhmm = task.due_time.slice(0, 5); // normalize "HH:MM:SS" → "HH:MM"
    const startDateTime = `${date}T${hhmm}:00`;
    const [h, m] = hhmm.split(':').map(Number);
    const endH = h < 23 ? String(h + 1).padStart(2, '0') : '23';
    const endM = h < 23 ? String(m).padStart(2, '0') : '59';
    const endDateTime = `${date}T${endH}:${endM}:00`;
    startSpec = { dateTime: startDateTime,  timeZone: TZ };
    endSpec   = { dateTime: endDateTime,    timeZone: TZ };
  } else {
    // all-day event
    startSpec = { date };
    endSpec   = { date: addOneDayUtc(date) };
  }

  return {
    summary,
    description,
    start: startSpec,
    end: endSpec,
    reminders: {
      useDefault: false,
      overrides: reminders.map(minutes => ({ method: 'popup', minutes })),
    },
  };
}

export async function createEvent(
  token: string,
  calendarId: string,
  task: Task,
  reminders: number[],
  projectName?: string | null,
): Promise<string> {
  const data = await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: 'POST', body: JSON.stringify(buildEventPayload(task, reminders, projectName)) },
  );
  return data.id as string;
}

export async function updateEvent(
  token: string,
  calendarId: string,
  eventId: string,
  task: Task,
  reminders: number[],
  projectName?: string | null,
): Promise<void> {
  await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'PUT', body: JSON.stringify(buildEventPayload(task, reminders, projectName)) },
  );
}

export async function deleteEvent(
  token: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE' },
  );
}

const PROJECT_PRIORITY_EMOJI: Record<Priority, string> = {
  high: '🔴',
  medium: '🟠',
  low: '⚪',
};

function buildProjectEventPayload(project: Project, reminders: number[]) {
  const date = project.due_date!;
  const endDate = addOneDayUtc(date);

  const descLines = [
    `📁 ${project.name}`,
    project.description ?? '',
    '─────────────────',
    `עדיפות: ${PRIORITY_HE[project.priority]}`,
    `סטטוס:  ${PROJECT_STATUS_HE[project.status]}`,
    '─────────────────',
    '✦ נוצר על ידי ProjectsManager',
  ].filter(l => l !== '');

  return {
    summary: `${PROJECT_PRIORITY_EMOJI[project.priority]} 🎯 ${project.name}`,
    description: descLines.join('\n'),
    start: { date },
    end: { date: endDate },
    reminders: {
      useDefault: false,
      overrides: reminders.map(minutes => ({ method: 'popup', minutes })),
    },
  };
}

export async function createProjectEvent(
  token: string,
  calendarId: string,
  project: Project,
  reminders: number[],
): Promise<string> {
  const data = await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: 'POST', body: JSON.stringify(buildProjectEventPayload(project, reminders)) },
  );
  return data.id as string;
}

export async function updateProjectEvent(
  token: string,
  calendarId: string,
  eventId: string,
  project: Project,
  reminders: number[],
): Promise<void> {
  await gcalFetch(
    token,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'PUT', body: JSON.stringify(buildProjectEventPayload(project, reminders)) },
  );
}
