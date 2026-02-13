import { Request, Response, NextFunction } from 'express';

/**
 * 错误处理中间件
 * 统一处理应用中的错误并返回标准格式的响应
 */

/**
 * 应用错误类
 * 用于创建带有状态码的业务错误
 */
export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request 错误
 */
export class BadRequestError extends AppError {
  constructor(message: string = '请求参数错误', code: string = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

/**
 * 401 Unauthorized 错误
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权', code: string = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

/**
 * 403 Forbidden 错误
 */
export class ForbiddenError extends AppError {
  constructor(message: string = '禁止访问', code: string = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

/**
 * 404 Not Found 错误
 */
export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在', code: string = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

/**
 * 409 Conflict 错误
 */
export class ConflictError extends AppError {
  constructor(message: string = '资源冲突', code: string = 'CONFLICT') {
    super(message, 409, code);
  }
}

/**
 * 422 Unprocessable Entity 错误
 */
export class ValidationError extends AppError {
  errors?: Record<string, string[]>;

  constructor(
    message: string = '数据验证失败',
    errors?: Record<string, string[]>,
    code: string = 'VALIDATION_ERROR'
  ) {
    super(message, 422, code);
    this.errors = errors;
  }
}

/**
 * 错误响应接口
 */
interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  statusCode: number;
  stack?: string;
  errors?: Record<string, string[]>;
}

/**
 * 全局错误处理中间件
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 默认错误信息
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = '服务器内部错误';
  let errors: Record<string, string[]> | undefined;

  // 处理自定义应用错误
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    if (err instanceof ValidationError) {
      errors = err.errors;
    }
  }
  // 处理数据库唯一约束冲突
  else if ((err as any).code === '23505') {
    statusCode = 409;
    errorCode = 'DUPLICATE_ENTRY';
    message = '数据已存在';
  }
  // 处理数据库外键约束错误
  else if ((err as any).code === '23503') {
    statusCode = 400;
    errorCode = 'FOREIGN_KEY_VIOLATION';
    message = '关联数据不存在';
  }
  // 处理 JWT 错误
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = '无效的认证令牌';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = '认证令牌已过期';
  }
  // 处理其他已知错误
  else if (err.message) {
    message = err.message;
  }

  // 构建错误响应
  const errorResponse: ErrorResponse = {
    error: err.name || 'Error',
    code: errorCode,
    message: message,
    statusCode: statusCode,
  };

  // 开发环境下包含堆栈信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // 包含验证错误详情
  if (errors) {
    errorResponse.errors = errors;
  }

  // 记录错误日志
  if (statusCode >= 500) {
    console.error('Server Error:', err);
  } else {
    console.log('Client Error:', statusCode, message);
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 路由未找到处理
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    code: 'ROUTE_NOT_FOUND',
    message: `路由 ${req.method} ${req.path} 不存在`,
    statusCode: 404,
  });
}

export default {
  errorHandler,
  notFoundHandler,
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
};
