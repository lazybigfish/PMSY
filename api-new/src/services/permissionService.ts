import { db } from '../config/database';
import { Knex } from 'knex';

/**
 * 权限服务
 * 在应用层实现行级安全（RLS）控制
 * 替代 Supabase 的 RLS 策略
 *
 * 权限控制逻辑：
 * 1. 系统管理员(admin)：拥有全局数据访问权限，可查看和管理系统内所有项目及任务数据
 * 2. 项目创建者与项目内项目经理角色(manager)：
 *    - 具备项目查看与编辑的全部权限
 *    - 拥有所有相关任务的查看与编辑权限
 * 3. 项目团队成员(member)：
 *    - 可查看所有相关项目的基本信息
 *    - 拥有项目供应商页面的更新权限
 *    - 拥有项目风险页面的更新权限
 *    - 拥有周日报相关内容的更新权限
 *    - 可更新对应任务的状态及进度
 * 4. 相关方（通过客户详情跳转至项目信息页）：
 *    - 非项目组成员仅能查看项目概览页面
 *    - 无任何编辑权限
 *
 * 任务查看权限规则（由精细到粗）：
 * 1. 自己创建的任务 - 始终可见
 * 2. 自己是处理人的任务 - 始终可见
 * 3. 任务状态为"项目内公开"(is_public=true) 且 自己是项目组成员 - 可见
 * 4. 其他情况 - 不可见
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
 * 项目权限级别
 */
