import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskRow } from '../components/TaskRow';
import type { Task } from '../lib/supabase';

vi.mock('../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/supabase')>();
  return {
    ...actual,
    supabase: {
      from: vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  };
});

const baseTask: Task = {
  id: 1,
  project_id: null,
  name: 'משימת בדיקה',
  status: 'todo',
  priority: 'normal',
  due_date: null,
  due_time: null,
  notes: null,
  is_suggested: false,
  sort_order: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  closed_at: null,
};

const defaultProps = {
  task: baseTask,
  projects: [],
  scope: 'personal' as const,
  onChange: vi.fn(),
};

describe('TaskRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders task name', () => {
    render(<TaskRow {...defaultProps} />);
    expect(screen.getByText('משימת בדיקה')).toBeInTheDocument();
  });

  it('checkbox is unchecked for todo task', () => {
    render(<TaskRow {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox', { name: 'סמן כהושלם' });
    expect(checkbox).not.toBeChecked();
  });

  it('checkbox is checked for done task', () => {
    render(<TaskRow {...defaultProps} task={{ ...baseTask, status: 'done' }} />);
    const checkbox = screen.getByRole('checkbox', { name: 'סמן כהושלם' });
    expect(checkbox).toBeChecked();
  });

  it('done task name has strikethrough', () => {
    render(<TaskRow {...defaultProps} task={{ ...baseTask, status: 'done' }} />);
    const nameEl = screen.getByText('משימת בדיקה').closest('div');
    expect(nameEl).toHaveClass('line-through');
  });

  it('shows AI badge for suggested task', () => {
    render(<TaskRow {...defaultProps} task={{ ...baseTask, is_suggested: true }} />);
    expect(screen.getByText('מוצע ע״י AI')).toBeInTheDocument();
  });

  it('shows approve button for suggested task', () => {
    render(<TaskRow {...defaultProps} task={{ ...baseTask, is_suggested: true }} />);
    expect(screen.getByRole('button', { name: /אשר/ })).toBeInTheDocument();
  });

  it('does not show AI badge for regular task', () => {
    render(<TaskRow {...defaultProps} />);
    expect(screen.queryByText('מוצע ע״י AI')).not.toBeInTheDocument();
  });

  it('shows overdue date in red', () => {
    render(<TaskRow {...defaultProps} task={{ ...baseTask, due_date: '2020-01-01' }} />);
    const dateEl = screen.getByText(/01[./-]01[./-]20/);
    expect(dateEl).toHaveClass('text-red-400');
  });

  it('renders priority and status selects', () => {
    render(<TaskRow {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });
});
