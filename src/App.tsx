import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import type { Session } from '@supabase/supabase-js';
import { CalendarCog, CalendarX2, Plus, RefreshCw, Factory, House, LogOut, Loader2, FolderKanban, ListTodo, CheckCircle2, Archive, X } from 'lucide-react';
import { useProjects, useTasks, useFileCounts } from './hooks/useData';
import { useAuth } from './hooks/useAuth';
import { useCalendarSync } from './hooks/useCalendarSync';
import {
  supabase,
  type Scope,
  type Task,
  type Project,
  PROJECT_STATUS_HE,
  PRIORITY_HE,
  TASK_STATUS_HE,
  TASK_PRIORITY_HE,
} from './lib/supabase';
import { Stats } from './components/Stats';
import { ProjectCard } from './components/ProjectCard';
import { SortableTaskList } from './components/SortableTaskList';
import { AddDialog } from './components/AddDialog';
import { Auth } from './components/Auth';
import { SearchBar } from './components/SearchBar';
import { searchFilter } from './lib/search';
const CalendarSettingsDialog = lazy(() => import('./components/CalendarSettingsDialog').then(m => ({ default: m.CalendarSettingsDialog })));
const CalendarFirstUseDialog = lazy(() => import('./components/CalendarSettingsDialog').then(m => ({ default: m.CalendarFirstUseDialog })));
import { cn } from './lib/utils';
import { buildProjectProgress, getProjectProgress, isProjectActive, isProjectComplete, isProjectDone } from './lib/projectProgress';
import { signInWithGoogleCalendar } from './lib/googleAuth';

type TaskSort    = 'priority' | 'newest' | 'oldest' | 'due_asc' | 'manual';
type ProjectSort = 'priority' | 'newest' | 'oldest' | 'due_asc';

