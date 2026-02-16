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
 * PostgREST 响应类型
 */
interface PostgrestResponse<T> {
  data: T | null;
  error: any;
}

/**
 * PostgREST 过滤器构建器
 */
interface PostgrestFilterBuilder<T = any> {
  eq: (column: string, value: any) => PostgrestFilterBuilder<T>;
  neq: (column: string, value: any) => PostgrestFilterBuilder<T>;
  gt: (column: string, value: any) => PostgrestFilterBuilder<T>;
  gte: (column: string, value: any) => PostgrestFilterBuilder<T>;
  lt: (column: string, value: any) => PostgrestFilterBuilder<T>;
  lte: (column: string, value: any) => PostgrestFilterBuilder<T>;
  like: (column: string, pattern: string) => PostgrestFilterBuilder<T>;
  ilike: (column: string, pattern: string) => PostgrestFilterBuilder<T>;
  in: (column: string, values: any[]) => PostgrestFilterBuilder<T>;
  is: (column: string, value: any) => PostgrestFilterBuilder<T>;
  not: (column: string, operator: string, value: any) => PostgrestFilterBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => PostgrestTransformBuilder<T>;
  limit: (count: number) => Promise<PostgrestResponse<T[]>>;
  single: () => Promise<PostgrestResponse<T>>;
  range: (from: number, to: number) => Promise<PostgrestResponse<T[]>>;
  then: (onFulfilled?: (value: PostgrestResponse<T[]>) => any, onRejected?: (reason: any) => any) => Promise<any>;
}

/**
 * PostgREST 转换构建器
 */
