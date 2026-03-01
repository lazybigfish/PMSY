import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * 全局错误处理中间件
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  // 处理特定错误类型
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation Error',
      message: err.message,
    });
    return;
  }
  
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
    return;
  }
  
  if (err.name === 'ForbiddenError') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Insufficient permissions',
    });
    return;
  }
  
  if (err.name === 'NotFoundError') {
    res.status(404).json({
      error: 'Not Found',
      message: err.message,
    });
    return;
  }
  
  // 数据库错误
  if (err.message?.includes('SQLITE_CONSTRAINT_UNIQUE')) {
    res.status(409).json({
      error: 'Conflict',
      message: 'Resource already exists',
    });
    return;
  }
  
  if (err.message?.includes('SQLITE_CONSTRAINT_FOREIGNKEY')) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Referenced resource does not exist',
    });
    return;
  }
  
  // 默认 500 错误
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDev() ? err.message : 'An unexpected error occurred',
  });
}

function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 自定义错误类
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}
