import type { TaskStatus, TaskPriority } from './task';

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export type GanttViewMode = 'day' | 'week' | 'month';

export interface GanttTask {
  id: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  progress: number;
  status: TaskStatus;
  priority: TaskPriority;
  assignees?: Array<{
    id: string;
    user_id: string;
    user?: { full_name: string; avatar_url: string };
  }>;
  dependencies?: string[];
}

export interface GanttConfig {
  viewMode: GanttViewMode;
  columnWidth: number;
  rowHeight: number;
  barHeight: number;
}

export interface GanttColumn {
  date: Date;
  label: string;
  isWeekend: boolean;
  isToday: boolean;
  isFirstDayOfMonth: boolean;
}

export interface GanttDependency {
  fromTaskId: string;
  toTaskId: string;
  type: DependencyType;
}

export const DEFAULT_GANTT_CONFIG: GanttConfig = {
  viewMode: 'week',
  columnWidth: 100,
  rowHeight: 50,
  barHeight: 30,
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#94a3b8',
  in_progress: '#3b82f6',
  paused: '#f59e0b',
  done: '#22c55e',
  canceled: '#6b7280',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  paused: '已暂停',
  done: '已完成',
  canceled: '已取消',
};
