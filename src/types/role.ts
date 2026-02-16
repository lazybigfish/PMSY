/**
 * 角色权限相关类型定义
 */

// 应用角色
export interface AppRole {
  key: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by?: string | null;
}

// 角色权限
export interface RolePermission {
  id: string;
  role_key: string;
  module_key: string;
  created_at: string;
}

// 角色权限关联（带模块信息）
export interface RoleWithPermissions extends AppRole {
  permissions: string[]; // module_key 数组
}

// 创建角色请求
export interface CreateRoleRequest {
  key: string;
  name: string;
  description?: string;
}

// 更新角色请求
export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

// 保存角色权限请求
export interface SaveRolePermissionsRequest {
  role_key: string;
  module_keys: string[];
}

// 系统模块定义
export interface SystemModule {
  key: string;
  name: string;
  description: string | null;
  icon?: string;
  sort_order?: number;
}

// 默认系统模块
export const DEFAULT_MODULES: SystemModule[] = [
  { key: 'dashboard', name: '工作台', description: '个人工作台和概览' },
  { key: 'projects', name: '项目管理', description: '项目创建、编辑、跟踪' },
  { key: 'tasks', name: '任务管理', description: '任务分配、进度跟踪' },
  { key: 'suppliers', name: '供应商', description: '供应商管理' },
  { key: 'analysis', name: '统计分析', description: '数据分析和报表' },
  { key: 'water', name: '水区', description: '论坛和交流' },
  { key: 'files', name: '文件管理', description: '文件上传、下载、管理' },
  { key: 'system', name: '系统设置', description: '系统配置和管理' },
];
