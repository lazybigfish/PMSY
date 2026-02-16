/**
 * API 通用类型定义
 */

// API 响应标准格式
export interface ApiResponse<T> {
  data: T;
  error: null | ApiError;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// 分页请求参数
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// 分页响应格式
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 排序参数
export interface SortParams {
  column: string;
  ascending?: boolean;
}

// 过滤条件
export interface FilterParams {
  [key: string]: any;
}

// 查询选项
export interface QueryOptions {
  select?: string;
  filters?: FilterParams;
  sort?: SortParams;
  pagination?: PaginationParams;
}
