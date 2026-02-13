import { db } from '../config/database';
import { Knex } from 'knex';

/**
 * 权限服务
 * 在应用层实现行级安全（RLS）控制
 * 替代 Supabase 的 RLS 策略
 */

/**
 * 用户上下文
 */
export interface UserContext {
  userId: string;
  role: string;
  email: string;
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  filter?: Record<string, any>;
}

/**
 * 表权限配置
 */
interface TablePermission {
  // 哪些角色可以查看所有数据
  adminRoles: string[];
  // 用户只能查看自己的数据的字段
  ownerField?: string;
  // 关联表检查（如项目成员）
  memberCheck?: {
    table: string;
    userField: string;
    resourceField: string;
  };
}

// 表权限配置映射
const tablePermissions: Record<string, TablePermission> = {
  profiles: {
    adminRoles: ['admin'],
    ownerField: 'id',
  },
  projects: {
    adminRoles: ['admin', 'manager'],
    ownerField: 'created_by',
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  tasks: {
    adminRoles: ['admin', 'manager'],
    ownerField: 'assignee_id',
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  project_members: {
    adminRoles: ['admin', 'manager'],
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  milestones: {
    adminRoles: ['admin', 'manager'],
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  files: {
    adminRoles: ['admin', 'manager'],
    ownerField: 'uploaded_by',
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  folders: {
    adminRoles: ['admin', 'manager'],
    ownerField: 'created_by',
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  suppliers: {
    adminRoles: ['admin', 'manager'],
    memberCheck: {
      table: 'project_suppliers',
      userField: 'supplier_id',
      resourceField: 'project_id',
    },
  },
  risks: {
    adminRoles: ['admin', 'manager'],
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  reports: {
    adminRoles: ['admin', 'manager'],
    ownerField: 'created_by',
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  notifications: {
    adminRoles: ['admin'],
    ownerField: 'user_id',
  },
  forum_posts: {
    adminRoles: ['admin', 'manager'],
    ownerField: 'author_id',
  },
  forum_comments: {
    adminRoles: ['admin', 'manager'],
    ownerField: 'author_id',
  },
  hot_news: {
    adminRoles: ['admin', 'manager'],
    ownerField: 'created_by',
  },
  clients: {
    adminRoles: ['admin', 'manager'],
    memberCheck: {
      table: 'project_clients',
      userField: 'client_id',
      resourceField: 'project_id',
    },
  },
  // 系统表 - 仅管理员可访问
  app_roles: {
    adminRoles: ['admin'],
  },
  role_permissions: {
    adminRoles: ['admin'],
  },
  system_configs: {
    adminRoles: ['admin'],
  },
  operation_logs: {
    adminRoles: ['admin'],
  },
};

/**
 * 检查用户是否有权限访问表
 * @param table - 表名
 * @param user - 用户上下文
 * @param action - 操作类型
 * @returns 权限检查结果
 */
export async function checkTablePermission(
  table: string,
  user: UserContext,
  action: 'select' | 'insert' | 'update' | 'delete'
): Promise<PermissionCheckResult> {
  const permission = tablePermissions[table];

  // 如果没有配置权限，默认只允许管理员访问
  if (!permission) {
    if (user.role === 'admin') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: '该表未配置权限，仅管理员可访问',
    };
  }

  // 管理员角色可以访问所有数据
  if (permission.adminRoles.includes(user.role)) {
    return { allowed: true };
  }

  // 普通用户需要根据权限配置进行过滤
  return {
    allowed: true,
    filter: await buildPermissionFilter(table, user, permission),
  };
}

/**
 * 构建权限过滤条件
 * @param table - 表名
 * @param user - 用户上下文
 * @param permission - 权限配置
 * @returns 过滤条件
 */
async function buildPermissionFilter(
  table: string,
  user: UserContext,
  permission: TablePermission
): Promise<Record<string, any>> {
  const conditions: any[] = [];

  // 添加所有者条件
  if (permission.ownerField) {
    conditions.push({ [permission.ownerField]: user.userId });
  }

  // 添加成员检查条件
  if (permission.memberCheck) {
    try {
      // 查询用户有权限访问的资源 ID 列表
      const memberRecords = await db(permission.memberCheck.table)
        .where(permission.memberCheck.userField, user.userId)
        .select(permission.memberCheck.resourceField);

      const resourceIds = memberRecords.map(r => r[permission.memberCheck!.resourceField]);

      if (resourceIds.length > 0) {
        conditions.push({ project_id: resourceIds });
      }
    } catch (error) {
      // 如果关联表不存在，忽略错误
      console.warn(`Member check failed for table ${table}:`, error);
    }
  }

  // 如果没有条件，返回空对象（表示无权限）
  if (conditions.length === 0) {
    return { _no_access: true };
  }

  // 返回 OR 条件
  return { _or: conditions };
}

/**
 * 应用权限过滤到查询
 * @param query - Knex 查询构建器
 * @param table - 表名
 * @param user - 用户上下文
 * @returns 过滤后的查询
 */
export async function applyPermissionFilter(
  query: Knex.QueryBuilder,
  table: string,
  user: UserContext
): Promise<Knex.QueryBuilder> {
  const permission = tablePermissions[table];

  // 管理员角色不需要过滤
  if (permission && permission.adminRoles.includes(user.role)) {
    return query;
  }

  // 构建并应用过滤条件
  const filter = await buildPermissionFilter(table, user, permission || { adminRoles: ['admin'] });

  // 处理 OR 条件
  if (filter._or) {
    query = query.where(function() {
      for (const condition of filter._or) {
        this.orWhere(condition);
      }
    });
  }

  // 处理无权限情况
  if (filter._no_access) {
    query = query.whereRaw('1 = 0'); // 永远为假的条件
  }

  return query;
}

/**
 * 检查用户是否有权限操作特定记录
 * @param table - 表名
 * @param recordId - 记录 ID
 * @param user - 用户上下文
 * @param action - 操作类型
 * @returns 是否有权限
 */
export async function checkRecordPermission(
  table: string,
  recordId: string,
  user: UserContext,
  action: 'select' | 'insert' | 'update' | 'delete'
): Promise<boolean> {
  const permission = tablePermissions[table];

  // 管理员角色有所有权限
  if (permission && permission.adminRoles.includes(user.role)) {
    return true;
  }

  // 查询记录
  const record = await db(table).where({ id: recordId }).first();
  if (!record) {
    return false;
  }

  // 检查是否是所有者
  if (permission?.ownerField && record[permission.ownerField] === user.userId) {
    return true;
  }

  // 检查是否是项目成员
  if (permission?.memberCheck && record.project_id) {
    const isMember = await db(permission.memberCheck.table)
      .where({
        [permission.memberCheck.userField]: user.userId,
        [permission.memberCheck.resourceField]: record.project_id,
      })
      .first();

    if (isMember) {
      return true;
    }
  }

  return false;
}

/**
 * 检查用户是否有权限创建记录
 * @param table - 表名
 * @param data - 要创建的数据
 * @param user - 用户上下文
 * @returns 是否有权限
 */
export async function checkCreatePermission(
  table: string,
  data: Record<string, any>,
  user: UserContext
): Promise<boolean> {
  const permission = tablePermissions[table];

  // 管理员角色有所有权限
  if (permission && permission.adminRoles.includes(user.role)) {
    return true;
  }

  // 检查是否有 project_id，并且用户是项目成员
  if (data.project_id && permission?.memberCheck) {
    const isMember = await db(permission.memberCheck.table)
      .where({
        [permission.memberCheck.userField]: user.userId,
        [permission.memberCheck.resourceField]: data.project_id,
      })
      .first();

    return !!isMember;
  }

  // 默认允许创建（在应用层控制）
  return true;
}

/**
 * 获取用户可访问的项目 ID 列表
 * @param userId - 用户 ID
 * @returns 项目 ID 列表
 */
export async function getUserAccessibleProjects(userId: string): Promise<string[]> {
  const projects = await db('project_members')
    .where('user_id', userId)
    .select('project_id');

  return projects.map(p => p.project_id);
}

/**
 * 检查用户是否是项目成员
 * @param userId - 用户 ID
 * @param projectId - 项目 ID
 * @returns 是否是成员
 */
export async function isProjectMember(userId: string, projectId: string): Promise<boolean> {
  const member = await db('project_members')
    .where({
      user_id: userId,
      project_id: projectId,
    })
    .first();

  return !!member;
}

/**
 * 检查用户是否是项目管理员
 * @param userId - 用户 ID
 * @param projectId - 项目 ID
 * @returns 是否是项目管理员
 */
export async function isProjectAdmin(userId: string, projectId: string): Promise<boolean> {
  const member = await db('project_members')
    .where({
      user_id: userId,
      project_id: projectId,
      role: 'admin',
    })
    .first();

  return !!member;
}

/**
 * 添加权限过滤到 REST API 查询
 * 这是用于 REST 路由的中间件函数
 * @param table - 表名
 * @param user - 用户上下文
 * @param query - 原始查询条件
 * @returns 添加权限过滤后的查询条件
 */
export async function addPermissionToQuery(
  table: string,
  user: UserContext,
  query: Record<string, any>
): Promise<Record<string, any>> {
  const permission = tablePermissions[table];

  // 管理员角色不需要过滤
  if (permission && permission.adminRoles.includes(user.role)) {
    return query;
  }

  // 构建权限过滤条件
  const filter = await buildPermissionFilter(table, user, permission || { adminRoles: ['admin'] });

  // 如果无权限，返回一个永远为假的条件
  if (filter._no_access) {
    return { ...query, _no_access: true };
  }

  // 合并查询条件和权限条件
  if (filter._or) {
    // 如果有现有的查询条件，需要与权限条件结合
    if (Object.keys(query).length > 0) {
      return {
        _and: [query, { _or: filter._or }],
      };
    }
    return { _or: filter._or };
  }

  return query;
}

export default {
  checkTablePermission,
  applyPermissionFilter,
  checkRecordPermission,
  checkCreatePermission,
  getUserAccessibleProjects,
  isProjectMember,
  isProjectAdmin,
  addPermissionToQuery,
};
