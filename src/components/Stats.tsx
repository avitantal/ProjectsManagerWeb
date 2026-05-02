import { ListChecks, Briefcase, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Project, Task } from '../lib/supabase';

interface Props {
  projects: Project[];
  tasks: Task[];
}

export function Stats({ projects, tasks }: Props) {
  const activeProjects = projects.filter(p => p.status === 'in_progress').length;
  const openTasks = tasks.filter(t => t.status !== 'done').length;
  const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;

  const items = [
    { label: 'פעילים', longLabel: 'פרויקטים פעילים', value: activeProjects, icon: Briefcase, color: 'text-orange-300' },
    { label: 'פתוחות', longLabel: 'משימות פתוחות', value: openTasks, icon: ListChecks, color: 'text-blue-300' },
    { label: 'דחופות', longLabel: 'דחופות', value: urgent, icon: AlertCircle, color: 'text-red-300' },
    { label: 'הושלמו', longLabel: 'הושלמו', value: doneTasks, icon: CheckCircle2, color: 'text-green-300' },
  ];

  return (
    <div className="flex items-center justify-between sm:justify-start sm:gap-4 gap-2 text-xs">
      {items.map(({ label, longLabel, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center gap-1.5 min-w-0">
          <Icon size={14} className={color} />
          <span className="font-semibold text-sm tabular-nums">{value}</span>
          <span className="text-muted truncate">
            <span className="sm:hidden">{label}</span>
            <span className="hidden sm:inline">{longLabel}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
