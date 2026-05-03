import { useState, useMemo, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Plus, RefreshCw, Factory, House, LogOut, Loader2, FolderKanban, ListTodo, CheckCircle2, Archive } from 'lucide-react';
import { useProjects, useTasks, useFileCounts } from './hooks/useData';
import { useAuth } from './hooks/useAuth';
import { supabase, type Scope, type Task, type Project } from './lib/supabase';
import { Stats } from './components/Stats';
import { ProjectCard } from './components/ProjectCard';
import { TaskRow } from './components/TaskRow';
import { AddDialog } from './components/AddDialog';
import { ProjectTimeline } from './components/ProjectTimeline';
import { Auth } from './components/Auth';
import { cn } from './lib/utils';

type TaskSort    = 'priority' | 'newest' | 'oldest' | 'due_asc';
type ProjectSort = 'priority' | 'newest' | 'oldest' | 'due_asc';

function sortedTasks(tasks: Task[], sort: TaskSort) {
  return [...tasks].sort((a, b) => {
    if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sort === 'due_asc') {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    }
    const order: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  });
}

function sortedProjects(projects: Project[], sort: ProjectSort) {
  return [...projects].sort((a, b) => {
    if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sort === 'due_asc') {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    }
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
  });
}

interface ScopeViewProps {
  scope: Scope;
  setScope: (s: Scope) => void;
  session: Session;
}

