/**
 * 认证服务
 * 替代原有的 Supabase 认证调用
 */

import { api } from '../lib/api';
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse,
  UpdateUserRequest,
  UpdatePasswordRequest,
  User 
} from '../types';

/**
 * 登录
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await api.auth.signIn(email, password);
  
  // 存储 token
  localStorage.setItem('access_token', response.access_token);
  localStorage.setItem('refresh_token', response.refresh_token);
  localStorage.setItem('expires_at', response.expires_at.toString());
  
  return response;
}

/**
 * 注册
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  return await api.auth.signUp(data);
}

/**
 * 退出登录
 */
export async function logout(): Promise<void> {
  try {
    await api.auth.signOut();
  } finally {
    // 清除本地存储
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    return await api.auth.getUser();
  } catch {
    return null;
  }
}

/**
 * 更新用户信息
 */
export async function updateUser(data: UpdateUserRequest): Promise<void> {
  await api.auth.updateUser(data);
}

/**
 * 更新密码
 */
export async function updatePassword(oldPassword: string, newPassword: string): Promise<void> {
  await api.auth.updatePassword(oldPassword, newPassword);
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem('access_token');
  const expiresAt = localStorage.getItem('expires_at');
  
  if (!token || !expiresAt) {
    return false;
  }
  
  // 检查 token 是否过期
  return Date.now() < parseInt(expiresAt) * 1000;
}

/**
 * 获取存储的 token
 */
export function getToken(): string | null {
  return localStorage.getItem('access_token');
}

// 导出服务对象
export const authService = {
  login,
  register,
  logout,
  getCurrentUser,
  updateUser,
  updatePassword,
  isAuthenticated,
  getToken,
};