interface PostgrestTransformBuilder<T = any> {
  eq: (column: string, value: any) => PostgrestTransformBuilder<T>;
  neq: (column: string, value: any) => PostgrestTransformBuilder<T>;
  gt: (column: string, value: any) => PostgrestTransformBuilder<T>;
  gte: (column: string, value: any) => PostgrestTransformBuilder<T>;
  lt: (column: string, value: any) => PostgrestTransformBuilder<T>;
  lte: (column: string, value: any) => PostgrestTransformBuilder<T>;
  like: (column: string, pattern: string) => PostgrestTransformBuilder<T>;
  ilike: (column: string, pattern: string) => PostgrestTransformBuilder<T>;
  in: (column: string, values: any[]) => PostgrestTransformBuilder<T>;
  is: (column: string, value: any) => PostgrestTransformBuilder<T>;
  not: (column: string, operator: string, value: any) => PostgrestTransformBuilder<T>;
  limit: (count: number) => Promise<PostgrestResponse<T[]>>;
  single: () => Promise<PostgrestResponse<T>>;
  range: (from: number, to: number) => Promise<PostgrestResponse<T[]>>;
  then: (onFulfilled?: (value: PostgrestResponse<T[]>) => any, onRejected?: (reason: any) => any) => Promise<any>;
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
          username: string | null;
          role: string;
          avatar_url: string | null;
          department: string | null;
          position: string | null;
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
        username: string | null;
        role: string;
        avatar_url: string | null;
        department: string | null;
        position: string | null;
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
  from: <T = any>(table: string): {
    select: (columns?: string) => PostgrestFilterBuilder<T>;
    insert: (data: any | any[]) => Promise<PostgrestResponse<T[]>>;
    update: (data: any) => { eq: (column: string, value: any) => Promise<PostgrestResponse<T[]>> };
    delete: () => { eq: (column: string, value: any) => Promise<PostgrestResponse<null>> };
  } => {
    const buildQuery = (
      columns: string,
      filters: Record<string, any> = {},
      orderColumn?: string,
      orderAsc?: boolean,
      limitCount?: number,
      rangeFrom?: number,
      rangeTo?: number
    ): Promise<PostgrestResponse<T[]>> => {
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

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (rangeFrom !== undefined && rangeTo !== undefined) {
        headers['Range'] = `${rangeFrom}-${rangeTo}`;
        headers['Prefer'] = 'count=exact';
      }

      const token = getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return fetch(`${API_BASE_URL}/rest/v1/${table}?${params.toString()}`, {
        headers,
      }).then(async (response) => {
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: '请求失败' }));
          return { data: null, error };
        }
        const data = await response.json();
        return { data, error: null };
      }).catch((error) => ({ data: null, error }));
    };

    const createFilterBuilder = (columns: string, filters: Record<string, any> = {}): PostgrestFilterBuilder<T> => {
      const builder: PostgrestFilterBuilder<T> = {
        eq: (column: string, value: any) => {
          filters[`eq.${column}`] = value;
          return builder;
        },
        neq: (column: string, value: any) => {
          filters[`neq.${column}`] = value;
          return builder;
        },
        gt: (column: string, value: any) => {
          filters[`gt.${column}`] = value;
          return builder;
        },
        gte: (column: string, value: any) => {
          filters[`gte.${column}`] = value;
          return builder;
        },
        lt: (column: string, value: any) => {
          filters[`lt.${column}`] = value;
          return builder;
        },
        lte: (column: string, value: any) => {
          filters[`lte.${column}`] = value;
          return builder;
        },
        like: (column: string, pattern: string) => {
          filters[`like.${column}`] = pattern;
          return builder;
        },
        ilike: (column: string, pattern: string) => {
          filters[`ilike.${column}`] = pattern;
          return builder;
        },
        in: (column: string, values: any[]) => {
          filters[`in.${column}`] = values.join(',');
          return builder;
        },
        is: (column: string, value: any) => {
          filters[`is.${column}`] = value;
          return builder;
        },
        not: (column: string, operator: string, value: any) => {
          filters[`not.${column}`] = `${operator}.${value}`;
          return builder;
        },
        order: (column: string, options?: { ascending?: boolean }) => {
          return createTransformBuilder(columns, filters, column, options?.ascending !== false);
        },
        limit: (count: number) => buildQuery(columns, filters, undefined, undefined, count),
        single: () => buildQuery(columns, filters).then(r => ({ data: r.data?.[0] || null, error: r.error })),
        range: (from: number, to: number) => buildQuery(columns, filters, undefined, undefined, undefined, from, to),
        then: (onFulfilled?: any, onRejected?: any) => buildQuery(columns, filters).then(onFulfilled, onRejected),
      };
      return builder;
    };

    const createTransformBuilder = (
      columns: string,
      filters: Record<string, any> = {},
      orderColumn?: string,
      orderAsc?: boolean
    ): PostgrestTransformBuilder<T> => {
      const builder: PostgrestTransformBuilder<T> = {
        eq: (column: string, value: any) => {
          filters[`eq.${column}`] = value;
          return builder;
        },
        neq: (column: string, value: any) => {
          filters[`neq.${column}`] = value;
          return builder;
        },
        gt: (column: string, value: any) => {
          filters[`gt.${column}`] = value;
          return builder;
        },
        gte: (column: string, value: any) => {
          filters[`gte.${column}`] = value;
          return builder;
        },
        lt: (column: string, value: any) => {
          filters[`lt.${column}`] = value;
          return builder;
        },
        lte: (column: string, value: any) => {
          filters[`lte.${column}`] = value;
          return builder;
        },
        like: (column: string, pattern: string) => {
          filters[`like.${column}`] = pattern;
          return builder;
        },
        ilike: (column: string, pattern: string) => {
          filters[`ilike.${column}`] = pattern;
          return builder;
        },
        in: (column: string, values: any[]) => {
          filters[`in.${column}`] = values.join(',');
          return builder;
        },
        is: (column: string, value: any) => {
          filters[`is.${column}`] = value;
          return builder;
        },
        not: (column: string, operator: string, value: any) => {
          filters[`not.${column}`] = `${operator}.${value}`;
          return builder;
        },
        limit: (count: number) => buildQuery(columns, filters, orderColumn, orderAsc, count),
        single: () => buildQuery(columns, filters, orderColumn, orderAsc).then(r => ({ data: r.data?.[0] || null, error: r.error })),
        range: (from: number, to: number) => buildQuery(columns, filters, orderColumn, orderAsc, undefined, from, to),
        then: (onFulfilled?: any, onRejected?: any) => buildQuery(columns, filters, orderColumn, orderAsc).then(onFulfilled, onRejected),
      };
      return builder;
    };

    return {
      select: (columns: string = '*') => createFilterBuilder(columns),
      insert: (data: any | any[]): Promise<PostgrestResponse<T[]>> =>
        request<T[]>(`/rest/v1/${table}`, {
          method: 'POST',
          body: JSON.stringify(data),
        }).then(data => ({ data, error: null })).catch(error => {
          console.error(`[API] Insert error to ${table}:`, error);
          throw error;
        }),
      update: (data: any) => ({
        eq: (column: string, value: any): Promise<PostgrestResponse<T[]>> =>
          request<T[]>(`/rest/v1/${table}?eq.${column}=${value}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
          }).then(data => ({ data, error: null })).catch(error => {
            console.error(`[API] Update error to ${table}:`, error);
            throw error;
          }),
      }),
      delete: () => ({
        eq: (column: string, value: any): Promise<PostgrestResponse<null>> =>
          request(`/rest/v1/${table}?eq.${column}=${value}`, {
            method: 'DELETE',
          }).then(() => ({ data: null, error: null })).catch(error => {
            console.error(`[API] Delete error from ${table}:`, error);
            throw error;
          }),
      }),
    };
  },

  /**
   * 调用 PostgreSQL 函数/RPC
   */
  rpc: <T = any>(fn: string, params?: Record<string, any>): Promise<PostgrestResponse<T>> => {
    const token = getAccessToken();
    return fetch(`${API_BASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params || {}),
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'RPC 调用失败' }));
        return { data: null, error };
      }
      // RPC 可能返回空响应
      if (response.status === 204) {
        return { data: null, error: null };
      }
      const data = await response.json();
      return { data, error: null };
    }).catch((error) => ({ data: null, error }));
  },
};

