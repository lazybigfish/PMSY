import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

// JWT 密钥（与后端保持一致）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * 认证中间件
 * 验证 JWT token
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 跳过健康检查
  if (req.path === '/health') {
    next();
    return;
  }
  
  // 获取 Authorization 头
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    });
    return;
  }
  
  const token = authHeader.substring(7);
  
  try {
    // 验证 token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      email: string;
      role: string;
    };
    
    // 将用户信息附加到请求对象
    (req as any).user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    logger.warn('Invalid JWT token:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
}

/**
 * 可选认证中间件
 * 验证 token 但不阻止请求
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        sub: string;
        email: string;
        role: string;
      };
      
      (req as any).user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      // 可选认证，失败不阻止请求
      logger.debug('Optional auth failed:', error);
    }
  }
  
  next();
}
