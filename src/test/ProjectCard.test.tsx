import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectCard } from '../components/ProjectCard';
import type { Project } from '../lib/supabase';

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

const baseProject: Project = {
  id: 1,
  name: 'פרויקט בדיקה',
  status: 'in_progress',
  priority: 'high',
  due_date: null,
  description: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  closed_at: null,
};

const defaultProps = {
  project: baseProject,
  scope: 'personal' as const,
  progress: { completed: 2, total: 5 },
  fileCount: 0,
  onChange: vi.fn(),
};

describe('ProjectCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the project name', () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText('פרויקט בדיקה')).toBeInTheDocument();
  });

  it('shows correct progress percentage', () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('2/5 משימות הושלמו')).toBeInTheDocument();
  });

  it('shows 0% progress when no tasks', () => {
    render(<ProjectCard {...defaultProps} progress={{ completed: 0, total: 0 }} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('אין משימות בפרויקט')).toBeInTheDocument();
  });

  it('shows 100% for done project with no tasks', () => {
    render(<ProjectCard {...defaultProps} project={{ ...baseProject, status: 'done' }} progress={{ completed: 0, total: 0 }} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders status select with current status', () => {
    render(<ProjectCard {...defaultProps} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('in_progress');
  });

  it('shows description when provided', () => {
    render(<ProjectCard {...defaultProps} project={{ ...baseProject, description: 'תיאור הפרויקט' }} />);
    expect(screen.getByText('תיאור הפרויקט')).toBeInTheDocument();
  });

  it('shows overdue styling when due date is past', () => {
    render(<ProjectCard {...defaultProps} project={{ ...baseProject, due_date: '2020-01-01' }} />);
    const dateSpan = screen.getByText(/01[./-]01[./-]20/);
    expect(dateSpan.closest('span')).toHaveClass('text-red-400');
  });

  it('shows priority badge', () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByText('גבוהה')).toBeInTheDocument();
  });

  it('renders edit and delete buttons on hover area', () => {
    render(<ProjectCard {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'ערוך' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'מחק' })).toBeInTheDocument();
  });
});
