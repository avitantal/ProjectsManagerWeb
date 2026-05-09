import { describe, expect, it } from 'vitest';
import type { Project, Task } from '../lib/supabase';
import {
  buildProjectProgress,
  getProjectProgress,
  getProjectProgressPercent,
  isProjectActive,
  isProjectComplete,
  isProjectDone,
} from '../lib/projectProgress';

const baseProject: Project = {
  id: 1,
  name: 'פרויקט',
  status: 'in_progress',
  priority: 'medium',
  due_date: null,
  description: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  closed_at: null,
};

function task(id: number, projectId: number, status: Task['status']): Task {
  return {
    id,
    project_id: projectId,
    name: `משימה ${id}`,
    status,
    priority: 'normal',
    due_date: null,
    notes: null,
    is_suggested: false,
    sort_order: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    closed_at: status === 'done' ? '2025-01-02T00:00:00Z' : null,
  };
}

describe('project progress helpers', () => {
  it('counts done and non-frozen project tasks', () => {
    const progressMap = buildProjectProgress([
      task(1, 1, 'done'),
      task(2, 1, 'todo'),
      task(3, 1, 'frozen'),
    ]);

    expect(getProjectProgress(progressMap, 1)).toEqual({ completed: 1, total: 2 });
  });

  it('treats a project with all non-frozen tasks done as completed and not active', () => {
    const progressMap = buildProjectProgress([
      task(1, 1, 'done'),
      task(2, 1, 'done'),
    ]);
    const progress = getProjectProgress(progressMap, 1);

    expect(isProjectComplete(progress)).toBe(true);
    expect(isProjectDone(baseProject, progress)).toBe(true);
    expect(isProjectActive(baseProject, progress)).toBe(false);
    expect(getProjectProgressPercent(baseProject, progress)).toBe(100);
  });

  it('keeps an empty non-done project active at 0%', () => {
    const progress = getProjectProgress(new Map(), 1);

    expect(isProjectComplete(progress)).toBe(false);
    expect(isProjectActive({ ...baseProject, status: 'planned' }, progress)).toBe(true);
    expect(getProjectProgressPercent(baseProject, progress)).toBe(0);
  });
});

