import { Calendar, Trash2 } from 'lucide-react';
import { type Project, PROJECT_STATUS_HE, PROJECT_STATUS_COLOR, PRIORITY_HE, PRIORITY_COLOR, supabase, type Scope } from '../lib/supabase';
import { formatDate, daysUntil } from '../lib/utils';

interface Props {
  project: Project;
  scope: Scope;
  taskCount: number;
  onChange: () => void;
}

export function ProjectCard({ project, scope, taskCount, onChange }: Props) {
  const days = daysUntil(project.due_date);
  const overdue = days !== null && days < 0;

  async function updateStatus(status: string) {
    await supabase.from(`${scope}_projects`).update({ status }).eq('id', project.id);
    onChange();
  }

  async function remove() {
    if (!confirm(`למחוק את "${project.name}" ואת כל המשימות שלו?`)) return;
    await supabase.from(`${scope}_projects`).delete().eq('id', project.id);
    onChange();
  }

  return (
    <div className="card p-4 hover:border-zinc-600 transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-text leading-tight">{project.name}</h3>
        <button onClick={remove} className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition" aria-label="מחק">
          <Trash2 size={16} />
        </button>
      </div>
      {project.description && (
        <p className="text-sm text-muted mb-3 leading-relaxed">{project.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select
          value={project.status}
          onChange={(e) => updateStatus(e.target.value)}
          className={`chip ${PROJECT_STATUS_COLOR[project.status]} bg-transparent border-0 cursor-pointer`}
        >
          {Object.entries(PROJECT_STATUS_HE).map(([k, v]) => (
            <option key={k} value={k} className="bg-surface text-text">{v}</option>
          ))}
        </select>
        <span className={`chip ${PRIORITY_COLOR[project.priority]}`}>{PRIORITY_HE[project.priority]}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{taskCount} משימות</span>
        {project.due_date && (
          <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}>
            <Calendar size={12} />
            {formatDate(project.due_date)}
            {days !== null && (
              <span className="opacity-75">
                ({overdue ? `איחור ${Math.abs(days)} ימים` : days === 0 ? 'היום' : `עוד ${days} ימים`})
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
