import { useState, useMemo } from 'react';
import { Plus, RefreshCw, Factory, House, LogOut, Loader2 } from 'lucide-react';
import { useProjects, useTasks, useFileCounts } from './hooks/useData';
import { useAuth } from './hooks/useAuth';
import { supabase, type Scope } from './lib/supabase';
import { Stats } from './components/Stats';
import { ProjectCard } from './components/ProjectCard';
import { TaskRow } from './components/TaskRow';
import { AddDialog } from './components/AddDialog';
import { Auth } from './components/Auth';
import { cn } from './lib/utils';

function ScopeView({ scope }: { scope: Scope }) {
  const { projects, refresh: refreshProjects } = useProjects(scope);
  const { tasks, refresh: refreshTasks } = useTasks(scope);
  const { counts: fileCounts, refresh: refreshFileCounts } = useFileCounts(scope);
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState<null | 'project' | 'task'>(null);

  function refreshAll() { refreshProjects(); refreshTasks(); refreshFileCounts(); }

  const projectProgress = useMemo(() => {
    const m = new Map<number, { completed: number; total: number }>();
    tasks.forEach(t => {
      if (!t.project_id) return;
      const current = m.get(t.project_id) ?? { completed: 0, total: 0 };
      current.total += 1;
      if (t.status === 'done') current.completed += 1;
      m.set(t.project_id, current);
    });
    return m;
  }, [tasks]);

  const filteredTasks = filterProjectId === null
    ? tasks
    : tasks.filter(t => t.project_id === filterProjectId);

  const projectsById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  return (
    <>
      <Stats projects={projects} tasks={tasks} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,1.5fr] gap-6">
        {/* Projects column */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">פרויקטים</h2>
            <button onClick={() => setShowAdd('project')} className="btn-primary text-xs">
              <Plus size={14} /> הוסף
            </button>
          </div>
          <div className="space-y-3">
            {projects.length === 0 && (
              <div className="card p-6 text-center text-muted text-sm">אין פרויקטים עדיין</div>
            )}
            {projects.map(p => (
              <div key={p.id} onClick={() => setFilterProjectId(filterProjectId === p.id ? null : p.id)}
                   className={cn('cursor-pointer', filterProjectId === p.id && 'ring-1 ring-accent rounded-xl')}>
                <ProjectCard project={p} scope={scope} progress={projectProgress.get(p.id) ?? { completed: 0, total: 0 }} fileCount={fileCounts.get(p.id) ?? 0} onChange={refreshAll} />
              </div>
            ))}
          </div>
        </section>

        {/* Tasks column */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">משימות</h2>
              {filterProjectId !== null && (
                <button onClick={() => setFilterProjectId(null)} className="text-xs text-accent hover:underline">
                  ניקוי סינון
                </button>
              )}
            </div>
            <button onClick={() => setShowAdd('task')} disabled={projects.length === 0} className="btn-primary text-xs disabled:opacity-50">
              <Plus size={14} /> הוסף
            </button>
          </div>
          <div className="space-y-2">
            {filteredTasks.length === 0 && (
              <div className="card p-6 text-center text-muted text-sm">אין משימות</div>
            )}
            {filteredTasks.map(t => (
              <TaskRow key={t.id} task={t} project={t.project_id ? projectsById.get(t.project_id) : undefined} projects={projects} scope={scope} onChange={refreshAll} />
            ))}
          </div>
        </section>
      </div>

      {showAdd && (
        <AddDialog
          scope={scope}
          type={showAdd}
          projects={projects}
          defaultProjectId={filterProjectId ?? undefined}
          onClose={() => setShowAdd(null)}
          onSaved={refreshAll}
        />
      )}
    </>
  );
}

export default function App() {
  const { session, loading } = useAuth();
  const [scope, setScope] = useState<Scope>('factory');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-muted" size={24} /></div>;
  }
  if (!session) return <Auth />;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-bg/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">🎯 ניהול פרויקטים</h1>
          <div className="flex items-center gap-2">
            <div className="flex bg-surface rounded-lg p-1 border border-border">
              <button
                onClick={() => setScope('factory')}
                className={cn('btn text-sm px-3 py-1.5', scope === 'factory' ? 'bg-accent text-white' : 'text-muted hover:text-text')}
              >
                <Factory size={14} /> מפעל
              </button>
              <button
                onClick={() => setScope('personal')}
                className={cn('btn text-sm px-3 py-1.5', scope === 'personal' ? 'bg-accent text-white' : 'text-muted hover:text-text')}
              >
                <House size={14} /> אישי
              </button>
            </div>
            <button onClick={() => window.location.reload()} className="btn-ghost" aria-label="רענן">
              <RefreshCw size={16} />
            </button>
            <button onClick={() => supabase.auth.signOut()} className="btn-ghost" aria-label="התנתק" title={session.user.email ?? ''}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <ScopeView key={scope} scope={scope} />
      </main>
    </div>
  );
}
