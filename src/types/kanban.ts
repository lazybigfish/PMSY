/**
 * 看板视图相关类型定义
 */
import type { Task, TaskStatus, TaskPriority } from './task';

// 看板分组维度
export type KanbanGroupBy = 'status' | 'priority' | 'assignee' | 'module';

// 看板列配置
export interface KanbanColumn {
  id: string;
  title: string;
  value: string;
  color?: string;
  order: number;
}

// 看板配置（用户偏好）
export interface KanbanConfig {
  groupBy: KanbanGroupBy;
  columns: KanbanColumn[];
  isConfigOpen: boolean;
}

// 看板任务项（带UI状态）
export interface KanbanTask extends Task {
  isDragging?: boolean;
  isOverdue?: boolean;
  assignees?: Array<{
    id: string;
    user_id: string;
    user?: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    };
  }>;
}

// 看板状态
export interface KanbanState {
  tasks: KanbanTask[];
  columns: KanbanColumn[];
  groupBy: KanbanGroupBy;
  isLoading: boolean;
  error: string | null;
}

// 看板分组（列数据）
export interface KanbanGroup {
  column: KanbanColumn;
  tasks: KanbanTask[];
}

// 默认列配置 - 按状态
export const DEFAULT_STATUS_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: '待办', value: 'todo', color: '#94a3b8', order: 0 },
  { id: 'in_progress', title: '进行中', value: 'in_progress', color: '#3b82f6', order: 1 },
  { id: 'paused', title: '已暂停', value: 'paused', color: '#f59e0b', order: 2 },
  { id: 'done', title: '已完成', value: 'done', color: '#22c55e', order: 3 },
  { id: 'canceled', title: '已取消', value: 'canceled', color: '#ef4444', order: 4 },
];

// 默认列配置 - 按优先级
export const DEFAULT_PRIORITY_COLUMNS: KanbanColumn[] = [
  { id: 'urgent', title: '紧急', value: 'urgent', color: '#ef4444', order: 0 },
  { id: 'high', title: '高', value: 'high', color: '#f97316', order: 1 },
  { id: 'medium', title: '中', value: 'medium', color: '#eab308', order: 2 },
  { id: 'low', title: '低', value: 'low', color: '#22c55e', order: 3 },
];

// 状态映射
export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  paused: '已暂停',
  done: '已完成',
  canceled: '已取消',
};

// 优先级映射
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

// 优先级颜色
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};
