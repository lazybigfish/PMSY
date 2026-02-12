import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SystemSettings from './SystemSettings';
import { vi } from 'vitest';

// Mock child components
vi.mock('./tabs/AIConfig', () => ({ default: () => <div>AI Config Content</div> }));
vi.mock('./tabs/ReportTemplates', () => ({ default: () => <div>Report Templates Content</div> }));
vi.mock('./tabs/UserManagement', () => ({ default: () => <div>User Management Content</div> }));
vi.mock('./tabs/RoleManagement', () => ({ default: () => <div>Role Management Content</div> }));
vi.mock('./tabs/MilestoneTemplates', () => ({ default: () => <div>Milestone Templates Content</div> }));
vi.mock('./tabs/GeneralConfig', () => ({ default: () => <div>General Config Content</div> }));

// Radix UI Tabs requires ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('SystemSettings Component', () => {
  it('renders all tabs', () => {
    render(<SystemSettings />);
    
    expect(screen.getByText('系统设置')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('角色权限')).toBeInTheDocument();
    expect(screen.getByText('里程碑模板')).toBeInTheDocument();
    expect(screen.getByText('报告模板')).toBeInTheDocument();
    expect(screen.getByText('AI配置')).toBeInTheDocument();
    expect(screen.getByText('通用设置')).toBeInTheDocument();
  });

  it('switches tabs correctly', async () => {
    const user = userEvent.setup();
    render(<SystemSettings />);

    // Default tab should be User Management
    expect(screen.getByText('User Management Content')).toBeVisible();

    // Click on Role Management
    await user.click(screen.getByText('角色权限'));
    await waitFor(() => {
      expect(screen.getByText('Role Management Content')).toBeVisible();
    });

    // Click on AI Config
    await user.click(screen.getByText('AI配置'));
    await waitFor(() => {
      expect(screen.getByText('AI Config Content')).toBeVisible();
    });
  });
});
