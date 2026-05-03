import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  type Scope, type Project, type Task, supabase,
  PROJECT_STATUS_HE, PRIORITY_HE, TASK_STATUS_HE, TASK_PRIORITY_HE,
} from '../lib/supabase';

interface Props {
  scope: Scope;
  type: 'project' | 'task';
  projects: Project[];
  defaultProjectId?: number | null;
  editing?: Project | Task;
  onClose: () => void;
  onSaved: () => void;
}

function isTask(entity: Project | Task | undefined): entity is Task {
  return !!entity && 'project_id' in entity;
}

export function AddDialog({ scope, type, projects, defaultProjectId, editing, onClose, onSaved }: Props) {
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
  const [saving, setSaving] = useState(false);

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

    if (editMode && editing) {
      payload.updated_at = new Date().toISOString();
      await supabase.from(table).update(payload).eq('id', editing.id);
    } else {
      await supabase.from(table).insert(payload);
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  const heading = editMode
    ? (type === 'project' ? 'עריכת פרויקט' : 'עריכת משימה')
    : (type === 'project' ? 'פרויקט חדש' : 'משימה חדשה');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{heading}</h2>
          <button onClick={onClose} className="text-muted hover:text-text"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
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
                {Object.entries(type === 'project' ? PROJECT_STATUS_HE : TASK_STATUS_HE).map(([k, v]) => (
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
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">{type === 'project' ? 'תיאור' : 'הערות'}</label>
            <textarea className="input min-h-[80px]" value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">ביטול</button>
            <button type="submit" disabled={saving || !name.trim()} className="btn-primary disabled:opacity-50">
              {saving ? 'שומר...' : editMode ? 'עדכן' : 'שמור'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
