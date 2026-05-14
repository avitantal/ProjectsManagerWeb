import { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Calendar, CalendarCheck, ChevronDown, ChevronUp, Paperclip, Pencil, RotateCcw, Trash2 } from 'lucide-react';
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
import { getProjectProgressPercent } from '../lib/projectProgress';

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
  calendarToken?: string | null;
  onCalendarAuthError?: () => void;
  onProjectSaved?: (project: Project) => Promise<void>;
  onBeforeDelete?: (project: Project) => Promise<void>;
}

export function ProjectCard({ project, scope, progress, fileCount, onChange, allowPermDelete, calendarToken, onCalendarAuthError, onProjectSaved, onBeforeDelete }: Props) {
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
  const [swipeX, setSwipeX] = useState(0);
  const SWIPE_THRESHOLD = 80;

  const swipeHandlers = useSwipeable({
    onSwiping: ({ deltaX, deltaY }) => {
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0)
        setSwipeX(Math.min(Math.abs(deltaX), 120));
    },
    onSwipedLeft: ({ absX }) => { if (absX >= SWIPE_THRESHOLD) void remove(); setSwipeX(0); },
    onSwiped: () => setSwipeX(0),
    preventScrollOnSwipe: false,
    trackMouse: false,
  });
  const activeStatusDraft = statusDraft.projectId === project.id && statusDraft.savedStatus === project.status
    ? statusDraft
    : { projectId: project.id, savedStatus: project.status, value: project.status };
  const draftStatus = activeStatusDraft.value;
  const confirmingDelete = confirmingDeleteId === project.id;
  const statusChanged = draftStatus !== project.status;
  const progressPercent = getProjectProgressPercent(project, progress);

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
    if (onBeforeDelete) await onBeforeDelete(project).catch(() => {});
    if (allowPermDelete) {
      await supabase.from(`${scope}_tasks`).delete().eq('project_id', project.id);
      await supabase.from(`${scope}_projects`).delete().eq('id', project.id);
    } else {
      await supabase.from(`${scope}_tasks`).update({ status: 'frozen' }).eq('project_id', project.id);
      await supabase.from(`${scope}_projects`).update({ status: 'frozen' }).eq('id', project.id);
    }
    setConfirmingDeleteId(null);
    onChange();
  }

  async function restore() {
    await supabase.from(`${scope}_tasks`).update({ status: 'todo' }).eq('project_id', project.id).eq('status', 'frozen');
    await supabase.from(`${scope}_projects`).update({ status: 'planned' }).eq('id', project.id);
    onChange();
    if (onProjectSaved && project.due_date) {
      await onProjectSaved({ ...project, status: 'planned' });
    }
  }

  function updateDraftStatus(status: ProjectStatus) {
    setStatusDraft({ ...activeStatusDraft, value: status });
  }

  return (
    <>
    <div className="relative overflow-hidden rounded-xl" {...swipeHandlers}>
      <div
        className="absolute inset-y-0 left-0 right-0 flex items-center justify-end px-5 bg-red-600 rounded-xl pointer-events-none"
        style={{ opacity: Math.min(swipeX / SWIPE_THRESHOLD, 1) }}
      >
        <Trash2 size={20} className="text-white" />
      </div>
      <div style={{ transform: `translateX(-${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.2s ease' : 'none' }}>
    <div className="card p-2.5 hover:border-zinc-600 transition-colors group relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-[3px] bg-accent/60 rounded-r-xl transition-all duration-500 pointer-events-none"
        style={{ height: `${progressPercent}%` }}
      />
      <div className="relative flex items-start justify-between gap-2 mb-1.5">
        <h3 className="font-medium text-text leading-tight text-sm flex items-center gap-1.5">
          {project.name}
          {project.sync_to_calendar && <span title="מסונכרן לגוגל קלנדר"><CalendarCheck size={12} className="text-accent/60 shrink-0" /></span>}
        </h3>
        {confirmingDelete ? (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => void remove()} className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[11px] text-red-200 hover:bg-red-500/30">
              {allowPermDelete ? 'מחק לצמיתות' : 'מחק'}
            </button>
            <button type="button" onClick={() => setConfirmingDeleteId(null)} className="rounded-md px-1.5 py-0.5 text-[11px] text-muted hover:bg-surface hover:text-text">
              בטל
            </button>
          </div>
        ) : allowPermDelete ? (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void restore(); }}
              className="text-muted hover:text-green-400"
              aria-label="שחזר"
              title="שחזר לפעילים"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmingDeleteId(project.id); }}
              className="text-muted hover:text-red-400"
              aria-label="מחק לצמיתות"
              title="מחק לצמיתות"
            >
              <Trash2 size={13} />
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
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmingDeleteId(project.id); }}
              className="text-muted hover:text-red-400"
              aria-label="מחק"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
      {project.description && (
        <p className="text-xs text-muted mb-1.5 leading-relaxed">{project.description}</p>
      )}
      <div className="relative flex flex-wrap items-center gap-1.5 mb-1.5">
        <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <select
            value={draftStatus}
            onChange={(e) => updateDraftStatus(e.target.value as ProjectStatus)}
            className={`chip ${PROJECT_STATUS_COLOR[draftStatus]} bg-transparent border-0 cursor-pointer text-[11px] py-0`}
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
        <span className={`chip ${PRIORITY_COLOR[project.priority]} text-[11px] py-0`}>{PRIORITY_HE[project.priority]}</span>
        {project.due_date && (
          <span className={`flex items-center gap-1 text-[11px] ${overdue ? 'text-red-400' : 'text-muted'}`}>
            <Calendar size={11} />
            {formatDate(project.due_date)}
            {days !== null && (
              <span className="opacity-75">
                ({overdue ? `איחור ${Math.abs(days)} ימים` : days === 0 ? 'היום' : `עוד ${days} ימים`})
              </span>
            )}
          </span>
        )}
      </div>
      <div className="relative flex items-center justify-between text-[10px] text-muted gap-2">
        <span className="shrink-0">
          {progress.total > 0 ? `${progress.completed} מתוך ${progress.total} משימות` : 'אין משימות'}
          {progress.total > 0 && <span className="opacity-60 mr-1">({progressPercent}%)</span>}
        </span>
        <span className="text-purple-400/60 flex flex-wrap gap-x-1.5 justify-end">
          <span>נפתח {formatDateTime(project.created_at)}</span>
          {project.closed_at && <span>· נסגר {formatDateTime(project.closed_at)}</span>}
          <span>· ⏱ {formatLifetime(project.created_at, project.closed_at)}</span>
        </span>
      </div>

      {fileCount > 0 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowFiles((v) => !v); }}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted hover:text-text"
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

    </div>
      </div>
    </div>
    {editing && (
      <AddDialog
        scope={scope}
        type="project"
        projects={[]}
        editing={project}
        onClose={() => setEditing(false)}
        onSaved={onChange}
        onProjectSaved={onProjectSaved}
        calendarToken={calendarToken}
        onCalendarAuthError={onCalendarAuthError}
      />
    )}
    </>
  );
}
