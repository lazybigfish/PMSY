import * as permissionService from '../../../src/services/permissionService';
import { db } from '../../../src/config/database';

// Mock 数据库
jest.mock('../../../src/config/database', () => ({
  db: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    first: jest.fn(),
    select: jest.fn().mockReturnThis(),
  })),
}));

describe('Permission Service', () => {
  const adminUser = {
    userId: 'admin-123',
    role: 'admin',
    email: 'admin@example.com',
  };

  const managerUser = {
    userId: 'manager-123',
    role: 'manager',
    email: 'manager@example.com',
  };

  const regularUser = {
    userId: 'user-123',
    role: 'user',
    email: 'user@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkTablePermission', () => {
    it('管理员应该可以访问所有表', async () => {
      const result = await permissionService.checkTablePermission('projects', adminUser, 'select');
      expect(result.allowed).toBe(true);
      expect(result.filter).toBeUndefined();
    });

    it('经理应该可以访问配置的表', async () => {
      const result = await permissionService.checkTablePermission('projects', managerUser, 'select');
      expect(result.allowed).toBe(true);
      expect(result.filter).toBeUndefined();
    });

    it('普通用户应该获得权限过滤条件', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([{ project_id: 'proj-1' }]),
      } as any);

      const result = await permissionService.checkTablePermission('projects', regularUser, 'select');
      expect(result.allowed).toBe(true);
      expect(result.filter).toBeDefined();
    });

    it('未配置权限的表应该只允许管理员访问', async () => {
      const result = await permissionService.checkTablePermission('unknown_table', regularUser, 'select');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('该表未配置权限，仅管理员可访问');
    });
  });

  describe('checkRecordPermission', () => {
    it('管理员应该可以访问任何记录', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ id: '1', created_by: 'other-user' }),
      } as any);

      const result = await permissionService.checkRecordPermission('projects', '1', adminUser, 'select');
      expect(result).toBe(true);
    });

    it('所有者应该可以访问自己的记录', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ id: '1', created_by: 'user-123' }),
      } as any);

      const result = await permissionService.checkRecordPermission('projects', '1', regularUser, 'select');
      expect(result).toBe(true);
    });

    it('非所有者不应该访问他人记录', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ id: '1', created_by: 'other-user' }),
      } as any);

      const result = await permissionService.checkRecordPermission('projects', '1', regularUser, 'select');
      expect(result).toBe(false);
    });

    it('项目成员应该可以访问项目相关记录', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue({ id: '1', project_id: 'proj-1', created_by: 'other-user' }),
        } as any)
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue({ user_id: 'user-123', project_id: 'proj-1' }),
        } as any);

      const result = await permissionService.checkRecordPermission('tasks', '1', regularUser, 'select');
      expect(result).toBe(true);
    });

    it('不存在的记录应该返回 false', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await permissionService.checkRecordPermission('projects', '999', regularUser, 'select');
      expect(result).toBe(false);
    });
  });

  describe('checkCreatePermission', () => {
    it('管理员应该可以创建任何记录', async () => {
      const result = await permissionService.checkCreatePermission('projects', { name: 'Test' }, adminUser);
      expect(result).toBe(true);
    });

    it('在项目中有成员权限的用户应该可以创建项目相关记录', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ user_id: 'user-123', project_id: 'proj-1' }),
      } as any);

      const result = await permissionService.checkCreatePermission('tasks', { project_id: 'proj-1', name: 'Test' }, regularUser);
      expect(result).toBe(true);
    });

    it('非项目成员不应该创建项目相关记录', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await permissionService.checkCreatePermission('tasks', { project_id: 'proj-1', name: 'Test' }, regularUser);
      expect(result).toBe(false);
    });

    it('没有 project_id 的数据默认允许创建', async () => {
      const result = await permissionService.checkCreatePermission('forum_posts', { title: 'Test' }, regularUser);
      expect(result).toBe(true);
    });
  });

  describe('getUserAccessibleProjects', () => {
    it('应该返回用户可访问的项目列表', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([
          { project_id: 'proj-1' },
          { project_id: 'proj-2' },
        ]),
      } as any);

      const result = await permissionService.getUserAccessibleProjects('user-123');
      expect(result).toEqual(['proj-1', 'proj-2']);
    });

    it('当用户没有项目时应该返回空数组', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await permissionService.getUserAccessibleProjects('user-123');
      expect(result).toEqual([]);
    });
  });

  describe('isProjectMember', () => {
    it('当用户是项目成员时应该返回 true', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ user_id: 'user-123', project_id: 'proj-1' }),
      } as any);

      const result = await permissionService.isProjectMember('user-123', 'proj-1');
      expect(result).toBe(true);
    });

    it('当用户不是项目成员时应该返回 false', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await permissionService.isProjectMember('user-123', 'proj-1');
      expect(result).toBe(false);
    });
  });

  describe('isProjectAdmin', () => {
    it('当用户是项目管理员时应该返回 true', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ user_id: 'user-123', project_id: 'proj-1', role: 'admin' }),
      } as any);

      const result = await permissionService.isProjectAdmin('user-123', 'proj-1');
      expect(result).toBe(true);
    });

    it('当用户是普通成员时应该返回 false', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ user_id: 'user-123', project_id: 'proj-1', role: 'member' }),
      } as any);

      const result = await permissionService.isProjectAdmin('user-123', 'proj-1');
      expect(result).toBe(false);
    });
  });

  describe('addPermissionToQuery', () => {
    it('管理员不应该添加权限过滤', async () => {
      const query = { status: 'active' };
      const result = await permissionService.addPermissionToQuery('projects', adminUser, query);
      expect(result).toEqual(query);
    });

    it('普通用户应该添加权限过滤', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([{ project_id: 'proj-1' }]),
      } as any);

      const query = { status: 'active' };
      const result = await permissionService.addPermissionToQuery('projects', regularUser, query);
      expect(result).toHaveProperty('_and');
    });

    it('空查询应该只返回权限过滤', async () => {
      const mockDb = db as jest.MockedFunction<typeof db>;
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([{ project_id: 'proj-1' }]),
      } as any);

      const result = await permissionService.addPermissionToQuery('projects', regularUser, {});
      expect(result).toHaveProperty('_or');
    });
  });
});
