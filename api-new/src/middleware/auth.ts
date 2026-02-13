import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwtService';
import { JWTPayload } from '../types/auth';

/**
 * 认证中间件
 * 验证 JWT Token 并将用户信息附加到请求对象
 */

/**
 * 要求认证的中间件
 * 验证请求头中的 Authorization Token
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: '未提供认证令牌',
      code: 'MISSING_TOKEN',
    });
    return;
  }

  // 提取 Token（Bearer token）
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      error: '认证令牌格式错误',
      code: 'INVALID_TOKEN_FORMAT',
    });
    return;
  }

  const token = parts[1];

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      error: '认证令牌无效或已过期',
      code: 'INVALID_TOKEN',
    });
  }
}

/**
 * 可选认证中间件
 * 如果有 Token 则解析用户信息，没有也不报错
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    next();
    return;
  }

  const token = parts[1];

  try {
    const payload = verifyToken(token);
    req.user = payload;
  } catch (error) {
    // 可选认证，解析失败也不报错
  }

  next();
}

/**
 * 要求特定角色的中间件
 * @param allowedRoles - 允许的角色列表
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 先检查是否已认证
    if (!req.user) {
      res.status(401).json({
        error: '未提供认证令牌',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    // 检查角色权限
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: '权限不足',
        code: 'INSUFFICIENT_PERMISSIONS',
        required_roles: allowedRoles,
        current_role: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * 要求管理员权限的中间件
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRole(['admin'])(req, res, next);
}

/**
 * 要求管理员或经理权限的中间件
 */
export function requireAdminOrManager(req: Request, res: Response, next: NextFunction): void {
  return requireRole(['admin', 'manager'])(req, res, next);
}

export default {
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireAdminOrManager,
};
