import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Stats } from '../components/Stats';
import type { Project, Task } from '../lib/supabase';

function project(id: number, status: Project['status']): Project {
  return {
    id,
    name: `פרויקט ${id}`,
    status,
    priority: 'medium',
    due_date: null,
    description: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    closed_at: status === 'done' ? '2025-01-02T00:00:00Z' : null,
  };
}

function task(id: number, projectId: number | null, status: Task['status'], priority: Task['priority'] = 'normal'): Task {
  return {
    id,
    project_id: projectId,
    name: `משימה ${id}`,
    status,
    priority,
    due_date: null,
    notes: null,
    is_suggested: false,
    sort_order: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    closed_at: status === 'done' ? '2025-01-02T00:00:00Z' : null,
  };
}

function metricValue(label: string) {
  const metric = screen.getAllByText(label)[0].closest('div');
  if (!metric) throw new Error(`Missing metric ${label}`);
  return within(metric).getByText(/\d+/).textContent;
}

describe('Stats', () => {
  it('counts all active projects and treats 100% projects as completed', () => {
    render(
      <Stats
        projects={[
          project(1, 'planned'),
          project(2, 'in_progress'),
          project(3, 'in_progress'),
          project(4, 'done'),
          project(5, 'frozen'),
        ]}
        tasks={[
          task(1, 2, 'todo'),
          task(2, 3, 'done'),
          task(3, 3, 'done'),
          task(4, 4, 'todo', 'urgent'),
          task(5, null, 'todo', 'urgent'),
        ]}
      />,
    );

    expect(metricValue('פרויקטים פעילים')).toBe('2');
    expect(metricValue('משימות פתוחות')).toBe('2');
    expect(metricValue('דחופות')).toBe('1');
    expect(metricValue('פרויקטים שהושלמו')).toBe('2');
  });
});
