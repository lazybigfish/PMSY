import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TaskDetail } from '../TaskDetail';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../lib/supabase';

// Mock dependencies
vi.mock('../../../../context/AuthContext');
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock Dialog primitive
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) => open ? <div>{children}</div> : null,
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Overlay: () => <div>Overlay</div>,
  Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Title: () => <div>Title</div>,
}));

describe('TaskDetail Component', () => {
  const mockUser = { id: 'user-1', full_name: 'Test User' };
  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Desc',
    status: 'todo',
    priority: 'medium',
    project_id: 'proj-1',
    owner_id: 'user-1', // Current user is owner
    project: { id: 'proj-1', name: 'Project A', status: 'in_progress' },
    assignees: [{ user_id: 'user-1', is_primary: true, user: mockUser }, { user_id: 'user-2', is_primary: false, user: { id: 'user-2', full_name: 'User 2' } }],
    owner: mockUser,
    task_modules: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({ user: mockUser });
  });

  const setupMocks = (task = mockTask) => {
    const singleMock = vi.fn().mockResolvedValue({ data: task, error: null });
    const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'tasks') {
        return { 
            select: () => ({ 
                eq: () => ({ 
                    single: singleMock 
                }) 
            }) 
        };
      }
      if (table === 'profiles') {
          return { select: () => Promise.resolve({ data: [mockUser, {id:'user-2', full_name:'User 2'}], error: null }) };
      }
      if (table === 'project_modules') {
          return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
      }
      // Comments, Logs, Attachments
      return { 
          select: () => ({ 
              eq: () => ({ 
                  order: orderMock 
              }) 
          }) 
      };
    });
  };

  it('renders owner information correctly', async () => {
    setupMocks();
    render(<TaskDetail taskId="task-1" open={true} onClose={() => {}} onUpdate={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('责任人')).toBeInTheDocument();
      expect(screen.getAllByText('Test User').length).toBeGreaterThan(0);
    });
  });

  it('shows add assignee button for owner when project is active', async () => {
    setupMocks();
    render(<TaskDetail taskId="task-1" open={true} onClose={() => {}} onUpdate={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('添加')).toBeInTheDocument();
    });
  });

  it('does NOT show add assignee button for non-owner', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuth as any).mockReturnValue({ user: { id: 'user-2' } }); // Not owner
    setupMocks();
    render(<TaskDetail taskId="task-1" open={true} onClose={() => {}} onUpdate={() => {}} />);

    await waitFor(() => {
      expect(screen.queryByText('添加')).not.toBeInTheDocument();
    });
  });

  it('does NOT show add assignee button when project is completed', async () => {
    const completedTask = { ...mockTask, project: { ...mockTask.project, status: 'completed' } };
    setupMocks(completedTask);
    render(<TaskDetail taskId="task-1" open={true} onClose={() => {}} onUpdate={() => {}} />);

    await waitFor(() => {
      expect(screen.queryByText('添加')).not.toBeInTheDocument();
    });
  });
});