export type ProjectPermissionLevel = 'none' | 'viewer' | 'member' | 'manager' | 'admin';

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
    adminRoles: ['admin'],
    ownerField: 'manager_id', // 项目经理是管理者
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  tasks: {
    adminRoles: ['admin'],
    ownerField: 'created_by', // 任务创建者
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  project_members: {
    adminRoles: ['admin'],
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  milestones: {
    adminRoles: ['admin'],
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  files: {
    adminRoles: ['admin'],
    ownerField: 'uploaded_by',
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  folders: {
    adminRoles: ['admin'],
    ownerField: 'created_by',
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  suppliers: {
    adminRoles: ['admin'],
    memberCheck: {
      table: 'project_suppliers',
      userField: 'supplier_id',
      resourceField: 'project_id',
    },
  },
  project_suppliers: {
    adminRoles: ['admin'],
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  risks: {
    adminRoles: ['admin'],
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  reports: {
    adminRoles: ['admin'],
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
    adminRoles: ['admin'],
    ownerField: 'author_id',
  },
  forum_comments: {
    adminRoles: ['admin'],
    ownerField: 'author_id',
  },
  hot_news: {
    adminRoles: ['admin'],
    ownerField: 'created_by',
  },
  clients: {
    adminRoles: ['admin'],
    memberCheck: {
      table: 'project_clients',
      userField: 'client_id',
      resourceField: 'project_id',
    },
  },
  project_clients: {
    adminRoles: ['admin'],
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  task_assignees: {
    adminRoles: ['admin'],
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  task_comments: {
    adminRoles: ['admin'],
    ownerField: 'created_by',
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  task_progress_logs: {
    adminRoles: ['admin'],
    ownerField: 'user_id',
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  project_modules: {
    adminRoles: ['admin'],
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
      resourceField: 'project_id',
    },
  },
  task_modules: {
    adminRoles: ['admin'],
    memberCheck: {
      table: 'project_members',
      userField: 'user_id',
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
 * 获取用户在项目中的权限级别
 * @param userId - 用户 ID
 * @param projectId - 项目 ID
 * @returns 权限级别
 */
export async function getProjectPermissionLevel(
  userId: string,
  projectId: string
): Promise<ProjectPermissionLevel> {
  // 1. 检查是否是系统管理员
  const user = await db('profiles').where({ id: userId }).first();
  if (user?.role === 'admin') {
    return 'admin';
  }

  // 2. 检查是否是项目经理（manager_id）
  const project = await db('projects').where({ id: projectId }).first();
  if (project?.manager_id === userId) {
    return 'manager';
  }

  // 3. 检查是否是项目成员
  const member = await db('project_members')
    .where({
      project_id: projectId,
      user_id: userId,
    })
    .first();

  if (member) {
    return member.role === 'manager' ? 'manager' : 'member';
  }

  // 4. 检查项目是否公开
  if (project?.is_public) {
    return 'viewer';
  }

  return 'none';
}

/**
 * 检查用户是否有指定级别的项目权限
 * @param userId - 用户 ID
 * @param projectId - 项目 ID
 * @param requiredLevel - 要求的最低权限级别
 * @returns 是否有权限
 */
export async function checkProjectPermission(
  userId: string,
  projectId: string,
  requiredLevel: ProjectPermissionLevel
): Promise<boolean> {
  const level = await getProjectPermissionLevel(userId, projectId);

  const levelOrder: Record<ProjectPermissionLevel, number> = {
    none: 0,
    viewer: 1,
    member: 2,
    manager: 3,
    admin: 4,
  };

  return levelOrder[level] >= levelOrder[requiredLevel];
}

/**
 * 获取用户可访问的项目 ID 列表
 * @param userId - 用户 ID
 * @param userRole - 用户角色
 * @returns 项目 ID 列表
 */
export async function getUserAccessibleProjects(userId: string, userRole?: string): Promise<string[]> {
  // 管理员可以访问所有项目
  if (userRole === 'admin') {
    const projects = await db('projects').select('id');
    return projects.map(p => p.id);
  }

  // 获取用户作为项目经理的项目
  const managedProjects = await db('projects')
    .where('manager_id', userId)
    .select('id');

  // 获取用户作为成员的项目
  const memberProjects = await db('project_members')
    .where('user_id', userId)
    .select('project_id');

  // 合并并去重
  const projectIds = new Set([
    ...managedProjects.map(p => p.id),
    ...memberProjects.map(p => p.project_id),
  ]);

  return Array.from(projectIds);
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
 * 检查用户是否是项目管理员（项目经理或项目成员中的 manager 角色）
 * @param userId - 用户 ID
 * @param projectId - 项目 ID
 * @returns 是否是项目管理员
 */
export async function isProjectAdmin(userId: string, projectId: string): Promise<boolean> {
  // 检查是否是项目经理
  const project = await db('projects')
    .where({
      id: projectId,
      manager_id: userId,
    })
    .first();

  if (project) {
    return true;
  }

  // 检查是否是项目成员中的 manager 角色
  const member = await db('project_members')
    .where({
      user_id: userId,
      project_id: projectId,
      role: 'manager',
    })
    .first();

  return !!member;
}

/**
 * 检查用户是否是任务的处理人
 * @param userId - 用户 ID
 * @param taskId - 任务 ID
 * @returns 是否是处理人
 */
export async function isTaskAssignee(userId: string, taskId: string): Promise<boolean> {
  const assignee = await db('task_assignees')
    .where({
      user_id: userId,
      task_id: taskId,
    })
    .first();

  return !!assignee;
}

/**
 * 检查用户是否有权限更新任务状态
 * @param userId - 用户 ID
 * @param taskId - 任务 ID
 * @returns 是否有权限
 */
export async function canUpdateTaskStatus(userId: string, taskId: string): Promise<boolean> {
  // 获取任务信息
  const task = await db('tasks').where({ id: taskId }).first();
  if (!task) {
    return false;
  }

  // 检查是否是系统管理员
  const user = await db('profiles').where({ id: userId }).first();
  if (user?.role === 'admin') {
    return true;
  }

  // 检查是否是任务创建者
  if (task.created_by === userId) {
    return true;
  }

  // 检查是否是项目管理员
  const isAdmin = await isProjectAdmin(userId, task.project_id);
  if (isAdmin) {
    return true;
  }

  // 检查是否是任务处理人
  const isAssignee = await isTaskAssignee(userId, taskId);
  if (isAssignee) {
    return true;
  }

  return false;
}

/**
 * 获取用户可访问的任务列表（根据精细的权限规则）
 * 规则：
 * 1. 自己创建的任务 - 始终可见
 * 2. 自己是处理人的任务 - 始终可见
 * 3. 任务状态为"项目内公开"(is_public=true) 且 自己是项目组成员 - 可见
 * @param userId - 用户 ID
 * @param userRole - 用户角色
 * @returns 任务 ID 列表
 */
export async function getUserAccessibleTasks(userId: string, userRole?: string): Promise<string[]> {
  // 管理员可以访问所有任务
  if (userRole === 'admin') {
    const tasks = await db('tasks').select('id');
    return tasks.map(t => t.id);
  }

  // 1. 获取用户创建的任务
  const createdTasks = await db('tasks')
    .where('created_by', userId)
    .select('id');

  // 2. 获取用户作为处理人的任务
  const assignedTasks = await db('task_assignees')
    .where('user_id', userId)
    .select('task_id');

  // 3. 获取用户是成员的项目中的公开任务
  const memberProjects = await db('project_members')
    .where('user_id', userId)
    .select('project_id');

  const memberProjectIds = memberProjects.map(p => p.project_id);

  let publicTasks: { id: string }[] = [];
  if (memberProjectIds.length > 0) {
    publicTasks = await db('tasks')
      .whereIn('project_id', memberProjectIds)
      .where('is_public', true)
      .select('id');
  }

  // 合并并去重
  const taskIds = new Set([
    ...createdTasks.map(t => t.id),
    ...assignedTasks.map(t => t.task_id),
    ...publicTasks.map(t => t.id),
  ]);

  return Array.from(taskIds);
}

/**
 * 检查用户是否有权限查看任务
 * 规则：
 * 1. 自己创建的任务 - 始终可见
 * 2. 自己是处理人的任务 - 始终可见
 * 3. 任务状态为"项目内公开"(is_public=true) 且 自己是项目组成员 - 可见
 * @param userId - 用户 ID
 * @param taskId - 任务 ID
 * @returns 是否有权限
 */
export async function canViewTask(userId: string, taskId: string): Promise<boolean> {
  // 获取任务信息
  const task = await db('tasks').where({ id: taskId }).first();
  if (!task) {
    return false;
  }

  // 检查是否是系统管理员
  const user = await db('profiles').where({ id: userId }).first();
  if (user?.role === 'admin') {
    return true;
  }

  // 1. 检查是否是任务创建者
  if (task.created_by === userId) {
    return true;
  }

  // 2. 检查是否是任务处理人
  const isAssignee = await isTaskAssignee(userId, taskId);
  if (isAssignee) {
    return true;
  }

  // 3. 检查任务是否公开且用户是项目成员
  if (task.is_public) {
    const isMember = await isProjectMember(userId, task.project_id);
    if (isMember) {
      return true;
    }
  }

  return false;
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
  getProjectPermissionLevel,
  checkProjectPermission,
  getUserAccessibleProjects,
  getUserAccessibleTasks,
  isProjectMember,
  isProjectAdmin,
  isTaskAssignee,
  canUpdateTaskStatus,
  canViewTask,
  addPermissionToQuery,
};
