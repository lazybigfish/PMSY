import {
  hashPassword,
  verifyPassword,
} from '../../../src/utils/password';

describe('Password Utils', () => {
  const plainPassword = 'testPassword123';

  describe('hashPassword', () => {
    it('应该成功哈希密码', async () => {
      const hashed = await hashPassword(plainPassword);
      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
      expect(hashed.length).toBeGreaterThan(0);
    });

    it('相同的密码应该生成不同的哈希值', async () => {
      const hash1 = await hashPassword(plainPassword);
      const hash2 = await hashPassword(plainPassword);
      expect(hash1).not.toBe(hash2);
    });

    it('生成的哈希应该以 bcrypt 标识符开头', async () => {
      const hashed = await hashPassword(plainPassword);
      expect(hashed.startsWith('$2')).toBe(true);
    });

    it('应该能够处理空字符串密码', async () => {
      const hashed = await hashPassword('');
      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
    });

    it('应该能够处理长密码', async () => {
      const longPassword = 'a'.repeat(100);
      const hashed = await hashPassword(longPassword);
      expect(hashed).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    it('应该验证正确的密码', async () => {
      const hashed = await hashPassword(plainPassword);
      const isMatch = await verifyPassword(plainPassword, hashed);
      expect(isMatch).toBe(true);
    });

    it('应该拒绝错误的密码', async () => {
      const hashed = await hashPassword(plainPassword);
      const isMatch = await verifyPassword('wrongPassword', hashed);
      expect(isMatch).toBe(false);
    });

    it('应该拒绝空密码', async () => {
      const hashed = await hashPassword(plainPassword);
      const isMatch = await verifyPassword('', hashed);
      expect(isMatch).toBe(false);
    });

    it('应该处理不同的哈希值', async () => {
      const hashed1 = await hashPassword(plainPassword);
      const hashed2 = await hashPassword(plainPassword);
      
      const isMatch1 = await verifyPassword(plainPassword, hashed1);
      const isMatch2 = await verifyPassword(plainPassword, hashed2);
      
      expect(isMatch1).toBe(true);
      expect(isMatch2).toBe(true);
    });

    it('应该拒绝无效的哈希值', async () => {
      const isMatch = await verifyPassword(plainPassword, 'invalid-hash');
      expect(isMatch).toBe(false);
    });
  });

  describe('完整流程测试', () => {
    it('应该能够完成哈希和验证的完整流程', async () => {
      const password = 'mySecurePassword123!';
      
      const hashed = await hashPassword(password);
      const isMatch = await verifyPassword(password, hashed);
      
      expect(isMatch).toBe(true);
    });

    it('修改密码后旧密码应该失效', async () => {
      const oldPassword = 'oldPassword123';
      const newPassword = 'newPassword456';
      
      const oldHashed = await hashPassword(oldPassword);
      const newHashed = await hashPassword(newPassword);
      
      expect(await verifyPassword(oldPassword, oldHashed)).toBe(true);
      expect(await verifyPassword(newPassword, newHashed)).toBe(true);
      expect(await verifyPassword(oldPassword, newHashed)).toBe(false);
      expect(await verifyPassword(newPassword, oldHashed)).toBe(false);
    });
  });
});
