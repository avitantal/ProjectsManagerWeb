import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Paperclip, Pencil, Trash2 } from 'lucide-react';
import { ProjectFiles } from './ProjectFiles';
import { AddDialog } from './AddDialog';
import {
  type Project,
  type ProjectStatus,
  PROJECT_STATUS_HE,
  PROJECT_STATUS_COLOR,
  PRIORITY_HE,
  PRIORITY_COLOR,
  supabase,
  type Scope,
} from '../lib/supabase';
import { formatDate, formatDateTime, formatLifetime, daysUntil } from '../lib/utils';
import { InlineChangeActions } from './InlineChangeActions';

interface StatusDraft {
  projectId: number;
  savedStatus: ProjectStatus;
  value: ProjectStatus;
}

interface Props {
  project: Project;
  scope: Scope;
  progress: {
    completed: number;
    total: number;
  };
  fileCount: number;
  onChange: () => void;
  allowPermDelete?: boolean;
}

export function ProjectCard({ project, scope, progress, fileCount, onChange, allowPermDelete }: Props) {
  const days = daysUntil(project.due_date);
  const overdue = days !== null && days < 0;
  const [statusDraft, setStatusDraft] = useState<StatusDraft>(() => ({
    projectId: project.id,
    savedStatus: project.status,
    value: project.status,
  }));
  const [savingStatus, setSavingStatus] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [showFiles, setShowFiles] = useState(false);
  const [editing, setEditing] = useState(false);
  const activeStatusDraft = statusDraft.projectId === project.id && statusDraft.savedStatus === project.status
    ? statusDraft
    : { projectId: project.id, savedStatus: project.status, value: project.status };
  const draftStatus = activeStatusDraft.value;
  const confirmingDelete = confirmingDeleteId === project.id;
  const statusChanged = draftStatus !== project.status;
  const progressPercent = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : project.status === 'done' ? 100 : 0;

  async function saveStatus() {
    setSavingStatus(true);
    try {
      const update: Record<string, unknown> = { status: draftStatus };
      if (draftStatus === 'done' && project.status !== 'done') update.closed_at = new Date().toISOString();
      else if (draftStatus !== 'done' && project.status === 'done') update.closed_at = null;
      await supabase.from(`${scope}_projects`).update(update).eq('id', project.id);
      onChange();
    } finally {
      setSavingStatus(false);
    }
  }

  async function remove() {
    if (allowPermDelete) {
      await supabase.from(`${scope}_projects`).delete().eq('id', project.id);
    } else {
      await supabase.from(`${scope}_projects`).update({ status: 'frozen' }).eq('id', project.id);
    }
    setConfirmingDeleteId(null);
    onChange();
  }

  function updateDraftStatus(status: ProjectStatus) {
    setStatusDraft({ ...activeStatusDraft, value: status });
  }

  return (
    <div className="card p-4 hover:border-zinc-600 transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-text leading-tight">{project.name}</h3>
        {confirmingDelete ? (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => void remove()} className="rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-200 hover:bg-red-500/30">
              {allowPermDelete ? 'מחק לצמיתות' : 'מחק'}
            </button>
            <button type="button" onClick={() => setConfirmingDeleteId(null)} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface hover:text-text">
              בטל
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="text-muted hover:text-accent"
              aria-label="ערוך"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmingDeleteId(project.id); }}
              className="text-muted hover:text-red-400"
              aria-label="מחק"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      {project.description && (
        <p className="text-sm text-muted mb-3 leading-relaxed">{project.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <select
            value={draftStatus}
            onChange={(e) => updateDraftStatus(e.target.value as ProjectStatus)}
            className={`chip ${PROJECT_STATUS_COLOR[draftStatus]} bg-transparent border-0 cursor-pointer`}
          >
            {Object.entries(PROJECT_STATUS_HE).map(([k, v]) => (
              <option key={k} value={k} className="bg-surface text-text">{v}</option>
            ))}
          </select>
          {statusChanged && (
            <InlineChangeActions
              saving={savingStatus}
              onSave={() => void saveStatus()}
              onCancel={() => setStatusDraft({ ...activeStatusDraft, value: project.status })}
            />
          )}
        </div>
        <span className={`chip ${PRIORITY_COLOR[project.priority]}`}>{PRIORITY_HE[project.priority]}</span>
      </div>
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted">
          <span>התקדמות</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full border border-border bg-bg">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-muted">
          {progress.total > 0 ? `${progress.completed}/${progress.total} משימות הושלמו` : 'אין משימות בפרויקט'}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{progress.total} משימות</span>
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

      <div className="mt-2 text-[10px] text-purple-400/70 flex flex-wrap gap-x-2">
        <span>נפתח {formatDateTime(project.created_at)}</span>
        {project.closed_at && <span>· נסגר {formatDateTime(project.closed_at)}</span>}
        <span>· ⏱ {formatLifetime(project.created_at, project.closed_at)}</span>
      </div>

      {fileCount > 0 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowFiles((v) => !v); }}
            className="mt-3 inline-flex items-center gap-1 text-xs text-muted hover:text-text"
          >
            <Paperclip size={12} />
            קבצים ({fileCount})
            {showFiles ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showFiles && (
            <ProjectFiles scope={scope} projectId={project.id} />
          )}
        </>
      )}

      {editing && (
        <div onClick={(e) => e.stopPropagation()}>
          <AddDialog
            scope={scope}
            type="project"
            projects={[]}
            editing={project}
            onClose={() => setEditing(false)}
            onSaved={onChange}
          />
        </div>
      )}
    </div>
  );
}
