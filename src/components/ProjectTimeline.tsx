import { useState } from 'react';
import type { Project, Task } from '../lib/supabase';

const COLORS = [
  '#3b82f6','#a855f7','#ec4899','#f59e0b',
  '#10b981','#06b6d4','#ef4444','#6366f1',
  '#f97316','#14b8a6',
];

interface Props {
  project: Project;
  tasks: Task[];
}

export function ProjectTimeline({ project, tasks }: Props) {
  const [activeId, setActiveId] = useState<number | null>(null);

  if (!project.due_date) return null;

  const start  = new Date(project.created_at).getTime();
  const end    = new Date(project.due_date).getTime();
  const now    = Date.now();
  const range  = end - start || 1;
  const nowPct = Math.min(100, Math.max(0, (now - start) / range * 100));

  const items = tasks.map((t, i) => ({
    task:  t,
    num:   i + 1,
    color: COLORS[i % COLORS.length],
    pct:   t.due_date
      ? Math.min(92, Math.max(4, (new Date(t.due_date).getTime() - start) / range * 100))
      : null,
  }));

  const onAxis  = items.filter(x => x.pct !== null);
  const offAxis = items.filter(x => x.pct === null);

  return (
    <div className="mt-3 px-1" onClick={e => e.stopPropagation()}>
      {/* axis */}
      <div className="relative h-8" dir="ltr">
        <div className="absolute inset-x-0 top-1/2 h-px bg-border -translate-y-1/2" />

        {/* today marker */}
        {nowPct >= 0 && nowPct <= 100 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-accent/50"
            style={{ left: `${nowPct}%` }}
            title="היום"
          />
        )}

        {onAxis.map(({ task, num, color, pct }) => (
          <div
            key={task.id}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10"
            style={{ left: `${pct!}%` }}
            onClick={() => setActiveId(activeId === task.id ? null : task.id)}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow"
              style={{ backgroundColor: color }}
            >
              {num}
            </div>
            {activeId === task.id && (
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-bg border border-border rounded-lg px-2.5 py-1.5 text-[11px] whitespace-nowrap shadow-xl z-20">
                <div className="font-medium mb-0.5">{task.name}</div>
                <div className="text-muted">{task.due_date ?? 'ללא תאריך'}</div>
              </div>
            )}
          </div>
        ))}

        {/* start / end labels */}
        <span className="absolute left-0 top-full mt-1 text-[9px] text-muted/50 select-none" dir="ltr">
          {new Date(project.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
        </span>
        <span className="absolute right-0 top-full mt-1 text-[9px] text-muted/50 select-none" dir="ltr">
          {new Date(project.due_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
        </span>
      </div>

      {/* tasks without due_date */}
      {offAxis.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {offAxis.map(({ task, num, color }) => (
            <div
              key={task.id}
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => setActiveId(activeId === task.id ? null : task.id)}
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white opacity-60"
                style={{ backgroundColor: color }}
              >
                {num}
              </div>
              {activeId === task.id && (
                <span className="text-[10px] text-muted">{task.name}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
