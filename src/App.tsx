import { useState, useMemo, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Plus, RefreshCw, Factory, House, LogOut, Loader2, FolderKanban, ListTodo } from 'lucide-react';
import { useProjects, useTasks, useFileCounts } from './hooks/useData';
import { useAuth } from './hooks/useAuth';
import { supabase, type Scope } from './lib/supabase';
import { Stats } from './components/Stats';
import { ProjectCard } from './components/ProjectCard';
import { TaskRow } from './components/TaskRow';
import { AddDialog } from './components/AddDialog';
import { Auth } from './components/Auth';
import { cn } from './lib/utils';

interface ScopeViewProps {
  scope: Scope;
  setScope: (s: Scope) => void;
  session: Session;
}

function ScopeView({ scope, setScope, session }: ScopeViewProps) {
  const { projects, refresh: refreshProjects } = useProjects(scope);
  const { tasks, refresh: refreshTasks } = useTasks(scope);
  const { counts: fileCounts, refresh: refreshFileCounts } = useFileCounts(scope);
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
  const [view, setView] = useState<'projects' | 'orphans'>('projects');
  const [showAdd, setShowAdd] = useState<null | 'project' | 'task'>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

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

  const filteredTasks = view === 'orphans'
    ? tasks.filter(t => !t.project_id)
    : filterProjectId === null
      ? tasks
      : tasks.filter(t => t.project_id === filterProjectId);

  const projectsById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  return (
    <>
      <header className="border-b border-border bg-bg/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3 flex items-center justify-between gap-3">
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="text-base sm:text-xl font-semibold whitespace-nowrap flex items-baseline gap-1.5 hover:opacity-80"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title={session.user.email ?? ''}
            >
              🎯 ניהול פרויקטים
              <span className="text-[10px] font-normal text-muted/70" dir="ltr">V1.02</span>
            </button>
            {menuOpen && (
              <div className="absolute top-full right-0 mt-1 min-w-[160px] card p-1 z-50 shadow-lg" role="menu">
                <button
                  onClick={() => { setMenuOpen(false); window.location.reload(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-surface text-right"
                  role="menuitem"
                >
                  <RefreshCw size={14} /> רענן
                </button>
                <button
                  onClick={() => { setMenuOpen(false); void supabase.auth.signOut(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-surface text-right"
                  role="menuitem"
                >
                  <LogOut size={14} /> התנתק
                </button>
              </div>
            )}
          </div>
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
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-2 border-t border-border/50">
          <Stats projects={projects} tasks={tasks} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-center mb-4">
          <div className="flex bg-surface rounded-lg p-1 border border-border">
            <button
              onClick={() => setView('projects')}
              className={cn('btn text-sm px-3 py-1.5', view === 'projects' ? 'bg-accent text-white' : 'text-muted hover:text-text')}
            >
              <FolderKanban size={14} /> פרויקטים
            </button>
            <button
              onClick={() => setView('orphans')}
              className={cn('btn text-sm px-3 py-1.5', view === 'orphans' ? 'bg-accent text-white' : 'text-muted hover:text-text')}
            >
              <ListTodo size={14} /> ללא פרויקט
            </button>
          </div>
        </div>

        <div className={cn('grid grid-cols-1 gap-6', view === 'projects' && 'lg:grid-cols-[1fr,1.5fr]')}>
          {view === 'projects' && (
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
          )}

          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">משימות</h2>
                {view === 'projects' && filterProjectId !== null && (
                  <button onClick={() => setFilterProjectId(null)} className="text-xs text-accent hover:underline">
                    ניקוי סינון
                  </button>
                )}
              </div>
              <button onClick={() => setShowAdd('task')} disabled={view === 'projects' && projects.length === 0} className="btn-primary text-xs disabled:opacity-50">
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
      </main>

      {showAdd && (
        <AddDialog
          scope={scope}
          type={showAdd}
          projects={projects}
          defaultProjectId={view === 'orphans' ? null : (filterProjectId ?? undefined)}
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
      <ScopeView key={scope} scope={scope} setScope={setScope} session={session} />
    </div>
  );
}
