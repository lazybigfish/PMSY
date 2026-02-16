/**
 * 管理员相关类型定义
 */

import { Profile } from './user';

/**
 * 重置密码模式
 */
export type ResetPasswordMode = 'random' | 'fixed';

/**
 * 重置密码请求
 */
export interface ResetPasswordRequest {
  mode: ResetPasswordMode;
  fixedPassword?: string; // mode='fixed' 时使用，默认 POP-101-ADA
}

/**
 * 重置密码响应
 */
export interface ResetPasswordResponse {
  success: boolean;
  newPassword: string;
  message: string;
}

/**
 * 强制改密请求
 */
export interface ForcePasswordChangeRequest {
  force: boolean; // true=强制, false=不强制
}

/**
 * 用户表单数据（新增/编辑）
 */
export interface UserFormData {
  username: string;
  full_name?: string;
  email?: string;
  password?: string; // 新增时必填
  role: string;
  is_active?: boolean; // 编辑时可修改
}

/**
 * 用户列表查询参数
 */
export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  is_active?: boolean;
}

/**
 * 用户列表响应
 */
export interface UserListResponse {
  users: Profile[];
  total: number;
}
