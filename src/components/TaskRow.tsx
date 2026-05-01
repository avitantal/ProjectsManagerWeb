import { Trash2 } from 'lucide-react';
import { type Task, type Project, type Scope, supabase, TASK_STATUS_HE, TASK_STATUS_COLOR, TASK_PRIORITY_HE, TASK_PRIORITY_COLOR } from '../lib/supabase';
import { formatDate, daysUntil } from '../lib/utils';

interface Props {
  task: Task;
  project?: Project;
  scope: Scope;
  onChange: () => void;
}

export function TaskRow({ task, project, scope, onChange }: Props) {
  const days = daysUntil(task.due_date);
  const overdue = days !== null && days < 0 && task.status !== 'done';

  async function updateStatus(status: string) {
    await supabase.from(`${scope}_tasks`).update({ status }).eq('id', task.id);
    onChange();
  }
  async function remove() {
    await supabase.from(`${scope}_tasks`).delete().eq('id', task.id);
    onChange();
  }

  return (
    <div className="card p-3 hover:border-zinc-600 transition-colors group flex items-center gap-3">
      <input
        type="checkbox"
        checked={task.status === 'done'}
        onChange={(e) => updateStatus(e.target.checked ? 'done' : 'todo')}
        className="w-4 h-4 accent-accent shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className={`text-sm leading-tight ${task.status === 'done' ? 'line-through text-muted' : ''}`}>
          {task.name}
        </div>
        {project && (
          <div className="text-xs text-muted mt-0.5 truncate">{project.name}</div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task.due_date && (
          <span className={`text-xs ${overdue ? 'text-red-400' : 'text-muted'}`}>{formatDate(task.due_date)}</span>
        )}
        <select
          value={task.priority}
          onChange={(e) => supabase.from(`${scope}_tasks`).update({ priority: e.target.value }).eq('id', task.id).then(onChange)}
          className={`chip ${TASK_PRIORITY_COLOR[task.priority]} bg-transparent border-0 cursor-pointer text-xs`}
        >
          {Object.entries(TASK_PRIORITY_HE).map(([k, v]) => (
            <option key={k} value={k} className="bg-surface text-text">{v}</option>
          ))}
        </select>
        <select
          value={task.status}
          onChange={(e) => updateStatus(e.target.value)}
          className={`chip ${TASK_STATUS_COLOR[task.status]} bg-transparent border-0 cursor-pointer text-xs`}
        >
          {Object.entries(TASK_STATUS_HE).map(([k, v]) => (
            <option key={k} value={k} className="bg-surface text-text">{v}</option>
          ))}
        </select>
        <button onClick={remove} className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition" aria-label="מחק">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
