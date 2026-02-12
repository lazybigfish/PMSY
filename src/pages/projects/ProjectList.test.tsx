import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ProjectList from './ProjectList';
import { supabase } from '../../lib/supabase';

describe('ProjectList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders table headers and actions', async () => {
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) } as unknown as ReturnType<typeof supabase.from>;
    });

    render(
      <BrowserRouter>
        <ProjectList />
      </BrowserRouter>
    );

    expect(await screen.findByText('序号')).toBeInTheDocument();
    expect(screen.getByText('项目名称')).toBeInTheDocument();
    expect(screen.getByText('客户名称')).toBeInTheDocument();
    expect(screen.getByText('项目金额')).toBeInTheDocument();
    expect(screen.getByText('阶段')).toBeInTheDocument();
    expect(screen.getByText('操作')).toBeInTheDocument();
    expect(screen.getByText('新建项目')).toBeInTheDocument();
  });
});
