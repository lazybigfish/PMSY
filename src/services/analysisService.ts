/**
 * 分析报表服务
 * 替代原有的 Supabase 分析相关调用
 */

import { api } from '../lib/api';

// 项目统计
export interface ProjectStats {
  total: number;
  byStatus: Record<string, number>;
  completedThisMonth: number;
  inProgress: number;
}

// 任务统计
export interface TaskStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdue: number;
  completedThisWeek: number;
}

// 风险统计
export interface RiskStats {
  total: number;
  byLevel: Record<string, number>;
  byStatus: Record<string, number>;
  openHighRisks: number;
}

/**
 * 获取项目统计
 */
export async function getProjectStats(): Promise<ProjectStats> {
  const projects = await api.db.from('projects').select('status');

  const stats: ProjectStats = {
    total: 0,
    byStatus: {},
    completedThisMonth: 0,
    inProgress: 0,
  };

  if (!projects?.data) return stats;

  stats.total = projects.data.length;

  projects.data.forEach((p: { status: string }) => {
    stats.byStatus[p.status] = (stats.byStatus[p.status] || 0) + 1;
    if (p.status === 'in_progress') {
      stats.inProgress++;
    }
  });

  return stats;
}

/**
 * 获取任务统计
 */
export async function getTaskStats(): Promise<TaskStats> {
  const tasks = await api.db.from('tasks').select('status,priority,due_date');

  const stats: TaskStats = {
    total: 0,
    byStatus: {},
    byPriority: {},
    overdue: 0,
    completedThisWeek: 0,
  };

  if (!tasks?.data) return stats;

  stats.total = tasks.data.length;
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  tasks.data.forEach((t: { status: string; priority: string; due_date?: string; completed_at?: string }) => {
    stats.byStatus[t.status] = (stats.byStatus[t.status] || 0) + 1;
    stats.byPriority[t.priority] = (stats.byPriority[t.priority] || 0) + 1;

    if (t.status !== 'completed' && t.due_date && new Date(t.due_date) < now) {
      stats.overdue++;
    }

    if (t.status === 'completed' && t.completed_at) {
      const completedDate = new Date(t.completed_at);
      if (completedDate >= oneWeekAgo) {
        stats.completedThisWeek++;
      }
    }
  });

  return stats;
}

/**
 * 获取风险统计
 */
export async function getRiskStats(): Promise<RiskStats> {
  const risks = await api.db.from('risks').select('level,status');

  const stats: RiskStats = {
    total: 0,
    byLevel: {},
    byStatus: {},
    openHighRisks: 0,
  };

  if (!risks?.data) return stats;

  stats.total = risks.data.length;

  risks.data.forEach((r: { level: string; status: string }) => {
    stats.byLevel[r.level] = (stats.byLevel[r.level] || 0) + 1;
    stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;

    if (r.level === 'high' && r.status === 'open') {
      stats.openHighRisks++;
    }
  });

  return stats;
}

/**
 * 获取仪表盘数据（综合统计）
 */
export async function getDashboardStats(): Promise<{
  projects: ProjectStats;
  tasks: TaskStats;
  risks: RiskStats;
}> {
  const [projects, tasks, risks] = await Promise.all([
    getProjectStats(),
    getTaskStats(),
    getRiskStats(),
  ]);

  return {
    projects,
    tasks,
    risks,
  };
}

// 导出服务对象
export const analysisService = {
  getProjectStats,
  getTaskStats,
  getRiskStats,
  getDashboardStats,
};
