import {
  generateToken,
  verifyToken,
  decodeToken,
  generateRefreshToken,
  verifyRefreshToken,
  getExpiresIn,
  getExpiresAt,
} from '../../../src/services/jwtService';
import { JWTPayload } from '../../../src/types/auth';

describe('JWT Service', () => {
  const mockPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: 'user-123',
    email: 'test@example.com',
    role: 'user',
  };

  describe('generateToken', () => {
    it('应该生成有效的 JWT Token', () => {
      const token = generateToken(mockPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('生成的 Token 应该包含正确的 payload 信息', () => {
      const token = generateToken(mockPayload);
      const decoded = decodeToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(mockPayload.sub);
      expect(decoded?.email).toBe(mockPayload.email);
      expect(decoded?.role).toBe(mockPayload.role);
    });

    it('生成的 Token 应该包含签发时间和过期时间', () => {
      const token = generateToken(mockPayload);
      const decoded = decodeToken(token);
      expect(decoded?.iat).toBeDefined();
      expect(decoded?.exp).toBeDefined();
      expect(decoded!.exp).toBeGreaterThan(decoded!.iat);
    });
  });

  describe('verifyToken', () => {
    it('应该验证有效的 Token', () => {
      const token = generateToken(mockPayload);
      const payload = verifyToken(token);
      expect(payload.sub).toBe(mockPayload.sub);
      expect(payload.email).toBe(mockPayload.email);
      expect(payload.role).toBe(mockPayload.role);
    });

    it('应该抛出错误当 Token 无效时', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    it('应该抛出错误当 Token 被篡改时', () => {
      const token = generateToken(mockPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      expect(() => verifyToken(tamperedToken)).toThrow();
    });
  });

  describe('decodeToken', () => {
    it('应该解码有效的 Token', () => {
      const token = generateToken(mockPayload);
      const decoded = decodeToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(mockPayload.sub);
    });

    it('应该返回 null 当 Token 无效时', () => {
      const decoded = decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('解码时不应该验证签名', () => {
      const token = generateToken(mockPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      const decoded = decodeToken(tamperedToken);
      expect(decoded).not.toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    it('应该生成刷新 Token', () => {
      const refreshToken = generateRefreshToken('user-123');
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
    });

    it('刷新 Token 应该包含用户 ID 和类型', () => {
      const refreshToken = generateRefreshToken('user-123');
      const decoded = decodeToken(refreshToken);
      expect(decoded?.sub).toBe('user-123');
    });
  });

  describe('verifyRefreshToken', () => {
    it('应该验证有效的刷新 Token', () => {
      const refreshToken = generateRefreshToken('user-123');
      const userId = verifyRefreshToken(refreshToken);
      expect(userId).toBe('user-123');
    });

    it('应该抛出错误当 Token 类型不是 refresh 时', () => {
      const accessToken = generateToken(mockPayload);
      expect(() => verifyRefreshToken(accessToken)).toThrow('Invalid token type');
    });

    it('应该抛出错误当 Token 无效时', () => {
      expect(() => verifyRefreshToken('invalid-token')).toThrow();
    });
  });

  describe('getExpiresIn', () => {
    it('应该返回正确的过期时间（秒）', () => {
      const expiresIn = getExpiresIn();
      expect(expiresIn).toBeGreaterThan(0);
      expect(expiresIn).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('getExpiresAt', () => {
    it('应该返回未来的时间戳', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = getExpiresAt();
      expect(expiresAt).toBeGreaterThan(now);
    });

    it('应该等于当前时间加上过期时间', () => {
      const before = Math.floor(Date.now() / 1000);
      const expiresAt = getExpiresAt();
      const expiresIn = getExpiresIn();
      const after = Math.floor(Date.now() / 1000);
      
      expect(expiresAt).toBeGreaterThanOrEqual(before + expiresIn);
      expect(expiresAt).toBeLessThanOrEqual(after + expiresIn + 1);
    });
  });
});
