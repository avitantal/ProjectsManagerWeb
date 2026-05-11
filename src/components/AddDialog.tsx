import { useState, type FormEvent } from 'react';
import { CalendarCheck, X } from 'lucide-react';
import {
  type Scope, type Project, type Task, supabase,
  PROJECT_STATUS_HE, PRIORITY_HE, TASK_STATUS_HE, TASK_PRIORITY_HE,
} from '../lib/supabase';
import { CalendarPickerDialog } from './CalendarPickerDialog';

interface Props {
  scope: Scope;
  type: 'project' | 'task';
  projects: Project[];
  defaultProjectId?: number | null;
  editing?: Project | Task;
  onClose: () => void;
  onSaved: () => void;
  onTaskSaved?: (task: Task) => Promise<void>;
  calendarToken?: string | null;
}

function isTask(entity: Project | Task | undefined): entity is Task {
  return !!entity && 'project_id' in entity;
}

export function AddDialog({ scope, type, projects, defaultProjectId, editing, onClose, onSaved, onTaskSaved, calendarToken }: Props) {
  const editMode = !!editing;
  const editingTask = isTask(editing) ? editing : undefined;
  const editingProject = !isTask(editing) ? (editing as Project | undefined) : undefined;

  const [name, setName] = useState(editing?.name ?? '');
  const [status, setStatus] = useState<string>(editing?.status ?? (type === 'project' ? 'planned' : 'todo'));
  const [priority, setPriority] = useState<string>(editing?.priority ?? (type === 'project' ? 'medium' : 'normal'));
  const [dueDate, setDueDate] = useState(editing?.due_date ?? '');
  const [text, setText] = useState(editingProject?.description ?? editingTask?.notes ?? '');
  const [projectId, setProjectId] = useState<number | null>(
    editMode ? (editingTask?.project_id ?? null) : (defaultProjectId ?? null),
  );
  const [syncToCalendar, setSyncToCalendar] = useState(editingProject?.sync_to_calendar ?? (editMode ? false : true));
  const [gcalCalendarId, setGcalCalendarId] = useState<string | null>(editingProject?.gcal_calendar_id ?? null);
  const [gcalCalendarName, setGcalCalendarName] = useState<string | null>(null);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleSyncToggle(checked: boolean) {
    setSyncToCalendar(checked);
    if (checked && !gcalCalendarId && calendarToken) {
      setShowCalendarPicker(true);
    }
  }

  function handleCalendarSelected(calId: string, calName: string) {
    setGcalCalendarId(calId);
    setGcalCalendarName(calName);
    setShowCalendarPicker(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const table = type === 'project' ? `${scope}_projects` : `${scope}_tasks`;
    const payload: Record<string, unknown> = {
      name: name.trim(),
      status,
      priority,
      due_date: dueDate || null,
    };
    if (type === 'project') {
      payload.description = text || null;
      payload.sync_to_calendar = syncToCalendar;
      payload.gcal_calendar_id = syncToCalendar ? gcalCalendarId : null;
      if (editMode && editingProject) {
        if (status === 'done' && editingProject.status !== 'done') payload.closed_at = new Date().toISOString();
        else if (status !== 'done' && editingProject.status === 'done') payload.closed_at = null;
      } else if (!editMode && status === 'done') {
        payload.closed_at = new Date().toISOString();
      }
    } else {
      payload.notes = text || null;
      payload.project_id = projectId ?? null;
      if (editMode && editingTask) {
        if (status === 'done' && editingTask.status !== 'done') payload.closed_at = new Date().toISOString();
        else if (status !== 'done' && editingTask.status === 'done') payload.closed_at = null;
      } else if (!editMode && status === 'done') {
        payload.closed_at = new Date().toISOString();
      }
    }

    let savedTask: Task | null = null;

    if (editMode && editing) {
      payload.updated_at = new Date().toISOString();
      if (type === 'task') {
        const { data } = await supabase.from(table).update(payload).eq('id', editing.id).select().single();
        savedTask = data as Task;
      } else {
        await supabase.from(table).update(payload).eq('id', editing.id);
      }
    } else {
      if (type === 'task') {
        const { data } = await supabase.from(table).insert(payload).select().single();
        savedTask = data as Task;
      } else {
        await supabase.from(table).insert(payload);
      }
    }

    setSaving(false);

    if (savedTask && onTaskSaved) {
      await onTaskSaved(savedTask).catch(() => {/* calendar sync errors are non-blocking */});
    }

    onSaved();
    onClose();
  }

  const heading = editMode
    ? (type === 'project' ? 'עריכת פרויקט' : 'עריכת משימה')
    : (type === 'project' ? 'פרויקט חדש' : 'משימה חדשה');

  const displayCalendarName = gcalCalendarName
    ?? (gcalCalendarId ? gcalCalendarId : null);

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-bg border border-border rounded-t-2xl sm:rounded-xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">{heading}</h2>
          <button onClick={onClose} className="text-muted hover:text-text"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="space-y-4 p-6">
            <div>
              <label className="block text-xs text-muted mb-1">{type === 'project' ? 'שם הפרויקט' : 'שם המשימה'}</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
            </div>

            {type === 'task' && (
              <div>
                <label className="block text-xs text-muted mb-1">פרויקט</label>
                <select className="input" value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">ללא פרויקט</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">סטטוס</label>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {Object.entries(type === 'project' ? PROJECT_STATUS_HE : TASK_STATUS_HE).filter(([k]) => type === 'project' || k !== 'frozen').map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">עדיפות</label>
                <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {Object.entries(type === 'project' ? PRIORITY_HE : TASK_PRIORITY_HE).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">תאריך יעד</label>
              <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              {type === 'task' && calendarToken && dueDate && (
                <p className="text-[11px] text-accent/70 mt-1 flex items-center gap-1">
                  <CalendarCheck size={11} /> ישולב בגוגל קלנדר
                  {projectId && projects.find(p => p.id === projectId) && (
                    <> · {projects.find(p => p.id === projectId)!.name}</>
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">{type === 'project' ? 'תיאור' : 'הערות'}</label>
              <textarea className="input min-h-[80px]" value={text} onChange={(e) => setText(e.target.value)} />
            </div>

            {type === 'project' && calendarToken && (
              <div className="border border-border rounded-lg p-3 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncToCalendar}
                    onChange={e => handleSyncToggle(e.target.checked)}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-sm flex items-center gap-1.5">
                    <CalendarCheck size={14} className="text-accent" />
                    סנכרן משימות ליומן Google
                  </span>
                </label>
                {syncToCalendar && (
                  <div className="flex items-center gap-2 pr-6 text-xs text-muted">
                    {displayCalendarName ? (
                      <>
                        <span className="text-text/80 truncate">{displayCalendarName}</span>
                        <button
                          type="button"
                          onClick={() => setShowCalendarPicker(true)}
                          className="text-accent hover:underline shrink-0"
                        >
                          שנה יומן
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCalendarPicker(true)}
                        className="text-accent hover:underline"
                      >
                        בחר יומן…
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end px-6 py-4 border-t border-border shrink-0">
            <button type="button" onClick={onClose} className="btn-ghost">ביטול</button>
            <button type="submit" disabled={saving || !name.trim()} className="btn-primary disabled:opacity-50">
              {saving ? 'שומר...' : editMode ? 'עדכן' : 'שמור'}
            </button>
          </div>
        </form>
      </div>
    </div>

    {showCalendarPicker && calendarToken && (
      <CalendarPickerDialog
        token={calendarToken}
        title="בחר יומן לפרויקט"
        description="משימות הפרויקט יסונכרנו ליומן שתבחר"
        onSelect={handleCalendarSelected}
        onClose={() => setShowCalendarPicker(false)}
      />
    )}
    </>
  );
}
