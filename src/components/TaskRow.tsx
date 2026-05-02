import { useState } from 'react';
import { Check, Sparkles, Trash2 } from 'lucide-react';
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
import { formatDate, daysUntil } from '../lib/utils';
import { InlineChangeActions } from './InlineChangeActions';

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
  scope: Scope;
  onChange: () => void;
}

export function TaskRow({ task, project, scope, onChange }: Props) {
  const [draft, setDraft] = useState<TaskDraft>(() => ({
    taskId: task.id,
    savedStatus: task.status,
    savedPriority: task.priority,
    status: task.status,
    priority: task.priority,
  }));
  const [savingChanges, setSavingChanges] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
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

  async function saveChanges() {
    setSavingChanges(true);
    try {
      await supabase
        .from(`${scope}_tasks`)
        .update({ status: draftStatus, priority: draftPriority })
        .eq('id', task.id);
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
    <div className={`card p-3 transition-colors group flex flex-col gap-3 sm:flex-row sm:items-center ${
      suggested
        ? 'bg-purple-500/10 border-dashed border-purple-500/40 hover:border-purple-400/60'
        : 'hover:border-zinc-600'
    }`}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <input
          type="checkbox"
          checked={draftStatus === 'done'}
          onChange={(e) => updateDraft({ status: e.target.checked ? 'done' : 'todo' })}
          disabled={savingChanges}
          className="w-4 h-4 accent-accent shrink-0"
          aria-label="סמן כהושלם"
        />
        <div className="flex-1 min-w-0">
          <div className={`text-sm leading-tight flex items-center gap-1.5 ${draftStatus === 'done' ? 'line-through text-muted' : ''}`}>
            {suggested && <Sparkles size={12} className="text-purple-400 shrink-0" />}
            <span className="truncate">{task.name}</span>
            {suggested && <span className="chip bg-purple-500/20 text-purple-300 text-[10px] shrink-0">מוצע ע״י AI</span>}
          </div>
          {project && (
            <div className="text-xs text-muted mt-0.5 truncate">{project.name}</div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
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
          {Object.entries(TASK_STATUS_HE).map(([k, v]) => (
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
        {confirmingDelete ? (
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => void remove()} className="rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-200 hover:bg-red-500/30">
              מחק
            </button>
            <button type="button" onClick={() => setConfirmingDeleteId(null)} className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface hover:text-text">
              בטל
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDeleteId(task.id)}
            className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition"
            aria-label="מחק"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
