/**
 * 用户服务
 * 替代原有的 Supabase 用户相关调用
 */

import { api } from '../lib/api';
import type { Profile, UpdateUserRequest } from '../types';

/**
 * 获取所有用户
 */
export async function getUsers(): Promise<Profile[]> {
  const { data } = await api.db.from('profiles').select('*').order('created_at', { ascending: false });
  return data || [];
}

/**
 * 根据 ID 获取用户
 */
export async function getUserById(userId: string): Promise<Profile | null> {
  const response = await api.db.from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return response.data || null;
}

/**
 * 根据角色获取用户列表
 */
export async function getUsersByRole(role: string): Promise<Profile[]> {
  const { data } = await api.db.from('profiles')
    .select('*')
    .eq('role', role)
    .order('full_name');
  return data || [];
}

/**
 * 更新用户信息
 */
export async function updateUser(userId: string, data: UpdateUserRequest): Promise<Profile> {
  const result = await api.db.from('profiles').update({
    full_name: data.full_name,
    avatar_url: data.avatar_url,
    phone: data.phone,
    department: data.department,
    position: data.position,
  }).eq('id', userId);
  
  return result?.[0];
}

/**
 * 更新用户角色
 */
export async function updateUserRole(userId: string, role: string): Promise<void> {
  await api.db.from('profiles').update({ role }).eq('id', userId);
}

/**
 * 删除用户
 */
export async function deleteUser(userId: string): Promise<void> {
  await api.db.from('profiles').delete().eq('id', userId);
}

/**
 * 搜索用户
 */
export async function searchUsers(query: string): Promise<Profile[]> {
  const { data } = await api.db.from('profiles')
    .select('*')
    .ilike('full_name', `%${query}%`)
    .order('full_name');
  return data || [];
}

/**
 * 获取用户角色统计
 */
export async function getRoleCounts(): Promise<Record<string, number>> {
  const { data } = await api.db.from('profiles').select('role');
  const counts: Record<string, number> = {};
  
  (data || []).forEach((p: { role?: string | null }) => {
    const r = p.role || 'unknown';
    counts[r] = (counts[r] || 0) + 1;
  });
  
  return counts;
}

// 导出服务对象
export const userService = {
  getUsers,
  getUserById,
  getUsersByRole,
  updateUser,
  updateUserRole,
  deleteUser,
  searchUsers,
  getRoleCounts,
};
