/**
 * 通知服务
 * 替代原有的 Supabase 通知相关调用
 */

import { api } from '../lib/api';
import type { Notification } from '../types';

/**
 * 获取用户通知列表
 */
export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data } = await api.db
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { data } = await api.db
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('is_read', false);
  return data?.length || 0;
}

/**
 * 标记通知为已读
 */
export async function markAsRead(notificationId: string): Promise<void> {
  await api.db
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
}

/**
 * 标记所有通知为已读
 */
export async function markAllAsRead(userId: string): Promise<void> {
  const { data } = await api.db
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false);
  
  if (data && data.length > 0) {
    for (const notification of data) {
      await api.db
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notification.id);
    }
  }
}

/**
 * 删除通知
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  await api.db
    .from('notifications')
    .delete()
    .eq('id', notificationId);
}

/**
 * 创建通知
 */
export async function createNotification(data: {
  user_id: string;
  type: 'task' | 'project' | 'system' | 'mention';
  title: string;
  content: string;
  link?: string;
  priority?: 'low' | 'normal' | 'high';
}): Promise<Notification> {
  const result = await api.db.from('notifications').insert({
    user_id: data.user_id,
    type: data.type,
    title: data.title,
    content: data.content,
    link: data.link || null,
    priority: data.priority || 'normal',
    is_read: false,
  });
  return result?.[0];
}

// 导出服务对象
export const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
};
