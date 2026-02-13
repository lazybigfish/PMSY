/**
 * API 客户端配置
 * 替代原有的 Supabase 客户端
 * 使用自研后端 API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * 获取存储的访问令牌
 */
function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

/**
 * 基础请求函数
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Auth API
 */
export const auth = {
  /**
   * 用户登录
   */
  signIn: (email: string, password: string) =>
    request<{
      access_token: string;
      token_type: string;
      expires_in: number;
      expires_at: number;
      refresh_token: string;
      user: {
        id: string;
        email: string;
        user_metadata: {
          full_name: string | null;
          role: string;
          avatar_url: string | null;
        };
        created_at: string;
      };
    }>('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  /**
   * 用户注册
   */
  signUp: (data: {
    email: string;
    password: string;
    full_name?: string;
    username?: string;
  }) =>
    request<{
      user: any;
      session: any;
    }>('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 用户退出
   */
  signOut: () =>
    request('/auth/v1/logout', {
      method: 'POST',
    }),

  /**
   * 获取当前用户信息
   */
  getUser: () =>
    request<{
      id: string;
      email: string;
      user_metadata: {
        full_name: string | null;
        role: string;
        avatar_url: string | null;
      };
      created_at: string;
      updated_at: string;
      last_sign_in_at: string | null;
    }>('/auth/v1/user'),

  /**
   * 更新用户信息
   */
  updateUser: (data: {
    full_name?: string;
    avatar_url?: string;
    phone?: string;
  }) =>
    request('/auth/v1/user', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * 更新密码
   */
  updatePassword: (oldPassword: string, newPassword: string) =>
    request('/auth/v1/user/password', {
      method: 'POST',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    }),
};

/**
 * Database API (REST)
 * 模拟 Supabase 的查询接口
 */
export const db = {
  /**
   * 查询数据
   */
  from: (table: string) => {
    const buildQuery = (columns: string, filters: Record<string, any> = {}, orderColumn?: string, orderAsc?: boolean, limitCount?: number) => {
      const params = new URLSearchParams();
      params.append('select', columns);
      
      Object.entries(filters).forEach(([key, value]) => {
        params.append(key, value);
      });
      
      if (orderColumn) {
        params.append('order', `${orderColumn}.${orderAsc !== false ? 'asc' : 'desc'}`);
      }
      
      if (limitCount) {
        params.append('limit', limitCount.toString());
      }
      
      return request<any[]>(`/rest/v1/${table}?${params.toString()}`);
    };

    return {
      select: (columns: string = '*') => {
        const filters: Record<string, any> = {};
        
        const chainable = {
          eq: (column: string, value: any) => {
            filters[`eq.${column}`] = value;
            return chainable;
          },
          neq: (column: string, value: any) => {
            filters[`neq.${column}`] = value;
            return chainable;
          },
          gt: (column: string, value: any) => {
            filters[`gt.${column}`] = value;
            return chainable;
          },
          gte: (column: string, value: any) => {
            filters[`gte.${column}`] = value;
            return chainable;
          },
          lt: (column: string, value: any) => {
            filters[`lt.${column}`] = value;
            return chainable;
          },
          lte: (column: string, value: any) => {
            filters[`lte.${column}`] = value;
            return chainable;
          },
          like: (column: string, pattern: string) => {
            filters[`like.${column}`] = pattern;
            return chainable;
          },
          ilike: (column: string, pattern: string) => {
            filters[`ilike.${column}`] = pattern;
            return chainable;
          },
          in: (column: string, values: any[]) => {
            filters[`in.${column}`] = values.join(',');
            return chainable;
          },
          is: (column: string, value: any) => {
            filters[`is.${column}`] = value;
            return chainable;
          },
          order: (column: string, options?: { ascending?: boolean }) => {
            return {
              limit: (count: number) => {
                return buildQuery(columns, filters, column, options?.ascending !== false, count);
              },
              then: (onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) => {
                return buildQuery(columns, filters, column, options?.ascending !== false).then(onFulfilled, onRejected);
              }
            };
          },
          limit: (count: number) => {
            return buildQuery(columns, filters, undefined, undefined, count);
          },
          single: () => {
            return buildQuery(columns, filters).then(r => r[0] || null);
          },
          then: (onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) => {
            return buildQuery(columns, filters).then(onFulfilled, onRejected);
          }
        };
        
        return chainable;
      },
      insert: (data: any | any[]) =>
        request<any[]>(`/rest/v1/${table}`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (data: any) => ({
        eq: (column: string, value: any) =>
          request<any[]>(`/rest/v1/${table}?eq.${column}=${value}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
          }),
      }),
      delete: () => ({
        eq: (column: string, value: any) =>
          request(`/rest/v1/${table}?eq.${column}=${value}`, {
            method: 'DELETE',
          }),
      }),
    };
  },
};

/**
 * Storage API
 */
export const storage = {
  from: (bucket: string) => ({
    upload: async (path: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: '上传失败' }));
        throw new Error(error.message);
      }

      return response.json();
    },

    download: (path: string) =>
      request<Blob>(`/storage/v1/object/${bucket}/${path}`, {
        headers: {
          'Accept': '*/*',
        },
      }),

    getPublicUrl: (path: string) =>
      `${API_BASE_URL}/storage/v1/object/public/${bucket}/${path}`,

    remove: (paths: string[]) =>
      request(`/storage/v1/object/delete/${bucket}`, {
        method: 'POST',
        body: JSON.stringify({ prefixes: paths }),
      }),
  }),
};

/**
 * 导出 API 客户端
 */
export const api = {
  auth,
  db,
  storage,
  request,
};

// 为了兼容 supabase.ts 的导入，提供 apiClient
// 使用 axios 风格的 API 调用方式
export const apiClient = {
  get: async (endpoint: string, options?: { params?: any }) => {
    const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin);
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${getAccessToken() || ''}`,
      },
    }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  },
  post: async (endpoint: string, data?: any, options?: any) => {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${getAccessToken() || ''}`,
    };
    
    let body: BodyInit | undefined;
    if (data instanceof FormData) {
      body = data;
    } else if (data) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }
    
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body,
    }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  },
  put: async (endpoint: string, data?: any) => {
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessToken() || ''}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  },
  delete: async (endpoint: string) => {
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAccessToken() || ''}`,
      },
    }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  },
};

export default api;
