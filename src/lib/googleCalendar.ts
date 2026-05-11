import type { Task, TaskPriority } from './supabase';
import { TASK_STATUS_HE, TASK_PRIORITY_HE } from './supabase';

const BASE = 'https://www.googleapis.com/calendar/v3';

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
    throw new Error(`Google Calendar API ${res.status}: ${text}`);
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
    const startDateTime = `${date}T${task.due_time}:00`;
    const [h, m] = task.due_time.split(':').map(Number);
    const endH = String(h + 1).padStart(2, '0');
    const endM = String(m).padStart(2, '0');
    const endDateTime = `${date}T${endH}:${endM}:00`;
    startSpec = { dateTime: startDateTime, timeZone: TZ };
    endSpec   = { dateTime: endDateTime,   timeZone: TZ };
  } else {
    // all-day event
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const endDate = nextDay.toISOString().slice(0, 10);
    startSpec = { date };
    endSpec   = { date: endDate };
  }

  return {
    summary,
    description,
    start: startSpec,
    end: endSpec,
    source: {
      title: 'ProjectsManager',
      url: 'https://avitantal.github.io/ProjectsManagerWeb',
    },
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
