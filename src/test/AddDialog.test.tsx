import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddDialog } from '../components/AddDialog';

vi.mock('../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/supabase')>();
  return {
    ...actual,
    supabase: {
      from: vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  };
});

const defaultProps = {
  scope: 'personal' as const,
  projects: [],
  onClose: vi.fn(),
  onSaved: vi.fn(),
};

describe('AddDialog — project', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows "פרויקט חדש" heading for new project', () => {
    render(<AddDialog {...defaultProps} type="project" />);
    expect(screen.getByText('פרויקט חדש')).toBeInTheDocument();
  });

  it('shows "עריכת פרויקט" heading when editing', () => {
    const project = { id: 1, name: 'קיים', status: 'planned' as const, priority: 'medium' as const, due_date: null, description: null, created_at: '', updated_at: '', closed_at: null };
    render(<AddDialog {...defaultProps} type="project" editing={project} />);
    expect(screen.getByText('עריכת פרויקט')).toBeInTheDocument();
  });

  it('submit button is disabled when name is empty', () => {
    render(<AddDialog {...defaultProps} type="project" />);
    const btn = screen.getByRole('button', { name: 'שמור' });
    expect(btn).toBeDisabled();
  });

  it('submit button enables after typing name', () => {
    render(<AddDialog {...defaultProps} type="project" />);
    const nameInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(nameInput, { target: { value: 'פרויקט חדש' } });
    expect(screen.getByRole('button', { name: 'שמור' })).not.toBeDisabled();
  });

  it('calls onClose when cancel is clicked', () => {
    render(<AddDialog {...defaultProps} type="project" />);
    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('pre-fills name when editing', () => {
    const project = { id: 1, name: 'פרויקט קיים', status: 'planned' as const, priority: 'medium' as const, due_date: null, description: 'תיאור', created_at: '', updated_at: '', closed_at: null };
    render(<AddDialog {...defaultProps} type="project" editing={project} />);
    expect(screen.getByDisplayValue('פרויקט קיים')).toBeInTheDocument();
  });
});

describe('AddDialog — task', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows "משימה חדשה" heading for new task', () => {
    render(<AddDialog {...defaultProps} type="task" />);
    expect(screen.getByText('משימה חדשה')).toBeInTheDocument();
  });

  it('shows "עריכת משימה" heading when editing', () => {
    const task = { id: 1, project_id: null, name: 'משימה', status: 'todo' as const, priority: 'normal' as const, due_date: null, notes: null, is_suggested: false, sort_order: null, created_at: '', updated_at: '', closed_at: null };
    render(<AddDialog {...defaultProps} type="task" editing={task} />);
    expect(screen.getByText('עריכת משימה')).toBeInTheDocument();
  });

  it('shows project selector for task', () => {
    render(<AddDialog {...defaultProps} type="task" />);
    expect(screen.getByText('פרויקט')).toBeInTheDocument();
  });
});
