import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/constants';
import { JWTPayload } from '../types/auth';

/**
 * JWT 服务
 * 用于生成和验证 JWT Token
 */

/**
 * 生成 JWT Token
 * @param payload - Token  payload
 * @returns 生成的 Token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const token = jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn as any,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
  });
  return token;
}

/**
 * 验证 JWT Token
 * @param token - 要验证的 Token
 * @returns 解析后的 payload
 * @throws 如果 Token 无效或过期
 */
export function verifyToken(token: string): JWTPayload {
  const payload = jwt.verify(token, JWT_CONFIG.secret, {
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
  }) as JWTPayload;
  return payload;
}

/**
 * 解析 JWT Token（不验证）
 * @param token - 要解析的 Token
 * @returns 解析后的 payload 或 null
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.decode(token) as JWTPayload | null;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * 生成刷新 Token
 * @param userId - 用户 ID
 * @returns 生成的刷新 Token
 */
export function generateRefreshToken(userId: string): string {
  const token = jwt.sign(
    { sub: userId, type: 'refresh' },
    JWT_CONFIG.secret,
    {
      expiresIn: '30d', // 刷新 Token 30 天有效
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    }
  );
  return token;
}

/**
 * 验证刷新 Token
 * @param token - 要验证的刷新 Token
 * @returns 用户 ID
 * @throws 如果 Token 无效或过期
 */
export function verifyRefreshToken(token: string): string {
  const payload = jwt.verify(token, JWT_CONFIG.secret, {
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
  }) as { sub: string; type: string };
  
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  
  return payload.sub;
}

/**
 * 获取 Token 过期时间（秒）
 * @returns 过期时间（秒）
 */
export function getExpiresIn(): number {
  // 解析 expiresIn（如 '7d' -> 604800 秒）
  const expiresIn = JWT_CONFIG.expiresIn;
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  
  if (!match) {
    return 7 * 24 * 60 * 60; // 默认 7 天
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      return 7 * 24 * 60 * 60;
  }
}

/**
 * 获取 Token 过期时间戳
 * @returns 过期时间戳（秒）
 */
export function getExpiresAt(): number {
  return Math.floor(Date.now() / 1000) + getExpiresIn();
}

export default {
  generateToken,
  verifyToken,
  decodeToken,
  generateRefreshToken,
  verifyRefreshToken,
  getExpiresIn,
  getExpiresAt,
};
