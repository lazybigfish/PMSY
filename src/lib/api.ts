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
 * 基础过滤器操作接口（用于构建器内部）
 */
interface BaseFilterOperations<T> {
  eq: (column: string, value: any) => T;
  neq: (column: string, value: any) => T;
  gt: (column: string, value: any) => T;
  gte: (column: string, value: any) => T;
  lt: (column: string, value: any) => T;
  lte: (column: string, value: any) => T;
  like: (column: string, pattern: string) => T;
  ilike: (column: string, pattern: string) => T;
  in: (column: string, values: any[]) => T;
  is: (column: string, value: any) => T;
  not: (column: string, operator: string, value: any) => T;
}

/**
 * PostgREST 过滤器构建器
 */
interface PostgrestFilterBuilder<T = any> extends BaseFilterOperations<PostgrestFilterBuilder<T>> {
  order: (column: string, options?: { ascending?: boolean }) => PostgrestTransformBuilder<T>;
  limit: (count: number) => Promise<PostgrestResponse<T[]>>;
  single: () => Promise<PostgrestResponse<T>>;
  range: (from: number, to: number) => Promise<PostgrestResponse<T[]>>;
  then: (onFulfilled?: (value: PostgrestResponse<T[]>) => any, onRejected?: (reason: any) => any) => Promise<any>;
}

/**
 * PostgREST 转换构建器（在 order 之后使用）
 */
interface PostgrestTransformBuilder<T = any> extends BaseFilterOperations<PostgrestTransformBuilder<T>> {
  limit: (count: number) => Promise<PostgrestResponse<T[]>>;
  single: () => Promise<PostgrestResponse<T>>;
  range: (from: number, to: number) => Promise<PostgrestResponse<T[]>>;
  then: (onFulfilled?: (value: PostgrestResponse<T[]>) => any, onRejected?: (reason: any) => any) => Promise<any>;
}

/**
 * Insert 构建器
 */
interface PostgrestInsertBuilder<T = any> {
  select: (columns?: string) => Promise<PostgrestResponse<T[]>>;
  // 支持直接 await 获取结果
  then: (onFulfilled?: (value: PostgrestResponse<T[]>) => any, onRejected?: (reason: any) => any) => Promise<any>;
}

/**
 * Update 构建器
 */
interface PostgrestUpdateBuilder<T = any> extends BaseFilterOperations<PostgrestUpdateBuilder<T>> {
  then: (onFulfilled?: (value: PostgrestResponse<T[]>) => any, onRejected?: (reason: any) => any) => Promise<any>;
}

/**
 * Delete 构建器
 */
interface PostgrestDeleteBuilder<T = any> extends BaseFilterOperations<PostgrestDeleteBuilder<T>> {
  then: (onFulfilled?: (value: PostgrestResponse<null>) => any, onRejected?: (reason: any) => any) => Promise<any>;
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
    insert: (data: any | any[]) => PostgrestInsertBuilder<T>;
    update: (data: any) => PostgrestUpdateBuilder<T>;
    delete: () => PostgrestDeleteBuilder<T>;
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
      const addFilter = (builder: any, key: string, value: any) => {
        filters[key] = value;
        return builder;
      };