function sortedTasks(tasks: Task[], sort: TaskSort) {
  return [...tasks].sort((a, b) => {
    if (sort === 'manual') return (a.sort_order ?? a.id) - (b.sort_order ?? b.id);
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

/**
 * Builds a project -> searchable-text function. `fileText` carries the names
 * and summaries of files attached to each project, so a search hits them too.
 */
function makeProjectSearchText(fileText: Map<number, string>) {
  return (p: Project): string =>
    [
      p.name,
      p.description,
      PROJECT_STATUS_HE[p.status],
      PRIORITY_HE[p.priority],
      fileText.get(p.id),
    ]
      .filter(Boolean)
      .join('\n');
}

/** Builds a task -> searchable-text function that also covers the parent project name. */
function makeTaskSearchText(projectsById: Map<number, Project>) {
  return (t: Task): string =>
    [
      t.name,
      t.notes,
      TASK_STATUS_HE[t.status],
      TASK_PRIORITY_HE[t.priority],
      t.project_id ? projectsById.get(t.project_id)?.name : null,
    ]
      .filter(Boolean)
      .join('\n');
}

interface ScopeViewProps {
  scope: Scope;
  setScope: (s: Scope) => void;
  session: Session;
  providerToken: string | null;
  onCalendarAuthError: () => void;
}

function ScopeView({ scope, setScope, session, providerToken, onCalendarAuthError }: ScopeViewProps) {
  const { projects, refresh: refreshProjects } = useProjects(scope);
  const { tasks, refresh: refreshTasks } = useTasks(scope);
  const { counts: fileCounts, fileText: projectFileText, refresh: refreshFileCounts } = useFileCounts(scope);
  const { syncTask, syncProject, removeTaskEvent, removeProjectEvent, prefs, updatePrefs, needsCalendarSetup, setNeedsCalendarSetup, flushPending, isCalendarReady } = useCalendarSync(session, providerToken, onCalendarAuthError);
  const calendarToken = providerToken;
  const [showCalendarSettings, setShowCalendarSettings] = useState(false);
  type View = 'projects' | 'projects-done' | 'projects-frozen' | 'orphans' | 'orphans-done' | 'orphans-frozen';
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
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const syncedDoneProjectIds = useRef<Set<number>>(new Set());
  const syncedReopenedProjectIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  function refreshAll() { refreshProjects(); refreshTasks(); refreshFileCounts(); }

  async function handleTasksReorder(reordered: Task[]) {
    await Promise.all(
      reordered.map((task, index) =>
        supabase.from(`${scope}_tasks`).update({ sort_order: index }).eq('id', task.id),
      ),
    );
    setTaskSort('manual');
    refreshTasks();
  }

  const projectProgress = useMemo(() => buildProjectProgress(tasks), [tasks]);

  const activeProjects  = useMemo(
    () => projects.filter(p => isProjectActive(p, getProjectProgress(projectProgress, p.id))),
    [projectProgress, projects],
  );
  const doneProjects    = useMemo(
    () => projects.filter(p => isProjectDone(p, getProjectProgress(projectProgress, p.id))),
    [projectProgress, projects],
  );
  const frozenProjects  = useMemo(() => projects.filter(p => p.status === 'frozen'), [projects]);

  const doneProjectIds = useMemo(() => new Set(doneProjects.map(p => p.id)), [doneProjects]);
  const activeProjectIds = useMemo(() => new Set(activeProjects.map(p => p.id)), [activeProjects]);
  const frozenProjectIds = useMemo(() => new Set(frozenProjects.map(p => p.id)), [frozenProjects]);
  const activeProjectTasks = useMemo(() => tasks.filter(t => t.project_id && activeProjectIds.has(t.project_id) && t.status !== 'frozen'), [activeProjectIds, tasks]);
  const doneProjectTasks  = useMemo(() => tasks.filter(t => t.project_id && doneProjectIds.has(t.project_id)), [doneProjectIds, tasks]);
  const frozenProjectTasks = useMemo(() => tasks.filter(t => t.project_id && frozenProjectIds.has(t.project_id)), [frozenProjectIds, tasks]);
  const doneTasksOrphan    = useMemo(() => tasks.filter(t => t.status === 'done' && !t.project_id), [tasks]);
  const frozenTasksOrphan  = useMemo(() => tasks.filter(t => t.status === 'frozen' && !t.project_id), [tasks]);

  useEffect(() => {
    if (view !== 'projects' || filterProjectId === null || activeProjectIds.has(filterProjectId)) return;
    const timeout = window.setTimeout(() => setFilterProjectId(null), 0);
    return () => window.clearTimeout(timeout);
  }, [activeProjectIds, filterProjectId, view]);

  const projectsToAutoComplete = useMemo(
    () => projects.filter((project) => {
      if (project.status === 'done' || project.status === 'frozen') return false;
      return isProjectComplete(getProjectProgress(projectProgress, project.id));
    }),
    [projectProgress, projects],
  );

  useEffect(() => {
    const pendingProjects = projectsToAutoComplete.filter(project => !syncedDoneProjectIds.current.has(project.id));
    if (pendingProjects.length === 0) return;

    pendingProjects.forEach(project => syncedDoneProjectIds.current.add(project.id));
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      const closedAt = new Date().toISOString();
      void Promise.all(
        pendingProjects.map(project =>
          supabase
            .from(`${scope}_projects`)
            .update({ status: 'done', closed_at: project.closed_at ?? closedAt })
            .eq('id', project.id),
        ),
      ).finally(() => {
        if (!cancelled) refreshProjects();
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [projectsToAutoComplete, refreshProjects, scope]);

  const projectsToAutoReopen = useMemo(
    () => projects.filter((project) => {
      if (project.status !== 'done') return false;
      const progress = getProjectProgress(projectProgress, project.id);
      return progress.total > 0 && !isProjectComplete(progress);
    }),
    [projectProgress, projects],
  );

  useEffect(() => {
    const pendingProjects = projectsToAutoReopen.filter(project => !syncedReopenedProjectIds.current.has(project.id));
    if (pendingProjects.length === 0) return;

    pendingProjects.forEach(project => {
      syncedReopenedProjectIds.current.add(project.id);
      syncedDoneProjectIds.current.delete(project.id);
    });
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void Promise.all(
        pendingProjects.map(project =>
          supabase
            .from(`${scope}_projects`)
            .update({ status: 'in_progress', closed_at: null })
            .eq('id', project.id),
        ),
      ).finally(() => {
        if (!cancelled) refreshProjects();
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [projectsToAutoReopen, refreshProjects, scope]);

  const visibleProjects = useMemo(() => (
    view === 'projects-done'   ? doneProjects :
    view === 'projects-frozen' ? frozenProjects :
    view === 'orphans' || view === 'orphans-done' ? [] :
    activeProjects
  ), [activeProjects, doneProjects, frozenProjects, view]);

  const visibleTasks = (() => {
    const hide = (arr: Task[]) => hideDone ? arr.filter(t => t.status !== 'done') : arr;
    if (view === 'projects-done')   return doneProjectTasks;
    if (view === 'projects-frozen') return frozenProjectTasks;
    if (view === 'orphans-done')    return doneTasksOrphan;
    if (view === 'orphans-frozen')  return frozenTasksOrphan;
    if (view === 'orphans')         return hide(tasks.filter(t => !t.project_id && t.status !== 'frozen'));
    if (filterProjectId !== null)   return hide(tasks.filter(t => t.project_id === filterProjectId));
    return hide(activeProjectTasks);
  })();

  const sortedVisibleProjects = useMemo(() => sortedProjects(visibleProjects, projectSort), [visibleProjects, projectSort]);
  const sortedVisibleTasks    = useMemo(() => sortedTasks(visibleTasks, taskSort), [visibleTasks, taskSort]);

  const projectsById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);

  // Instant client-side search across both columns — every keystroke re-filters.
  const taskSearchText = useMemo(() => makeTaskSearchText(projectsById), [projectsById]);
  const projectSearchText = useMemo(() => makeProjectSearchText(projectFileText), [projectFileText]);
  const searchedProjects = useMemo(
    () => searchFilter(sortedVisibleProjects, query, projectSearchText),
    [sortedVisibleProjects, query, projectSearchText],
  );
  const searchedTasks = useMemo(
    () => searchFilter(sortedVisibleTasks, query, taskSearchText),
    [sortedVisibleTasks, query, taskSearchText],
  );
  const showProjectsCol = ['projects', 'projects-done', 'projects-frozen'].includes(view);
  const searching = query.trim().length > 0;

  const lastClosedTaskId = useMemo(() => {
    const closed = tasks.filter(t => t.closed_at && t.project_id);
    if (!closed.length) return null;
    return closed.reduce((a, b) => (a.closed_at! > b.closed_at! ? a : b)).id;
  }, [tasks]);

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
              <span className="text-[10px] font-normal text-muted/70" dir="ltr">V1.65</span>
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
                {isCalendarReady && (
                  <button
                    onClick={() => { setMenuOpen(false); setShowCalendarSettings(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-surface text-right"
                    role="menuitem"
                  >
                    <CalendarCog size={14} /> הגדרות קלנדר
                  </button>
                )}
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
          <div className="flex items-center gap-2">
            {!isCalendarReady && session.user.app_metadata?.provider === 'google' && (
              <button
                onClick={() => void signInWithGoogleCalendar()}
                className="btn text-xs px-2.5 py-1.5 border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-1.5 shrink-0"
                title="חבר מחדש לסנכרון עם Google Calendar"
              >
                <CalendarX2 size={13} />
                <span className="hidden sm:inline">התחבר לקלנדר</span>
              </button>
            )}
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
              className={cn('btn text-sm px-3 py-1.5', ['orphans','orphans-done','orphans-frozen'].includes(view) ? 'bg-accent text-white' : 'text-muted hover:text-text')}
            >
              <ListTodo size={14} /> ללא פרויקט
            </button>
          </div>

          {/* secondary links — context-sensitive */}
          {['projects','projects-done','projects-frozen'].includes(view) && (
            <div className="flex items-center gap-3">
              {([
                { id: 'projects-done'   as const, icon: CheckCircle2, label: 'הושלמו', badge: doneProjects.length },
                { id: 'projects-frozen' as const, icon: Archive,      label: 'מחוקים', badge: frozenProjects.length },
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
          {['orphans','orphans-done','orphans-frozen'].includes(view) && (
            <div className="flex items-center gap-3">
              <button onClick={() => setViewPersisted('orphans-done')}
                className={cn('flex items-center gap-1 text-xs transition-colors', view === 'orphans-done' ? 'text-accent' : 'text-muted/60 hover:text-muted')}
              >
                <CheckCircle2 size={12} /> הושלמו
                {doneTasksOrphan.length > 0 && <span className={cn('text-[10px] rounded-full px-1.5 leading-5 font-semibold', view === 'orphans-done' ? 'bg-accent/20 text-accent' : 'bg-surface text-muted')}>{doneTasksOrphan.length}</span>}
              </button>
              <button onClick={() => setViewPersisted('orphans-frozen')}
                className={cn('flex items-center gap-1 text-xs transition-colors', view === 'orphans-frozen' ? 'text-accent' : 'text-muted/60 hover:text-muted')}
              >
                <Archive size={12} /> מחוקים
                {frozenTasksOrphan.length > 0 && <span className={cn('text-[10px] rounded-full px-1.5 leading-5 font-semibold', view === 'orphans-frozen' ? 'bg-accent/20 text-accent' : 'bg-surface text-muted')}>{frozenTasksOrphan.length}</span>}
              </button>
            </div>
          )}
        </div>

        <div className="max-w-md mx-auto mb-5">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="חיפוש בפרויקטים ובמשימות..."
            summary={
              showProjectsCol
                ? `${searchedProjects.length} פרויקטים · ${searchedTasks.length} משימות`
                : `${searchedTasks.length} משימות`
            }
          />
        </div>

        {(() => {
          const isActive = view === 'projects' || view === 'orphans';
          const isOrphansFrozen = view === 'orphans-frozen';
          const showTasksCol = true;
          const projectsHeading = view === 'projects-done' ? 'פרויקטים שהושלמו' : view === 'projects-frozen' ? 'פרויקטים מחוקים' : 'פרויקטים';
          const tasksHeading = view === 'projects-done' ? 'משימות בפרויקטים שהושלמו' : view === 'orphans-done' ? 'משימות שהושלמו' : view === 'projects-frozen' ? 'משימות מחוקות' : view === 'orphans-frozen' ? 'משימות מחוקות' : 'משימות';

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
                    {searchedProjects.length === 0 && (
                      <div className="card p-6 text-center text-muted text-sm">
                        {searching ? 'לא נמצאו פרויקטים תואמים' : 'אין פרויקטים'}
                      </div>
                    )}
                    {searchedProjects.map(p => (
                      <div key={p.id}
                           onClick={() => view === 'projects' && setFilterProjectId(filterProjectId === p.id ? null : p.id)}
                           className={cn(view === 'projects' && 'cursor-pointer', filterProjectId === p.id && 'ring-1 ring-accent rounded-xl')}>
                        <ProjectCard project={p} scope={scope} progress={getProjectProgress(projectProgress, p.id)} fileCount={fileCounts.get(p.id) ?? 0} onChange={refreshAll} allowPermDelete={view === 'projects-frozen'} calendarToken={calendarToken} onCalendarAuthError={onCalendarAuthError} onProjectSaved={async project => { await syncProject(project, scope); }} onBeforeDelete={project => removeProjectEvent(project, scope)} searchQuery={query} />
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
                        <option value="manual">ידני</option>
                      </select>
                      {isActive && (
                        <button onClick={() => setShowAdd('task')} disabled={view === 'projects' && activeProjects.length === 0} className="btn-primary text-xs disabled:opacity-50">
                          <Plus size={14} /> הוסף
                        </button>
                      )}
                    </div>
                  </div>
                  <SortableTaskList
                    tasks={searchedTasks}
                    projects={projects}
                    scope={scope}
                    onChange={refreshAll}
                    onReorder={reordered => void handleTasksReorder(reordered)}
                    selectedTaskId={selectedTaskId}
                    onSelect={id => setSelectedTaskId(id)}
                    lastClosedTaskId={lastClosedTaskId}
                    projectsById={projectsById}
                    allowPermDelete={isOrphansFrozen}
                    onBeforeDelete={task => removeTaskEvent(task, scope, projects)}
                    onTaskSaved={async task => { await syncTask(task, scope, projects); }}
                    calendarToken={calendarToken}
                    onCalendarAuthError={onCalendarAuthError}
                    searchQuery={query}
                    emptyMessage={searching ? 'לא נמצאו משימות תואמות' : 'אין משימות'}
                  />
                </section>
              )}
            </div>
          );
        })()}
      </main>

      {filterProjectId !== null && view === 'projects' && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setFilterProjectId(null)} />
          <div className="relative bg-bg border-t border-border rounded-t-2xl max-h-[82vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h3 className="font-semibold text-text truncate">{projectsById.get(filterProjectId)?.name}</h3>
              <button onClick={() => setFilterProjectId(null)} className="text-muted hover:text-text shrink-0 ml-2">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              <SortableTaskList
                tasks={searchedTasks}
                projects={projects}
                scope={scope}
                onChange={refreshAll}
                onReorder={reordered => void handleTasksReorder(reordered)}
                selectedTaskId={selectedTaskId}
                onSelect={id => setSelectedTaskId(id)}
                lastClosedTaskId={lastClosedTaskId}
                projectsById={projectsById}
                onBeforeDelete={task => removeTaskEvent(task, scope, projects)}
                onTaskSaved={async task => { await syncTask(task, scope, projects); }}
                calendarToken={calendarToken}
                onCalendarAuthError={onCalendarAuthError}
                searchQuery={query}
                emptyMessage={searching ? 'לא נמצאו משימות תואמות' : 'אין משימות'}
              />
            </div>
            <div className="p-3 border-t border-border shrink-0">
              <button onClick={() => setShowAdd('task')} className="btn-primary text-sm w-full justify-center">
                <Plus size={14} /> הוסף משימה
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <AddDialog
          scope={scope}
          type={showAdd}
          projects={projects}
          defaultProjectId={view === 'orphans' || view === 'orphans-done' ? null : (filterProjectId ?? undefined)}
          onClose={() => setShowAdd(null)}
          onSaved={refreshAll}
          onTaskSaved={async task => { await syncTask(task, scope, projects); }}
          onProjectSaved={async project => { await syncProject(project, scope); }}
          calendarToken={calendarToken}
          onCalendarAuthError={onCalendarAuthError}
        />
      )}

      {needsCalendarSetup && calendarToken && (
        <Suspense fallback={null}>
          <CalendarFirstUseDialog
            token={calendarToken}
            onSave={async patch => {
              await updatePrefs(patch);
              if (patch.gcal_default_calendar_id) {
                await flushPending();
              }
              return;
            }}
            onClose={() => setNeedsCalendarSetup(false)}
            onAuthError={onCalendarAuthError}
          />
        </Suspense>
      )}

      {showCalendarSettings && calendarToken && (
        <Suspense fallback={null}>
          <CalendarSettingsDialog
            token={calendarToken}
            prefs={prefs ?? null}
            onSave={async patch => { await updatePrefs(patch); }}
            onClose={() => setShowCalendarSettings(false)}
            onAuthError={onCalendarAuthError}
          />
        </Suspense>
      )}
    </>
  );
}

export default function App() {
  const { session, loading, providerToken, clearProviderToken } = useAuth();
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
      <ScopeView key={scope} scope={scope} setScope={setScopePersisted} session={session} providerToken={providerToken} onCalendarAuthError={clearProviderToken} />
    </div>
  );
}
