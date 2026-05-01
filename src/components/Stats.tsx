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
    { label: 'פרויקטים פעילים', value: activeProjects, icon: Briefcase, color: 'text-orange-300' },
    { label: 'משימות פתוחות', value: openTasks, icon: ListChecks, color: 'text-blue-300' },
    { label: 'דחופות', value: urgent, icon: AlertCircle, color: 'text-red-300' },
    { label: 'הושלמו', value: doneTasks, icon: CheckCircle2, color: 'text-green-300' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="card p-4 flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-bg ${color}`}><Icon size={20} /></div>
          <div>
            <div className="text-2xl font-semibold">{value}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
