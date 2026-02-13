import {
  findUserByEmail,
  findUserById,
  findUserByUsername,
  register,
  login,
  getUserInfo,
  updateUser,
  updatePassword,
  adminUpdateUser,
  listUsers,
  deactivateUser,
} from '../../../src/services/authService';
import { db } from '../../../src/config/database';
import { hashPassword } from '../../../src/utils/password';

// Mock 数据库
jest.mock('../../../src/config/database', () => ({
  db: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
  })),
}));

describe('Auth Service', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    password_hash: '$2a$10$hashedpassword',
    full_name: 'Test User',
    avatar_url: null,
    role: 'user',
    phone: null,
    is_active: true,
    email_confirmed_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_sign_in_at: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findUserByEmail', () => {
    it('应该根据邮箱找到用户', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const user = await findUserByEmail('test@example.com');
      expect(user).toEqual(mockUser);
    });

    it('当用户不存在时应该返回 null', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as any);

      const user = await findUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('应该根据 ID 找到用户', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const user = await findUserById('user-123');
      expect(user).toEqual(mockUser);
    });
  });

  describe('findUserByUsername', () => {
    it('应该根据用户名找到用户', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const user = await findUserByUsername('testuser');
      expect(user).toEqual(mockUser);
    });
  });

  describe('register', () => {
    it('应该成功注册新用户', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
        insert: jest.fn().mockResolvedValue([1]),
      } as any);

      const result = await register({
        email: 'newuser@example.com',
        password: 'password123',
        full_name: 'New User',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('session');
      expect(result.session).toHaveProperty('access_token');
      expect(result.session).toHaveProperty('refresh_token');
    });

    it('当邮箱已存在时应该抛出错误', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
      } as any);

      await expect(
        register({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('该邮箱已被注册');
    });

    it('当用户名已存在时应该抛出错误', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(null),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockUser),
        } as any);

      await expect(
        register({
          email: 'newuser@example.com',
          password: 'password123',
          username: 'testuser',
        })
      ).rejects.toThrow('该用户名已被使用');
    });
  });

  describe('login', () => {
    it('应该成功登录并返回 Token', async () => {
      const hashedPassword = await hashPassword('password123');
      const userWithPassword = { ...mockUser, password_hash: hashedPassword };

      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(userWithPassword),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          update: jest.fn().mockResolvedValue(1),
        } as any);

      const result = await login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('session');
      expect(result.session).toHaveProperty('access_token');
      expect(result.session).toHaveProperty('refresh_token');
    });

    it('当用户不存在时应该抛出错误', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('邮箱或密码错误');
    });

    it('当账号被禁用时应该抛出错误', async () => {
      const disabledUser = { ...mockUser, is_active: false };
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(disabledUser),
      } as any);

      await expect(
        login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('账号已被禁用');
    });

    it('当密码错误时应该抛出错误', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
      } as any);

      await expect(
        login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('邮箱或密码错误');
    });
  });

  describe('getUserInfo', () => {
    it('应该返回用户信息（不包含密码）', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const user = await getUserInfo('user-123');
      expect(user).toBeDefined();
      expect(user?.id).toBe('user-123');
    });

    it('当用户不存在时应该返回 null', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as any);

      const user = await getUserInfo('nonexistent-id');
      expect(user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('应该成功更新用户信息', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockUser),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(null),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          update: jest.fn().mockResolvedValue(1),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue({ ...mockUser, full_name: 'Updated Name' }),
        } as any);

      const result = await updateUser('user-123', { full_name: 'Updated Name' });
      expect(result).toBeDefined();
    });

    it('当用户不存在时应该抛出错误', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        updateUser('nonexistent-id', { full_name: 'New Name' })
      ).rejects.toThrow('用户不存在');
    });
  });

  describe('updatePassword', () => {
    it('应该成功更新密码', async () => {
      const hashedPassword = await hashPassword('oldpassword');
      const userWithPassword = { ...mockUser, password_hash: hashedPassword };

      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(userWithPassword),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          update: jest.fn().mockResolvedValue(1),
        } as any);

      await expect(
        updatePassword('user-123', 'oldpassword', 'newpassword123')
      ).resolves.not.toThrow();
    });

    it('当旧密码错误时应该抛出错误', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser),
      } as any);

      await expect(
        updatePassword('user-123', 'wrongpassword', 'newpassword123')
      ).rejects.toThrow('旧密码错误');
    });
  });

  describe('adminUpdateUser', () => {
    it('管理员应该能够更新用户角色', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockUser),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          update: jest.fn().mockResolvedValue(1),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue({ ...mockUser, role: 'admin' }),
        } as any);

      const result = await adminUpdateUser('user-123', { role: 'admin' });
      expect(result).toBeDefined();
    });

    it('管理员应该能够重置用户密码', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockUser),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          update: jest.fn().mockResolvedValue(1),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockUser),
        } as any);

      const result = await adminUpdateUser('user-123', { password: 'newpassword123' });
      expect(result).toBeDefined();
    });
  });

  describe('listUsers', () => {
    it('应该返回用户列表和总数', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: '10' }),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      } as any);

      const result = await listUsers({ page: 1, limit: 10 });
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('total');
      expect(result.users).toHaveLength(1);
    });
  });

  describe('deactivateUser', () => {
    it('应该成功禁用用户', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue(mockUser),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          update: jest.fn().mockResolvedValue(1),
        } as any);

      await expect(deactivateUser('user-123')).resolves.not.toThrow();
    });

    it('当用户不存在时应该抛出错误', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(deactivateUser('nonexistent-id')).rejects.toThrow('用户不存在');
    });
  });
});
