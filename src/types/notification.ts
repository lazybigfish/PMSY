/**
 * 通知相关类型定义
 */

export type NotificationType = 'task' | 'project' | 'system' | 'mention';
export type NotificationPriority = 'low' | 'normal' | 'high';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string | null;
  is_read: boolean;
  priority: NotificationPriority;
  created_at: string;
  read_at?: string | null;
}

export interface NotificationCount {
  total: number;
  unread: number;
}
