/**
 * Supabase 兼容层 - 迁移到新 API
 * 
 * 这个文件提供了一个与 Supabase 客户端 API 兼容的接口，
 * 但底层使用新的 REST API 实现。
 * 
 * 迁移说明：
 * - 原有的 supabase 代码可以继续工作
 * - 新的代码建议使用 src/lib/api.ts 中的 apiClient
 */

import { apiClient } from './api';

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

// 模拟 Supabase 的 PostgrestBuilder 接口
class PostgrestQueryBuilder {
  private table: string;
  private filters: Array<{ column: string; operator: string; value: any }> = [];
  private selectColumns: string = '*';
  private orderConfig: { column: string; ascending: boolean } | null = null;
  private limitValue: number | null = null;
  private singleMode: boolean = false;
  private eqFilters: Record<string, any> = {};

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: any) {
    this.eqFilters[column] = value;
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

      const response = await apiClient.get(`/rest/${this.table}`, { params });
      
      let data = response.data;
      
      // 处理 single() 模式
      if (this.singleMode && Array.isArray(data)) {
        data = data[0] || null;
      }

      return {
        data,
        error: null,
        count: Array.isArray(data) ? data.length : 1
      };
    } catch (error: any) {
      return {
        data: null,
        error: new SupabaseError(error.message, error.code || 'QUERY_ERROR'),
        count: null
      };
    }
  }

  // 使 thenable，支持 await
  then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) {
    return this.execute().then(onFulfilled, onRejected);
  }
}

// 模拟 Supabase 的 PostgrestFilterBuilder
class PostgrestFilterBuilder extends PostgrestQueryBuilder {
  match(query: Record<string, any>) {
    Object.entries(query).forEach(([column, value]) => {
      this.eq(column, value);
    });
    return this;
  }
}

// 模拟 Supabase 的 Auth 客户端
class AuthClient {
  private currentSession: any = null;
  private currentUser: any = null;

  async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
    try {
      const response = await apiClient.post('/auth/signup', {
        email,
        password,
        full_name: options?.data?.full_name
      });
      
      this.currentSession = response.data.session;
      this.currentUser = response.data.user;
      
      return {
        data: {
          user: this.currentUser,
          session: this.currentSession
        },
        error: null
      };
    } catch (error: any) {
      return {
        data: { user: null, session: null },
        error: new SupabaseError(error.message, error.code || 'SIGNUP_ERROR')
      };
    }
  }

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password
      });
      
      this.currentSession = response.data.session;
      this.currentUser = response.data.user;
      
      // 保存到 localStorage
      localStorage.setItem('token', response.data.session.access_token);
      
      return {
        data: {
          user: this.currentUser,
          session: this.currentSession
        },
        error: null
      };
    } catch (error: any) {
      return {
        data: { user: null, session: null },
        error: new SupabaseError(error.message, error.code || 'LOGIN_ERROR')
      };
    }
  }

  async signOut() {
    try {
      await apiClient.post('/auth/logout');
      this.currentSession = null;
      this.currentUser = null;
      localStorage.removeItem('token');
      
      return { error: null };
    } catch (error: any) {
      return {
        error: new SupabaseError(error.message, error.code || 'LOGOUT_ERROR')
      };
    }
  }

  async getSession() {
    const token = localStorage.getItem('token');
    if (!token) {
      return { data: { session: null }, error: null };
    }
    
    try {
      const response = await apiClient.get('/auth/me');
      this.currentUser = response.data.user;
      
      return {
        data: {
          session: {
            access_token: token,
            user: this.currentUser
          }
        },
        error: null
      };
    } catch (error: any) {
      return {
        data: { session: null },
        error: new SupabaseError(error.message, error.code || 'SESSION_ERROR')
      };
    }
  }

  async getUser() {
    try {
      const response = await apiClient.get('/auth/me');
      this.currentUser = response.data.user;
      
      return {
        data: { user: this.currentUser },
        error: null
      };
    } catch (error: any) {
      return {
        data: { user: null },
        error: new SupabaseError(error.message, error.code || 'USER_ERROR')
      };
    }
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    // 简化的实现 - 实际项目中可能需要 WebSocket 或轮询
    const checkSession = async () => {
      const { data } = await this.getSession();
      if (data.session) {
        callback('SIGNED_IN', data.session);
      } else {
        callback('SIGNED_OUT', null);
      }
    };
    
    // 立即检查一次
    checkSession();
    
    // 返回取消订阅函数
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            // 清理逻辑
          }
        }
      }
    };
  }

  async resetPasswordForEmail(email: string, options?: any) {
    try {
      await apiClient.post('/auth/reset-password', { email });
      return { data: {}, error: null };
    } catch (error: any) {
      return {
        data: null,
        error: new SupabaseError(error.message, error.code || 'RESET_ERROR')
      };
    }
  }

  async updateUser(attributes: any) {
    try {
      const response = await apiClient.put('/auth/profile', attributes);
      this.currentUser = response.data.user;
      
      return {
        data: { user: this.currentUser },
        error: null
      };
    } catch (error: any) {
      return {
        data: { user: null },
        error: new SupabaseError(error.message, error.code || 'UPDATE_ERROR')
      };
    }
  }
}

