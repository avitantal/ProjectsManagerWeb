import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
  { auth: { flowType: 'implicit' } },
);

export type Scope = 'factory' | 'personal';

export type ProjectStatus = 'idea' | 'planned' | 'in_progress' | 'done' | 'frozen';
export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'frozen';
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface Project {
  id: number;
  name: string;
  status: ProjectStatus;
  priority: Priority;
  due_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  sync_to_calendar?: boolean;
  gcal_calendar_id?: string | null;
  gcal_event_id?: string | null;
}

export interface UserPreferences {
  user_id: string;
  gcal_default_calendar_id: string | null;
  gcal_reminders: number[];
}

export interface Task {
  id: number;
  project_id: number | null;
  name: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  due_time: string | null;
  notes: string | null;
  is_suggested: boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  gcal_event_id?: string | null;
  gcal_calendar_id?: string | null;
}

export interface ProjectFile {
  id: number;
  project_type: Scope;
  project_id: number;
  file_name: string;
  file_type: string | null;
  google_drive_url: string | null;
  google_drive_file_id: string | null;
  summary: string | null;
  uploaded_at: string;
}

export const PROJECT_STATUS_HE: Record<ProjectStatus, string> = {
  idea: 'רעיון',
  planned: 'מתוכנן',
  in_progress: 'בעבודה',
  done: 'הושלם',
  frozen: 'מחוק',
};

export const PRIORITY_HE: Record<Priority, string> = {
  high: 'גבוהה',
  medium: 'בינונית',
  low: 'נמוכה',
};

export const TASK_STATUS_HE: Record<TaskStatus, string> = {
  todo: 'לעשות',
  in_progress: 'בעבודה',
  review: 'בבדיקה',
  done: 'הושלם',
  frozen: 'מחוק',
};

export const TASK_PRIORITY_HE: Record<TaskPriority, string> = {
  urgent: 'דחוף',
  high: 'גבוה',
  normal: 'רגיל',
  low: 'נמוך',
};

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  todo: 'bg-zinc-700/40 text-zinc-300',
  in_progress: 'bg-orange-600/30 text-orange-300',
  review: 'bg-yellow-600/30 text-yellow-300',
  done: 'bg-green-600/30 text-green-300',
  frozen: 'bg-red-600/30 text-red-300',
};

export const TASK_PRIORITY_COLOR: Record<TaskPriority, string> = {
  urgent: 'bg-red-600/30 text-red-300 border border-red-700/50',
  high: 'bg-orange-600/30 text-orange-300',
  normal: 'bg-blue-600/30 text-blue-300',
  low: 'bg-zinc-700/40 text-zinc-400',
};

export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  idea: 'bg-zinc-700/40 text-zinc-300',
  planned: 'bg-yellow-600/30 text-yellow-300',
  in_progress: 'bg-orange-600/30 text-orange-300',
  done: 'bg-green-600/30 text-green-300',
  frozen: 'bg-red-600/30 text-red-300',
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  high: 'bg-red-600/30 text-red-300',
  medium: 'bg-yellow-600/30 text-yellow-300',
  low: 'bg-zinc-700/40 text-zinc-400',
};
