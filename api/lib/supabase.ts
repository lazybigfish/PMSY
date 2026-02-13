/**
 * Supabase 服务器端兼容层 - 迁移到新 API
 * 
 * 这个文件提供了一个与 Supabase Admin 客户端 API 兼容的接口，
 * 但底层使用新的 REST API 实现。
 * 
 * 用于服务器端代码（如 API 路由）
 */

import dotenv from 'dotenv';

dotenv.config();

// API 基础 URL
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

// 模拟 Supabase 的错误类型
export class SupabaseError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: any) {
    super(message);
    this.name = 'SupabaseError';
    this.code = code;
    this.details = details;
  }
}

// 简单的 HTTP 客户端
async function apiGet(path: string, options?: { params?: any }) {
  const url = new URL(path, API_BASE_URL);
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function apiPost(path: string, body?: any) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function apiPut(path: string, body?: any) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function apiDelete(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// 模拟 Supabase 的 PostgrestBuilder 接口
class PostgrestQueryBuilder {
  private table: string;
  private filters: Array<{ column: string; operator: string; value: any }> = [];
  private selectColumns: string = '*';
  private orderConfig: { column: string; ascending: boolean } | null = null;
  private limitValue: number | null = null;
  private singleMode: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ column, operator: 'gt', value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ column, operator: 'lt', value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ column, operator: 'lte', value });
    return this;
  }

  like(column: string, pattern: string) {
    this.filters.push({ column, operator: 'like', value: pattern });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ column, operator: 'ilike', value: pattern });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  is(column: string, value: any) {
    this.filters.push({ column, operator: 'is', value });
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.orderConfig = { column, ascending };
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  single() {
    this.singleMode = true;
    return this;
  }

  async execute() {
    try {
      const params: any = {};
      
      // 构建查询参数
      if (this.selectColumns !== '*') {
        params.select = this.selectColumns;
      }
      
      // 添加过滤器
      this.filters.forEach(filter => {
        params[filter.column] = `${filter.operator}.${filter.value}`;
      });
      
      // 添加排序
      if (this.orderConfig) {
        params.order = `${this.orderConfig.column}.${this.orderConfig.ascending ? 'asc' : 'desc'}`;
      }
      
      // 添加限制
      if (this.limitValue) {
        params.limit = this.limitValue;
      }

      const data = await apiGet(`/rest/${this.table}`, { params });
      
      let result = data;
      
      // 处理 single() 模式
      if (this.singleMode && Array.isArray(data)) {
        result = data[0] || null;
      }

      return {
        data: result,
        error: null,
        count: Array.isArray(data) ? data.length : 1
      };
    } catch (error: any) {
      return {
        data: null,
        error: new SupabaseError(error.message, 'QUERY_ERROR'),
        count: null
      };
    }
  }

  // 使 thenable，支持 await
  then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) {
    return this.execute().then(onFulfilled, onRejected);
  }
}

// 模拟 Supabase Admin Auth 客户端
class AuthAdminClient {
  async createUser({ email, password, email_confirm = true, user_metadata = {} }: any) {
    try {
      const data = await apiPost('/auth/admin/create-user', {
        email,
        password,
        full_name: user_metadata.full_name,
        role: user_metadata.role
      });
      
      return {
        data: { user: data.user },
        error: null
      };
    } catch (error: any) {
      return {
        data: { user: null },
        error: new SupabaseError(error.message, 'CREATE_USER_ERROR')
      };
    }
  }

  async listUsers() {
    try {
      const data = await apiGet('/auth/admin/users');
      
      return {
        data: { users: data.users },
        error: null
      };
    } catch (error: any) {
      return {
        data: { users: [] },
        error: new SupabaseError(error.message, 'LIST_USERS_ERROR')
      };
    }
  }

  async getUserById(userId: string) {
    try {
      const data = await apiGet(`/auth/admin/users/${userId}`);
      
      return {
        data: { user: data.user },
        error: null
      };
    } catch (error: any) {
      return {
        data: { user: null },
        error: new SupabaseError(error.message, 'GET_USER_ERROR')
      };
    }
  }

  async updateUserById(userId: string, attributes: any) {
    try {
      const data = await apiPut(`/auth/admin/users/${userId}`, attributes);
      
      return {
        data: { user: data.user },
        error: null
      };
    } catch (error: any) {
      return {
        data: { user: null },
        error: new SupabaseError(error.message, 'UPDATE_USER_ERROR')
      };
    }
  }

  async deleteUser(userId: string) {
    try {
      await apiDelete(`/auth/admin/users/${userId}`);
      
      return {
        data: { user: null },
        error: null
      };
    } catch (error: any) {
      return {
        data: { user: null },
        error: new SupabaseError(error.message, 'DELETE_USER_ERROR')
      };
    }
  }
}

// 模拟 Supabase Admin Storage 客户端
class StorageAdminClient {
  from(bucket: string) {
    return {
      upload: async (path: string, file: Buffer, options?: any) => {
        try {
          const data = await apiPost('/storage/upload', {
            bucket,
            path,
            file: file.toString('base64'),
            contentType: options?.contentType
          });
          
          return {
            data: { path: data.path },
            error: null
          };
        } catch (error: any) {
          return {
            data: null,
            error: new SupabaseError(error.message, 'UPLOAD_ERROR')
          };
        }
      },
      
      download: async (path: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/storage/download/${bucket}/${path}`);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          
          return {
            data: Buffer.from(arrayBuffer),
            error: null
          };
        } catch (error: any) {
          return {
            data: null,
            error: new SupabaseError(error.message, 'DOWNLOAD_ERROR')
          };
        }
      },
      
      getPublicUrl: (path: string) => {
        return {
          data: {
            publicUrl: `${API_BASE_URL}/storage/public/${bucket}/${path}`
          }
        };
      },
      
      remove: async (paths: string[]) => {
        try {
          await apiPost('/storage/delete', {
            bucket,
            paths
          });
          
          return {
            data: paths.map(path => ({ name: path })),
            error: null
          };
        } catch (error: any) {
          return {
            data: null,
            error: new SupabaseError(error.message, 'DELETE_ERROR')
          };
        }
      }
    };
  }
}

// 创建 Admin 客户端
class SupabaseAdminClient {
  auth: AuthAdminClient;
  storage: StorageAdminClient;

  constructor() {
    this.auth = new AuthAdminClient();
    this.storage = new StorageAdminClient();
  }

  from(table: string): PostgrestQueryBuilder {
    return new PostgrestQueryBuilder(table);
  }

  rpc(functionName: string, params?: any) {
    return {
      select: (columns: string = '*') => {
        return {
          single: async () => {
            try {
              const data = await apiPost(`/rpc/${functionName}`, params);
              return {
                data,
                error: null
              };
            } catch (error: any) {
              return {
                data: null,
                error: new SupabaseError(error.message, 'RPC_ERROR')
              };
            }
          }
        };
      },
      
      single: async () => {
        try {
          const data = await apiPost(`/rpc/${functionName}`, params);
          return {
            data,
            error: null
          };
        } catch (error: any) {
          return {
            data: null,
            error: new SupabaseError(error.message, 'RPC_ERROR')
          };
        }
      }
    };
  }
}

// 导出 Admin 客户端实例
export const supabaseAdmin = new SupabaseAdminClient();

// 为了兼容性，同时导出 supabase
export const supabase = supabaseAdmin;

// 默认导出
export default supabaseAdmin;