// 模拟 Supabase 的 Storage 客户端
class StorageClient {
  from(bucket: string) {
    return {
      upload: async (path: string, file: File) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('bucket', bucket);
          formData.append('path', path);
          
          const response = await apiClient.post('/storage/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          return {
            data: { path: response.data.path },
            error: null
          };
        } catch (error: any) {
          return {
            data: null,
            error: new SupabaseError(error.message, error.code || 'UPLOAD_ERROR')
          };
        }
      },
      
      download: async (path: string) => {
        try {
          const response = await apiClient.get(`/storage/download/${bucket}/${path}`, {
            responseType: 'blob'
          });
          
          return {
            data: response.data,
            error: null
          };
        } catch (error: any) {
          return {
            data: null,
            error: new SupabaseError(error.message, error.code || 'DOWNLOAD_ERROR')
          };
        }
      },
      
      getPublicUrl: (path: string) => {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        return {
          data: {
            publicUrl: `${baseUrl}/storage/public/${bucket}/${path}`
          }
        };
      },
      
      remove: async (paths: string[]) => {
        try {
          await apiClient.post('/storage/delete', {
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
            error: new SupabaseError(error.message, error.code || 'DELETE_ERROR')
          };
        }
      },
      
      list: async (prefix: string = '', options?: any) => {
        try {
          const response = await apiClient.get(`/storage/list/${bucket}`, {
            params: { prefix, ...options }
          });
          
          return {
            data: response.data,
            error: null
          };
        } catch (error: any) {
          return {
            data: null,
            error: new SupabaseError(error.message, error.code || 'LIST_ERROR')
          };
        }
      }
    };
  }
}

// 模拟 Supabase 的 Realtime 客户端（简化版）
class RealtimeClient {
  channel(name: string) {
    return {
      on: (event: string, callback: (payload: any) => void) => {
        // 简化的实现 - 实际项目中需要 WebSocket
        console.warn(`Realtime channel '${name}' - Realtime not fully implemented in compatibility layer`);
        return {
          subscribe: () => {
            console.warn('Realtime subscription not implemented');
          }
        };
      }
    };
  }
}

// 创建兼容层客户端
class SupabaseClient {
  auth: AuthClient;
  storage: StorageClient;
  realtime: RealtimeClient;

  constructor() {
    this.auth = new AuthClient();
    this.storage = new StorageClient();
    this.realtime = new RealtimeClient();
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
              const response = await apiClient.post(`/rpc/${functionName}`, params);
              return {
                data: response.data,
                error: null
              };
            } catch (error: any) {
              return {
                data: null,
                error: new SupabaseError(error.message, error.code || 'RPC_ERROR')
              };
            }
          }
        };
      },
      
      single: async () => {
        try {
          const response = await apiClient.post(`/rpc/${functionName}`, params);
          return {
            data: response.data,
            error: null
          };
        } catch (error: any) {
          return {
            data: null,
            error: new SupabaseError(error.message, error.code || 'RPC_ERROR')
          };
        }
      }
    };
  }
}

// 导出单例实例
export const supabase = new SupabaseClient();

// 导出类型（兼容性）
export type Session = {
  access_token: string;
  refresh_token?: string;
  user: any;
  expires_at?: number;
};

export type User = {
  id: string;
  email: string;
  user_metadata?: any;
  app_metadata?: any;
  created_at?: string;
  updated_at?: string;
};

// 默认导出
export default supabase;