      const builder: PostgrestFilterBuilder<T> = {
        eq: (column: string, value: any) => addFilter(builder, `eq.${column}`, value) as PostgrestFilterBuilder<T>,
        neq: (column: string, value: any) => addFilter(builder, `neq.${column}`, value) as PostgrestFilterBuilder<T>,
        gt: (column: string, value: any) => addFilter(builder, `gt.${column}`, value) as PostgrestFilterBuilder<T>,
        gte: (column: string, value: any) => addFilter(builder, `gte.${column}`, value) as PostgrestFilterBuilder<T>,
        lt: (column: string, value: any) => addFilter(builder, `lt.${column}`, value) as PostgrestFilterBuilder<T>,
        lte: (column: string, value: any) => addFilter(builder, `lte.${column}`, value) as PostgrestFilterBuilder<T>,
        like: (column: string, pattern: string) => addFilter(builder, `like.${column}`, pattern) as PostgrestFilterBuilder<T>,
        ilike: (column: string, pattern: string) => addFilter(builder, `ilike.${column}`, pattern) as PostgrestFilterBuilder<T>,
        in: (column: string, values: any[]) => addFilter(builder, `in.${column}`, values.join(',')) as PostgrestFilterBuilder<T>,
        is: (column: string, value: any) => addFilter(builder, `is.${column}`, value) as PostgrestFilterBuilder<T>,
        not: (column: string, operator: string, value: any) => addFilter(builder, `not.${column}`, `${operator}.${value}`) as PostgrestFilterBuilder<T>,
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
      const addFilter = (builder: any, key: string, value: any) => {
        filters[key] = value;
        return builder;
      };

      const builder: PostgrestTransformBuilder<T> = {
        eq: (column: string, value: any) => addFilter(builder, `eq.${column}`, value) as PostgrestTransformBuilder<T>,
        neq: (column: string, value: any) => addFilter(builder, `neq.${column}`, value) as PostgrestTransformBuilder<T>,
        gt: (column: string, value: any) => addFilter(builder, `gt.${column}`, value) as PostgrestTransformBuilder<T>,
        gte: (column: string, value: any) => addFilter(builder, `gte.${column}`, value) as PostgrestTransformBuilder<T>,
        lt: (column: string, value: any) => addFilter(builder, `lt.${column}`, value) as PostgrestTransformBuilder<T>,
        lte: (column: string, value: any) => addFilter(builder, `lte.${column}`, value) as PostgrestTransformBuilder<T>,
        like: (column: string, pattern: string) => addFilter(builder, `like.${column}`, pattern) as PostgrestTransformBuilder<T>,
        ilike: (column: string, pattern: string) => addFilter(builder, `ilike.${column}`, pattern) as PostgrestTransformBuilder<T>,
        in: (column: string, values: any[]) => addFilter(builder, `in.${column}`, values.join(',')) as PostgrestTransformBuilder<T>,
        is: (column: string, value: any) => addFilter(builder, `is.${column}`, value) as PostgrestTransformBuilder<T>,
        not: (column: string, operator: string, value: any) => addFilter(builder, `not.${column}`, `${operator}.${value}`) as PostgrestTransformBuilder<T>,
        limit: (count: number) => buildQuery(columns, filters, orderColumn, orderAsc, count),
        single: () => buildQuery(columns, filters, orderColumn, orderAsc).then(r => ({ data: r.data?.[0] || null, error: r.error })),
        range: (from: number, to: number) => buildQuery(columns, filters, orderColumn, orderAsc, undefined, from, to),
        then: (onFulfilled?: any, onRejected?: any) => buildQuery(columns, filters, orderColumn, orderAsc).then(onFulfilled, onRejected),
      };
      return builder;
    };

    // 构建过滤条件字符串
    const buildFilterString = (filters: Record<string, any>): string => {
      return Object.entries(filters)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
    };

