import type { Project, Task } from './supabase';

export interface ProjectProgress {
  completed: number;
  total: number;
}

export const EMPTY_PROJECT_PROGRESS: ProjectProgress = {
  completed: 0,
  total: 0,
};

export function buildProjectProgress(tasks: Task[]) {
  const progress = new Map<number, ProjectProgress>();

  tasks.forEach((task) => {
    if (!task.project_id || task.status === 'frozen') return;
    const current = progress.get(task.project_id) ?? { ...EMPTY_PROJECT_PROGRESS };
    current.total += 1;
    if (task.status === 'done') current.completed += 1;
    progress.set(task.project_id, current);
  });

  return progress;
}

export function getProjectProgress(progress: Map<number, ProjectProgress>, projectId: number) {
  return progress.get(projectId) ?? EMPTY_PROJECT_PROGRESS;
}

export function isProjectComplete(progress: ProjectProgress) {
  return progress.total > 0 && progress.completed === progress.total;
}

export function isProjectDone(project: Project, progress: ProjectProgress) {
  return project.status === 'done' || isProjectComplete(progress);
}

export function isProjectActive(project: Project, progress: ProjectProgress) {
  return project.status !== 'frozen' && !isProjectDone(project, progress);
}

export function getProjectProgressPercent(project: Project, progress: ProjectProgress) {
  if (progress.total > 0) return Math.round((progress.completed / progress.total) * 100);
  return project.status === 'done' ? 100 : 0;
}