/**
 * Storage Bucket 类型
 */
interface StorageBucket {
  id: string;
  name: string;
  owner: string;
  created_at: string;
  updated_at: string;
  public: boolean;
}

/**
 * Storage API
 */
export const storage = {
  /**
   * 列出所有存储桶
   */
  listBuckets: (): Promise<{ data: StorageBucket[] | null; error: any }> => {
    const token = getAccessToken();
    return fetch(`${API_BASE_URL}/storage/v1/bucket`, {
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: '获取存储桶列表失败' }));
        return { data: null, error };
      }
      const data = await response.json();
      return { data, error: null };
    }).catch((error) => ({ data: null, error }));
  },

  from: (bucket: string) => ({
    upload: async (path: string, file: File): Promise<{ data: { path: string } | null; error: any }> => {
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
        return { data: null, error };
      }

      const data = await response.json();
      return { data: { path: data?.Key || path }, error: null };
    },

    download: (path: string): Promise<Blob> =>
      request<Blob>(`/storage/v1/object/${bucket}/${path}`, {
        headers: {
          'Accept': '*/*',
        },
      }),

    getPublicUrl: (path: string): { data: { publicUrl: string } } => ({
      data: {
        publicUrl: `${API_BASE_URL}/storage/v1/object/public/${bucket}/${path}`
      }
    }),

    remove: (paths: string[]): Promise<{ data: any; error: any }> =>
      request(`/storage/v1/object/delete/${bucket}`, {
        method: 'POST',
        body: JSON.stringify({ prefixes: paths }),
      }).then(data => ({ data, error: null })).catch(error => ({ data: null, error })),
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

// API 客户端
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
      if (!r.ok) {
        // 404 视为空数据
        if (r.status === 404) {
          return [];
        }
        throw new Error(`HTTP ${r.status}`);
      }
      return r.json();
    });
  },
  post: async (endpoint: string, data?: any, options?: any) => {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${getAccessToken() || ''}`,
      ...options?.headers, // 合并传入的 headers
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
