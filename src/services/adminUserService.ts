/**
 * 管理员用户服务
 * 封装用户管理相关的 API 调用
 */

import {
  UserFormData,
  UserListParams,
  UserListResponse,
  ResetPasswordMode,
  ResetPasswordResponse,
} from '@/types/admin';
import { Profile } from '@/types/user';

/**
 * 获取认证令牌
 */
function getAuthToken(): string | null {
  return localStorage.getItem('access_token');
}

/**
 * 构建请求头
 */
function buildHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * 处理响应
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || error.message || '请求失败');
  }
  return response.json();
}

/**
 * 管理员用户服务
 */
export const adminUserService = {
  /**
   * 获取用户列表
   */
  async getUsers(params?: UserListParams): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.role) queryParams.set('role', params.role);
    if (params?.is_active !== undefined) queryParams.set('is_active', params.is_active.toString());

    const query = queryParams.toString();
    const url = `/auth/v1/admin/users${query ? `?${query}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(),
    });

    return handleResponse<UserListResponse>(response);
  },

  /**
   * 创建用户
   */
  async createUser(data: UserFormData): Promise<{ success: boolean; user: Profile; message?: string }> {
    const response = await fetch('/auth/v1/admin/users', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<{ success: boolean; user: Profile; message?: string }>(response);
  },

  /**
   * 更新用户
   */
  async updateUser(
    id: string,
    data: Partial<UserFormData>
  ): Promise<{ success: boolean; user: Profile; message?: string }> {
    const response = await fetch(`/auth/v1/admin/users/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse<{ success: boolean; user: Profile; message?: string }>(response);
  },

  /**
   * 重置密码
   */
  async resetPassword(userId: string, mode: ResetPasswordMode): Promise<ResetPasswordResponse> {
    const response = await fetch(`/auth/v1/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        mode,
        fixedPassword: mode === 'fixed' ? 'POP-101-ADA' : undefined,
      }),
    });

    return handleResponse<ResetPasswordResponse>(response);
  },

  /**
   * 设置强制改密
   */
  async setForcePasswordChange(userId: string, force: boolean): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`/auth/v1/admin/users/${userId}/force-password-change`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ force }),
    });

    return handleResponse<{ success: boolean; message: string }>(response);
  },

  /**
   * 禁用/启用用户
   */
  async toggleUserStatus(userId: string, isActive: boolean): Promise<{ success: boolean; message?: string }> {
    if (isActive) {
      // 启用用户 - 使用更新接口
      const response = await fetch(`/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: buildHeaders(),
        body: JSON.stringify({ is_active: true }),
      });
      return handleResponse<{ success: boolean; message?: string }>(response);
    } else {
      // 禁用用户 - 使用删除接口
      const response = await fetch(`/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: buildHeaders(),
      });
      return handleResponse<{ success: boolean; message?: string }>(response);
    }
  },
};

export default adminUserService;
