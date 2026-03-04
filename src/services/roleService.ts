/**
 * 角色权限服务
 * 替代原有的 Supabase 角色权限调用
 */

import { api, apiClient } from '../lib/api';
import type { 
  AppRole, 
  RolePermission, 
  RoleWithPermissions,
  CreateRoleRequest,
  UpdateRoleRequest,
  SystemModule 
} from '../types';

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

// 默认系统模块（与 types/role.ts 中保持一致）
export const DEFAULT_MODULES: SystemModule[] = [
  { key: 'dashboard', name: '工作台', description: '项目概览、统计信息、快捷入口' },
  { key: 'projects', name: '项目管理', description: '项目创建、里程碑、风险管理' },
  { key: 'tasks', name: '任务中心', description: '任务分配、进度跟踪、协作' },
  { key: 'stakeholders', name: '相关方', description: '供应商库、客户库管理、项目关联' },
  { key: 'analysis', name: '数据分析', description: '项目数据可视化分析' },
  { key: 'water', name: '水漫金山', description: '热点资讯、用户社区' },
  { key: 'files', name: '文件管理', description: '文件上传、存储、管理' },
  { key: 'system', name: '系统设置', description: '用户管理、角色权限、系统配置' },
];

/**
 * 获取所有角色
 */
export async function getRoles(): Promise<AppRole[]> {
  const { data } = await api.db.from('app_roles').select('*').order('name');
  return data || [];
}

/**
 * 获取角色详情（包含权限）
 */
export async function getRoleWithPermissions(roleKey: string): Promise<RoleWithPermissions | null> {
  // 1. 获取角色信息
  const { data: roleData } = await api.db.from('app_roles')
    .select('*')
    .eq('key', roleKey)
    .single();

  if (!roleData?.data) return null;

  // 2. 获取角色权限
  const { data: permissionsData } = await api.db.from('role_permissions')
    .select('module_key')
    .eq('role_key', roleKey);

  const permissions = (permissionsData || []).map((p: RolePermission) => p.module_key);

  return {
    ...roleData.data,
    permissions,
  };
}

/**
 * 创建角色
 */
export async function createRole(role: CreateRoleRequest): Promise<AppRole> {
  const data = await api.db.from('app_roles').insert({
    key: role.key,
    name: role.name,
    description: role.description || null,
  });
  
  return data?.[0];
}

/**
 * 更新角色
 */
export async function updateRole(roleKey: string, role: UpdateRoleRequest): Promise<AppRole> {
  const data = await api.db.from('app_roles').update({
    name: role.name,
    description: role.description,
  }).eq('key', roleKey);
  
  return data?.[0];
}

/**
 * 删除角色
 */
export async function deleteRole(roleKey: string): Promise<void> {
  await apiClient.post('/rest/v1/delete', {
    table: 'app_roles',
    conditions: { key: roleKey }
  });
}

/**
 * 获取角色的权限列表
 */
export async function getRolePermissions(roleKey: string): Promise<string[]> {
  const { data } = await api.db.from('role_permissions')
    .select('module_key')
    .eq('role_key', roleKey);

  return (data || []).map((p: RolePermission) => p.module_key);
}

/**
 * 保存角色权限（先删除旧权限，再插入新权限）
 * 使用 POST /rest/v1/role_permissions/save 端点，避免 DELETE 请求被网络环境拦截
 */
export async function saveRolePermissions(roleKey: string, moduleKeys: string[]): Promise<void> {
  // 使用新的 POST 端点，避免 DELETE 请求被拦截
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/rest/v1/role_permissions/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
    },
    body: JSON.stringify({
      role_key: roleKey,
      module_keys: moduleKeys,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '保存权限失败' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
}

/**
 * 检查角色是否有某模块权限
 */
export async function hasPermission(roleKey: string, moduleKey: string): Promise<boolean> {
  const permissions = await getRolePermissions(roleKey);
  return permissions.includes(moduleKey);
}

/**
 * 获取所有系统模块
 */
export function getSystemModules(): SystemModule[] {
  return DEFAULT_MODULES;
}

// 导出服务对象
export const roleService = {
  getRoles,
  getRoleWithPermissions,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  saveRolePermissions,
  hasPermission,
  getRoleCounts,
  getSystemModules,
  DEFAULT_MODULES,
};