function ScopeView({ scope, setScope, session }: ScopeViewProps) {
  const { projects, refresh: refreshProjects } = useProjects(scope);
  const { tasks, refresh: refreshTasks } = useTasks(scope);
  const { counts: fileCounts, refresh: refreshFileCounts } = useFileCounts(scope);
  type View = 'projects' | 'projects-done' | 'projects-frozen' | 'orphans' | 'orphans-done';
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
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskSort, setTaskSort]       = useState<TaskSort>('priority');
  const [projectSort, setProjectSort] = useState<ProjectSort>('priority');
  const [hideDone, setHideDone] = useState(false);
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

  const activeProjects  = useMemo(() => projects.filter(p => p.status !== 'done' && p.status !== 'frozen'), [projects]);
  const doneProjects    = useMemo(() => projects.filter(p => p.status === 'done'), [projects]);
  const frozenProjects  = useMemo(() => projects.filter(p => p.status === 'frozen'), [projects]);

  const doneTasksWithProj = useMemo(() => tasks.filter(t => t.status === 'done' && t.project_id), [tasks]);
  const doneTasksOrphan   = useMemo(() => tasks.filter(t => t.status === 'done' && !t.project_id), [tasks]);

  const visibleProjects =
    view === 'projects-done'   ? doneProjects :
    view === 'projects-frozen' ? frozenProjects :
    view === 'orphans' || view === 'orphans-done' ? [] :
    activeProjects;

  const visibleTasks = (() => {
    const hide = (arr: Task[]) => hideDone ? arr.filter(t => t.status !== 'done') : arr;
    if (view === 'projects-done')   return doneTasksWithProj;
    if (view === 'projects-frozen') return [];
    if (view === 'orphans-done')    return doneTasksOrphan;
    if (view === 'orphans')         return hide(tasks.filter(t => !t.project_id));
    if (filterProjectId !== null)   return hide(tasks.filter(t => t.project_id === filterProjectId));
    return hide(tasks.filter(t => t.project_id));
  })();

  const sortedVisibleProjects = useMemo(() => sortedProjects(visibleProjects, projectSort), [visibleProjects, projectSort]);
  const sortedVisibleTasks    = useMemo(() => sortedTasks(visibleTasks, taskSort), [visibleTasks, taskSort]);

  const projectsById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  const lastClosedTaskId = useMemo(() => {
    const closed = tasks.filter(t => t.closed_at && t.project_id);
    if (!closed.length) return null;
    return closed.reduce((a, b) => (a.closed_at! > b.closed_at! ? a : b)).id;
  }, [tasks]);

  const timelineProject = filterProjectId !== null ? projectsById.get(filterProjectId) : undefined;
  const timelineTasks   = useMemo(
    () => filterProjectId !== null ? sortedVisibleTasks.filter(t => t.project_id === filterProjectId) : [],
    [filterProjectId, sortedVisibleTasks],
  );

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
              <span className="text-[10px] font-normal text-muted/70" dir="ltr">V1.13</span>
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
              <Factory size={14} /> עבודה
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
        <div className="flex flex-col items-center gap-1.5 mb-4">
          <div className="flex bg-surface rounded-lg p-1 border border-border">
            <button
              onClick={() => setViewPersisted('projects')}
              className={cn('btn text-sm px-3 py-1.5', ['projects','projects-done','projects-frozen'].includes(view) ? 'bg-accent text-white' : 'text-muted hover:text-text')}
            >
              <FolderKanban size={14} /> פרויקטים
            </button>
            <button
              onClick={() => setViewPersisted('orphans')}
              className={cn('btn text-sm px-3 py-1.5', ['orphans','orphans-done'].includes(view) ? 'bg-accent text-white' : 'text-muted hover:text-text')}
            >
              <ListTodo size={14} /> ללא פרויקט
            </button>
          </div>

          {/* secondary links — context-sensitive */}
          {['projects','projects-done','projects-frozen'].includes(view) && (
            <div className="flex items-center gap-3">
              {([
                { id: 'projects-done'   as const, icon: CheckCircle2, label: 'הושלמו', badge: doneProjects.length + doneTasksWithProj.length },
                { id: 'projects-frozen' as const, icon: Archive,      label: 'נגנזו',  badge: frozenProjects.length },
              ]).map(({ id, icon: Icon, label, badge }) => (
                <button key={id} onClick={() => setViewPersisted(id)}
                  className={cn('flex items-center gap-1 text-xs transition-colors', view === id ? 'text-accent' : 'text-muted/60 hover:text-muted')}
                >
                  <Icon size={12} /> {label}
                  {badge > 0 && <span className={cn('text-[10px] rounded-full px-1.5 leading-5 font-semibold', view === id ? 'bg-accent/20 text-accent' : 'bg-surface text-muted')}>{badge}</span>}
                </button>
              ))}
            </div>
          )}
          {['orphans','orphans-done'].includes(view) && (
            <div className="flex items-center gap-3">
              <button onClick={() => setViewPersisted('orphans-done')}
                className={cn('flex items-center gap-1 text-xs transition-colors', view === 'orphans-done' ? 'text-accent' : 'text-muted/60 hover:text-muted')}
              >
                <CheckCircle2 size={12} /> הושלמו
                {doneTasksOrphan.length > 0 && <span className={cn('text-[10px] rounded-full px-1.5 leading-5 font-semibold', view === 'orphans-done' ? 'bg-accent/20 text-accent' : 'bg-surface text-muted')}>{doneTasksOrphan.length}</span>}
              </button>
            </div>
          )}
        </div>

        {(() => {
          const isActive = view === 'projects' || view === 'orphans';
          const showProjectsCol = ['projects','projects-done','projects-frozen'].includes(view);
          const showTasksCol = view !== 'projects-frozen';
          const projectsHeading = view === 'projects-done' ? 'פרויקטים שהושלמו' : view === 'projects-frozen' ? 'פרויקטים נגנזים' : 'פרויקטים';
          const tasksHeading = view === 'projects-done' || view === 'orphans-done' ? 'משימות שהושלמו' : 'משימות';

          return (
            <div className={cn('grid grid-cols-1 gap-6', showProjectsCol && showTasksCol && 'lg:grid-cols-[1fr,1.5fr]')}>
              {showProjectsCol && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">{projectsHeading}</h2>
                    <div className="flex items-center gap-2">
                      <select value={projectSort} onChange={e => setProjectSort(e.target.value as ProjectSort)}
                        className="text-xs text-muted bg-transparent border border-border rounded-md px-1.5 py-1 cursor-pointer">
                        <option value="priority">עדיפות</option>
                        <option value="newest">חדש ראשון</option>
                        <option value="oldest">ישן ראשון</option>
                        <option value="due_asc">קרוב לסיום</option>
                      </select>
                      {isActive && (
                        <button onClick={() => setShowAdd('project')} className="btn-primary text-xs">
                          <Plus size={14} /> הוסף
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {sortedVisibleProjects.length === 0 && (
                      <div className="card p-6 text-center text-muted text-sm">אין פרויקטים</div>
                    )}
                    {sortedVisibleProjects.map(p => (
                      <div key={p.id}
                           onClick={() => view === 'projects' && setFilterProjectId(filterProjectId === p.id ? null : p.id)}
                           className={cn(view === 'projects' && 'cursor-pointer', filterProjectId === p.id && 'ring-1 ring-accent rounded-xl')}>
                        <ProjectCard project={p} scope={scope} progress={projectProgress.get(p.id) ?? { completed: 0, total: 0 }} fileCount={fileCounts.get(p.id) ?? 0} onChange={refreshAll} />
                        {filterProjectId === p.id && timelineProject?.due_date && (
                          <ProjectTimeline project={timelineProject} tasks={timelineTasks} />
                        )}
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
                      {isActive && (
                        <button
                          onClick={() => setHideDone(h => !h)}
                          className={cn('text-xs transition-colors', hideDone ? 'text-accent' : 'text-muted/60 hover:text-muted')}
                        >
                          {hideDone ? '✓ מסתיר שהסתיימו' : 'הסתר שהסתיימו'}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={taskSort} onChange={e => setTaskSort(e.target.value as TaskSort)}
                        className="text-xs text-muted bg-transparent border border-border rounded-md px-1.5 py-1 cursor-pointer">
                        <option value="priority">עדיפות</option>
                        <option value="newest">חדש ראשון</option>
                        <option value="oldest">ישן ראשון</option>
                        <option value="due_asc">קרוב לסיום</option>
                      </select>
                      {isActive && (
                        <button onClick={() => setShowAdd('task')} disabled={view === 'projects' && activeProjects.length === 0} className="btn-primary text-xs disabled:opacity-50">
                          <Plus size={14} /> הוסף
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {sortedVisibleTasks.length === 0 && (
                      <div className="card p-6 text-center text-muted text-sm">אין משימות</div>
                    )}
                    {sortedVisibleTasks.map(t => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        project={t.project_id ? projectsById.get(t.project_id) : undefined}
                        projects={projects}
                        scope={scope}
                        onChange={refreshAll}
                        isSelected={selectedTaskId === t.id}
                        onSelect={() => setSelectedTaskId(selectedTaskId === t.id ? null : t.id)}
                        isLastClosed={t.id === lastClosedTaskId}
                      />
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
          defaultProjectId={view === 'orphans' || view === 'orphans-done' ? null : (filterProjectId ?? undefined)}
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