    // 创建 Update 构建器
    const createUpdateBuilder = (data: any): PostgrestUpdateBuilder<T> => {
      const filters: Record<string, any> = {};

      const executeUpdate = async (): Promise<PostgrestResponse<T[]>> => {
        const filterStr = buildFilterString(filters);
        const endpoint = `/rest/v1/${table}${filterStr ? '?' + filterStr : ''}`;
        
        try {
          const result = await request<T[]>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
          });
          return { data: result, error: null };
        } catch (error: any) {
          console.error(`[API] Update error to ${table}:`, error);
          return { data: null, error };
        }
      };

      const addFilter = (key: string, value: any) => {
        filters[key] = value;
        return builder;
      };

      const builder: PostgrestUpdateBuilder<T> = {
        eq: (column: string, value: any) => addFilter(`eq.${column}`, value) as PostgrestUpdateBuilder<T>,
        neq: (column: string, value: any) => addFilter(`neq.${column}`, value) as PostgrestUpdateBuilder<T>,
        gt: (column: string, value: any) => addFilter(`gt.${column}`, value) as PostgrestUpdateBuilder<T>,
        gte: (column: string, value: any) => addFilter(`gte.${column}`, value) as PostgrestUpdateBuilder<T>,
        lt: (column: string, value: any) => addFilter(`lt.${column}`, value) as PostgrestUpdateBuilder<T>,
        lte: (column: string, value: any) => addFilter(`lte.${column}`, value) as PostgrestUpdateBuilder<T>,
        like: (column: string, pattern: string) => addFilter(`like.${column}`, pattern) as PostgrestUpdateBuilder<T>,
        ilike: (column: string, pattern: string) => addFilter(`ilike.${column}`, pattern) as PostgrestUpdateBuilder<T>,
        in: (column: string, values: any[]) => addFilter(`in.${column}`, values.join(',')) as PostgrestUpdateBuilder<T>,
        is: (column: string, value: any) => addFilter(`is.${column}`, value) as PostgrestUpdateBuilder<T>,
        not: (column: string, operator: string, value: any) => addFilter(`not.${column}`, `${operator}.${value}`) as PostgrestUpdateBuilder<T>,
        then: (onFulfilled?: any, onRejected?: any) => executeUpdate().then(onFulfilled, onRejected),
      };

      return builder;
    };

    // 创建 Delete 构建器
    const createDeleteBuilder = (): PostgrestDeleteBuilder<T> => {
      const filters: Record<string, any> = {};

      const executeDelete = async (): Promise<PostgrestResponse<null>> => {
        const filterStr = buildFilterString(filters);
        const endpoint = `/rest/v1/${table}${filterStr ? '?' + filterStr : ''}`;
        
        try {
          await request(endpoint, {
            method: 'DELETE',
          });
          return { data: null, error: null };
        } catch (error: any) {
          console.error(`[API] Delete error from ${table}:`, error);
          return { data: null, error };
        }
      };

      const addFilter = (key: string, value: any) => {
        filters[key] = value;
        return builder;
      };

      const builder: PostgrestDeleteBuilder<T> = {
        eq: (column: string, value: any) => addFilter(`eq.${column}`, value) as PostgrestDeleteBuilder<T>,
        neq: (column: string, value: any) => addFilter(`neq.${column}`, value) as PostgrestDeleteBuilder<T>,
        gt: (column: string, value: any) => addFilter(`gt.${column}`, value) as PostgrestDeleteBuilder<T>,
        gte: (column: string, value: any) => addFilter(`gte.${column}`, value) as PostgrestDeleteBuilder<T>,
        lt: (column: string, value: any) => addFilter(`lt.${column}`, value) as PostgrestDeleteBuilder<T>,
        lte: (column: string, value: any) => addFilter(`lte.${column}`, value) as PostgrestDeleteBuilder<T>,
        like: (column: string, pattern: string) => addFilter(`like.${column}`, pattern) as PostgrestDeleteBuilder<T>,
        ilike: (column: string, pattern: string) => addFilter(`ilike.${column}`, pattern) as PostgrestDeleteBuilder<T>,
        in: (column: string, values: any[]) => addFilter(`in.${column}`, values.join(',')) as PostgrestDeleteBuilder<T>,
        is: (column: string, value: any) => addFilter(`is.${column}`, value) as PostgrestDeleteBuilder<T>,
        not: (column: string, operator: string, value: any) => addFilter(`not.${column}`, `${operator}.${value}`) as PostgrestDeleteBuilder<T>,
        then: (onFulfilled?: any, onRejected?: any) => executeDelete().then(onFulfilled, onRejected),
      };

      return builder;
    };

    return {
      select: (columns: string = '*') => createFilterBuilder(columns),
      insert: (data: any | any[]): PostgrestInsertBuilder<T> => {
        const executeInsert = async (): Promise<PostgrestResponse<T[]>> => {
          try {
            const result = await request<T[]>(`/rest/v1/${table}`, {
              method: 'POST',
              body: JSON.stringify(data),
            });
            return { data: result, error: null };
          } catch (error: any) {
            console.error(`[API] Insert error to ${table}:`, error);
            return { data: null, error };
          }
        };

        return {
          select: (columns?: string) => executeInsert(),
          then: (onFulfilled?: any, onRejected?: any) => executeInsert().then(onFulfilled, onRejected),
        };
      },
      update: (data: any) => createUpdateBuilder(data),
      delete: () => createDeleteBuilder(),
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
  get: async <T = any>(endpoint: string, options?: { params?: any }): Promise<T> => {
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
          return [] as T;
        }
        throw new Error(`HTTP ${r.status}`);
      }
      return r.json();
    });
  },
  post: async <T = any>(endpoint: string, data?: any, options?: any): Promise<T> => {
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
    }).then(async r => {
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${r.status}`);
      }
      return r.json();
    });
  },
  put: async <T = any>(endpoint: string, data?: any): Promise<T> => {
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
  patch: async <T = any>(endpoint: string, data?: any): Promise<T> => {
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
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
  delete: async <T = any>(endpoint: string): Promise<T> => {
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAccessToken() || ''}`,
      },
    }).then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // 处理空响应的情况
      const text = await r.text();
      if (!text) return { deleted: 0 } as T;
      try {
        return JSON.parse(text);
      } catch {
        return { deleted: 0 } as T;
      }
    });
  },
};

export default api;
