import { useState, useEffect } from 'react';
import { Check, Pencil, RotateCcw, Sparkles, Trash2, NotebookPen } from 'lucide-react';
import {
  type Task,
  type TaskStatus,
  type TaskPriority,
  type Project,
  type Scope,
  supabase,
  TASK_STATUS_HE,
  TASK_STATUS_COLOR,
  TASK_PRIORITY_HE,
  TASK_PRIORITY_COLOR,
} from '../lib/supabase';
import { formatDate, formatDateTime, formatLifetime, daysUntil } from '../lib/utils';
import { InlineChangeActions } from './InlineChangeActions';
import { AddDialog } from './AddDialog';

interface TaskDraft {
  taskId: number;
  savedStatus: TaskStatus;
  savedPriority: TaskPriority;
  status: TaskStatus;
  priority: TaskPriority;
}

interface Props {
  task: Task;
  project?: Project;
  projects: Project[];
  scope: Scope;
  onChange: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  isLastClosed?: boolean;
}

export function TaskRow({ task, project, projects, scope, onChange, isSelected, onSelect, isLastClosed }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(() => ({
    taskId: task.id,
    savedStatus: task.status,
    savedPriority: task.priority,
    status: task.status,
    priority: task.priority,
  }));
  const [savingChanges, setSavingChanges] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState(task.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    if (!isSelected) setEditingNotes(false);
  }, [isSelected]);
  const activeDraft = draft.taskId === task.id && draft.savedStatus === task.status && draft.savedPriority === task.priority
    ? draft
    : {
        taskId: task.id,
        savedStatus: task.status,
        savedPriority: task.priority,
        status: task.status,
        priority: task.priority,
      };
  const draftStatus = activeDraft.status;
  const draftPriority = activeDraft.priority;
  const confirmingDelete = confirmingDeleteId === task.id;
  const days = daysUntil(task.due_date);
  const overdue = days !== null && days < 0 && draftStatus !== 'done';
  const hasChanges = draftStatus !== task.status || draftPriority !== task.priority;

  async function toggleDone(checked: boolean) {
    setSavingChanges(true);
    try {
      const newStatus: TaskStatus = checked ? 'done' : 'todo';
      const update: Record<string, unknown> = { status: newStatus };
      if (checked && task.status !== 'done') update.closed_at = new Date().toISOString();
      else if (!checked && task.status === 'done') update.closed_at = null;
      await supabase.from(`${scope}_tasks`).update(update).eq('id', task.id);
      onChange();
    } finally {
      setSavingChanges(false);
    }
  }

  async function saveChanges() {
    setSavingChanges(true);
    try {
      const update: Record<string, unknown> = { status: draftStatus, priority: draftPriority };
      if (draftStatus === 'done' && task.status !== 'done') update.closed_at = new Date().toISOString();
      else if (draftStatus !== 'done' && task.status === 'done') update.closed_at = null;
      await supabase.from(`${scope}_tasks`).update(update).eq('id', task.id);
      onChange();
    } finally {
      setSavingChanges(false);
    }
  }

  async function remove() {
    await supabase.from(`${scope}_tasks`).delete().eq('id', task.id);
    setConfirmingDeleteId(null);
    onChange();
  }

  async function restore() {
    await supabase.from(`${scope}_tasks`).update({ status: 'todo' }).eq('id', task.id);
    onChange();
  }

  async function saveNotes() {
    if (notesDraft === (task.notes ?? '')) return;
    setSavingNotes(true);
    await supabase.from(`${scope}_tasks`).update({ notes: notesDraft || null }).eq('id', task.id);
    setSavingNotes(false);
    onChange();
  }

  async function approveSuggested() {
    await supabase.from(`${scope}_tasks`).update({ is_suggested: false }).eq('id', task.id);
    onChange();
  }

  function cancelChanges() {
    setDraft({ ...activeDraft, status: task.status, priority: task.priority });
  }

  function updateDraft(next: Partial<Pick<TaskDraft, 'status' | 'priority'>>) {
    setDraft({ ...activeDraft, ...next });
  }

  const suggested = task.is_suggested;

  return (
    <div
      className={`card p-3 transition-colors group flex flex-col gap-2 ${
        suggested
          ? 'bg-purple-500/10 border-dashed border-purple-500/40 hover:border-purple-400/60'
          : isSelected ? 'border-accent/60' : 'hover:border-zinc-600'
      }`}
      onClick={() => onSelect?.()}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-row">
        <input
          type="checkbox"
          onClick={e => e.stopPropagation()}
          checked={draftStatus === 'done'}
          onChange={(e) => void toggleDone(e.target.checked)}
          disabled={savingChanges}
          className="w-4 h-4 accent-accent shrink-0"
          aria-label="סמן כהושלם"
        />
        <div className="flex-1 min-w-0">
          {project && (
            <div className="text-[10px] font-semibold text-accent/80 mb-0.5 truncate uppercase tracking-wide">{project.name}</div>
          )}
          <div className={`text-sm leading-tight flex items-center gap-1.5 ${draftStatus === 'done' ? 'line-through text-muted' : ''}`}>
            {suggested && <Sparkles size={12} className="text-purple-400 shrink-0" />}
            <span className="truncate">{task.name}</span>
            {suggested && <span className="chip bg-purple-500/20 text-purple-300 text-[10px] shrink-0">מוצע ע״י AI</span>}
            {task.notes && !isSelected && <NotebookPen size={11} className="text-muted/50 shrink-0" />}
          </div>
          <div className="text-[10px] text-purple-400/70 mt-0.5 flex flex-wrap gap-x-2">
            <span title={formatDateTime(task.created_at)}>נפתח {formatDateTime(task.created_at)}</span>
            {task.closed_at && (!task.project_id || isLastClosed) && (
              <span title={formatDateTime(task.closed_at)}>· נסגר {formatDateTime(task.closed_at)}</span>
            )}
            <span>· ⏱ {formatLifetime(task.created_at, task.closed_at)}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 shrink-0" onClick={e => e.stopPropagation()}>
        {task.due_date && (
          <span className={`text-xs ${overdue ? 'text-red-400' : 'text-muted'}`}>{formatDate(task.due_date)}</span>
        )}
        <select
          value={draftPriority}
          onChange={(e) => updateDraft({ priority: e.target.value as TaskPriority })}
          disabled={savingChanges}
          className={`chip ${TASK_PRIORITY_COLOR[draftPriority]} bg-transparent border-0 cursor-pointer text-xs disabled:cursor-not-allowed`}
        >
          {Object.entries(TASK_PRIORITY_HE).map(([k, v]) => (
            <option key={k} value={k} className="bg-surface text-text">{v}</option>
          ))}
        </select>
        <select
          value={draftStatus}
          onChange={(e) => updateDraft({ status: e.target.value as TaskStatus })}
          disabled={savingChanges}
          className={`chip ${TASK_STATUS_COLOR[draftStatus]} bg-transparent border-0 cursor-pointer text-xs disabled:cursor-not-allowed`}
        >
          {Object.entries(TASK_STATUS_HE).filter(([k]) => k !== 'frozen').map(([k, v]) => (
            <option key={k} value={k} className="bg-surface text-text">{v}</option>
          ))}
        </select>
        {hasChanges && (
          <InlineChangeActions
            saving={savingChanges}
            onSave={() => void saveChanges()}
            onCancel={cancelChanges}
          />
        )}
        {suggested && (
          <button
            type="button"
            onClick={() => void approveSuggested()}
            className="rounded-md bg-green-500/20 px-2 py-1 text-xs text-green-300 hover:bg-green-500/30 inline-flex items-center gap-1"
            title="אשר משימה"
          >
            <Check size={12} />
            אשר
          </button>
        )}
        {task.status === 'frozen' ? (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              type="button"
              onClick={() => void restore()}
              className="text-muted hover:text-green-400"
              aria-label="שחזר"
              title="שחזר לפעילות"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        ) : confirmingDelete ? (
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => void remove()} className="rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-200 hover:bg-red-500/30">
              מחק
            </button>
            <button type="button" onClick={() => setConfirmingDeleteId(null)} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface hover:text-text">
              בטל
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-muted hover:text-accent"
              aria-label="ערוך"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDeleteId(task.id)}
              className="text-muted hover:text-red-400"
              aria-label="מחק"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {isSelected && (
        <div className="pt-2 border-t border-border/50" onClick={e => e.stopPropagation()}>
          {editingNotes || !task.notes ? (
            <>
              <textarea
                className="input w-full min-h-[72px] text-sm resize-none"
                placeholder="הוסף הערות..."
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                onBlur={() => { void saveNotes(); setEditingNotes(false); }}
                autoFocus
                dir="rtl"
              />
              {savingNotes && <span className="text-[10px] text-muted">שומר...</span>}
            </>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-text/80 whitespace-pre-wrap leading-relaxed flex-1" dir="rtl">{task.notes}</p>
              <button
                onClick={() => setEditingNotes(true)}
                className="text-muted hover:text-accent shrink-0 mt-0.5"
                aria-label="ערוך הערות"
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <AddDialog
          scope={scope}
          type="task"
          projects={projects}
          editing={task}
          onClose={() => setEditing(false)}
          onSaved={onChange}
        />
      )}
    </div>
  );
}
