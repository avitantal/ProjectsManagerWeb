import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  type Scope, type Project, supabase,
  PROJECT_STATUS_HE, PRIORITY_HE, TASK_STATUS_HE, TASK_PRIORITY_HE,
} from '../lib/supabase';

interface Props {
  scope: Scope;
  type: 'project' | 'task';
  projects: Project[];
  defaultProjectId?: number;
  onClose: () => void;
  onSaved: () => void;
}

export function AddDialog({ scope, type, projects, defaultProjectId, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState(type === 'project' ? 'planned' : 'todo');
  const [priority, setPriority] = useState(type === 'project' ? 'medium' : 'normal');
  const [dueDate, setDueDate] = useState('');
  const [text, setText] = useState('');
  const [projectId, setProjectId] = useState<number | undefined>(defaultProjectId ?? projects[0]?.id);
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
    if (type === 'project') payload.description = text || null;
    else { payload.notes = text || null; payload.project_id = projectId; }
    await supabase.from(table).insert(payload);
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">
            {type === 'project' ? 'פרויקט חדש' : 'משימה חדשה'}
          </h2>
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
              <select className="input" value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))}>
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
              {saving ? 'שומר...' : 'שמור'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
