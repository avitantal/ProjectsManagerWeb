import { useState, useMemo, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Plus, RefreshCw, Factory, House, LogOut, Loader2, FolderKanban, ListTodo, CheckCircle2, Archive } from 'lucide-react';
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
  type View = 'projects' | 'orphans' | 'done' | 'frozen';
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
  const [view, setView] = useState<View>(
    () => (localStorage.getItem(`view:${scope}`) as View) ?? 'projects',
  );

  function setViewPersisted(v: View) {
    localStorage.setItem(`view:${scope}`, v);
    setView(v);
    setFilterProjectId(null);
  }
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

  const activeProjects = useMemo(() => projects.filter(p => p.status !== 'done' && p.status !== 'frozen'), [projects]);
  const doneProjects   = useMemo(() => projects.filter(p => p.status === 'done'), [projects]);
  const frozenProjects = useMemo(() => projects.filter(p => p.status === 'frozen'), [projects]);

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);
  const doneTasks   = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);

  const visibleProjects = view === 'done' ? doneProjects : view === 'frozen' ? frozenProjects : activeProjects;
  const visibleTasks =
    view === 'done'    ? doneTasks :
    view === 'frozen'  ? [] :
    view === 'orphans' ? activeTasks.filter(t => !t.project_id) :
    filterProjectId !== null ? activeTasks.filter(t => t.project_id === filterProjectId) :
    activeTasks;

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
              <span className="text-[10px] font-normal text-muted/70" dir="ltr">V1.07</span>
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
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="flex bg-surface rounded-lg p-1 border border-border">
            <button
              onClick={() => setViewPersisted('projects')}
              className={cn('btn text-sm px-3 py-1.5', view === 'projects' ? 'bg-accent text-white' : 'text-muted hover:text-text')}
            >
              <FolderKanban size={14} /> פרויקטים
            </button>
            <button
              onClick={() => setViewPersisted('orphans')}
              className={cn('btn text-sm px-3 py-1.5', view === 'orphans' ? 'bg-accent text-white' : 'text-muted hover:text-text')}
            >
              <ListTodo size={14} /> ללא פרויקט
            </button>
          </div>
          <div className="flex items-center gap-3">
            {([
              { id: 'done'   as const, icon: CheckCircle2, label: 'הושלמו', badge: doneTasks.length + doneProjects.length },
              { id: 'frozen' as const, icon: Archive,      label: 'נגנזו',  badge: frozenProjects.length },
            ]).map(({ id, icon: Icon, label, badge }) => (
              <button key={id}
                onClick={() => setViewPersisted(id)}
                className={cn('flex items-center gap-1 text-xs transition-colors', view === id ? 'text-accent' : 'text-muted/60 hover:text-muted')}
              >
                <Icon size={12} />
                {label}
                {badge > 0 && (
                  <span className={cn('text-[10px] rounded-full px-1.5 leading-5 font-semibold', view === id ? 'bg-accent/20 text-accent' : 'bg-surface text-muted')}>{badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const isActive = view === 'projects' || view === 'orphans';
          const showProjectsCol = view === 'projects' || view === 'done' || view === 'frozen';
          const showTasksCol = view !== 'frozen';
          const projectsHeading = view === 'done' ? 'פרויקטים שהושלמו' : view === 'frozen' ? 'פרויקטים נגנזים' : 'פרויקטים';
          const tasksHeading = view === 'done' ? 'משימות שהושלמו' : 'משימות';

          return (
            <div className={cn('grid grid-cols-1 gap-6', showProjectsCol && showTasksCol && 'lg:grid-cols-[1fr,1.5fr]')}>
              {showProjectsCol && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">{projectsHeading}</h2>
                    {isActive && (
                      <button onClick={() => setShowAdd('project')} className="btn-primary text-xs">
                        <Plus size={14} /> הוסף
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {visibleProjects.length === 0 && (
                      <div className="card p-6 text-center text-muted text-sm">אין פרויקטים</div>
                    )}
                    {visibleProjects.map(p => (
                      <div key={p.id}
                           onClick={() => view === 'projects' && setFilterProjectId(filterProjectId === p.id ? null : p.id)}
                           className={cn(view === 'projects' && 'cursor-pointer', filterProjectId === p.id && 'ring-1 ring-accent rounded-xl')}>
                        <ProjectCard project={p} scope={scope} progress={projectProgress.get(p.id) ?? { completed: 0, total: 0 }} fileCount={fileCounts.get(p.id) ?? 0} onChange={refreshAll} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {showTasksCol && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{tasksHeading}</h2>
                      {view === 'projects' && filterProjectId !== null && (
                        <button onClick={() => setFilterProjectId(null)} className="text-xs text-accent hover:underline">ניקוי סינון</button>
                      )}
                    </div>
                    {isActive && (
                      <button onClick={() => setShowAdd('task')} disabled={view === 'projects' && activeProjects.length === 0} className="btn-primary text-xs disabled:opacity-50">
                        <Plus size={14} /> הוסף
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {visibleTasks.length === 0 && (
                      <div className="card p-6 text-center text-muted text-sm">אין משימות</div>
                    )}
                    {visibleTasks.map(t => (
                      <TaskRow key={t.id} task={t} project={t.project_id ? projectsById.get(t.project_id) : undefined} projects={projects} scope={scope} onChange={refreshAll} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          );
        })()}
      </main>

      {showAdd && (
        <AddDialog
          scope={scope}
          type={showAdd}
          projects={projects}
          defaultProjectId={view === 'orphans' || view === 'done' ? null : (filterProjectId ?? undefined)}
          onClose={() => setShowAdd(null)}
          onSaved={refreshAll}
        />
      )}
    </>
  );
}

export default function App() {
  const { session, loading } = useAuth();
  const [scope, setScope] = useState<Scope>(
    () => (localStorage.getItem('scope') as Scope) ?? 'factory',
  );

  function setScopePersisted(s: Scope) {
    localStorage.setItem('scope', s);
    setScope(s);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-muted" size={24} /></div>;
  }
  if (!session) return <Auth />;

  return (
    <div className="min-h-screen">
      <ScopeView key={scope} scope={scope} setScope={setScopePersisted} session={session} />
    </div>
  );
}
