/**
 * 查重服务
 * 处理项目、任务、供应商、客户的名称查重
 */

import { db } from '../config/database';
import { logger } from '../utils/logger';

export type DuplicateCheckType = 'project' | 'task' | 'supplier' | 'client';

export interface DuplicateCheckRequest {
  type: DuplicateCheckType;
  name: string;
  excludeId?: string;
  projectId?: string;
  userId?: string;
  userRole?: string;
}

export interface DuplicateCheckResult {
  exists: boolean;
  existingItem?: {
    id: string;
    name: string;
    createdAt: string;
  };
}

/**
 * 标准化名称（去除前后空格、转小写、全角转半角）
 */
function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\uff10-\uff19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[\uff21-\uff3a]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[\uff41-\uff5a]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

/**
 * 检查项目名称是否重复
 */
async function checkProjectDuplicate(
  name: string,
  excludeId?: string
): Promise<DuplicateCheckResult> {
  const normalizedName = normalizeName(name);

  let query = db('projects')
    .select('id', 'name', 'created_at as createdAt')
    .whereRaw('LOWER(TRIM(name)) = ?', [normalizedName]);

  if (excludeId) {
    query = query.where('id', '!=', excludeId);
  }

  const result = await query.first();

  return {
    exists: !!result,
    existingItem: result ? {
      id: result.id,
      name: result.name,
      createdAt: result.createdAt,
    } : undefined,
  };
}

/**
 * 检查供应商名称是否重复
 */
async function checkSupplierDuplicate(
  name: string,
  excludeId?: string
): Promise<DuplicateCheckResult> {
  const normalizedName = normalizeName(name);

  let query = db('suppliers')
    .select('id', 'name', 'created_at as createdAt')
    .whereRaw('LOWER(TRIM(name)) = ?', [normalizedName]);

  if (excludeId) {
    query = query.where('id', '!=', excludeId);
  }

  const result = await query.first();

  return {
    exists: !!result,
    existingItem: result ? {
      id: result.id,
      name: result.name,
      createdAt: result.createdAt,
    } : undefined,
  };
}

/**
 * 检查客户名称是否重复
 */
async function checkClientDuplicate(
  name: string,
  excludeId?: string
): Promise<DuplicateCheckResult> {
  const normalizedName = normalizeName(name);

  let query = db('clients')
    .select('id', 'name', 'created_at as createdAt')
    .whereRaw('LOWER(TRIM(name)) = ?', [normalizedName]);

  if (excludeId) {
    query = query.where('id', '!=', excludeId);
  }

  const result = await query.first();

  return {
    exists: !!result,
    existingItem: result ? {
      id: result.id,
      name: result.name,
      createdAt: result.createdAt,
    } : undefined,
  };
}

/**
 * 检查任务名称是否重复（在可见范围内）
 * 可见范围：
 * - 管理员：所有任务
 * - 项目经理：其管理的项目内的所有任务 + 其创建的任务 + 其作为处理人的任务
 * - 普通用户：其创建的任务 + 其作为处理人的任务 + 公开项目中的任务
 */
async function checkTaskDuplicate(
  name: string,
  projectId: string | undefined,
  userId: string | undefined,
  userRole: string | undefined,
  excludeId?: string
): Promise<DuplicateCheckResult> {
  if (!userId) {
    return { exists: false };
  }

  const normalizedName = normalizeName(name);

  // 构建基础查询
  let query = db('tasks')
    .select('tasks.id', 'tasks.title as name', 'tasks.created_at as createdAt')
    .whereRaw('LOWER(TRIM(tasks.title)) = ?', [normalizedName]);

  // 根据用户角色设置可见范围
  if (userRole === 'admin') {
    // 管理员可以看到所有任务
    // 不需要额外过滤
  } else {
    // 获取用户管理的项目ID列表
    const managedProjects = await db('projects')
      .select('id')
      .where('manager_id', userId);
    const managedProjectIds = managedProjects.map(p => p.id);

    // 构建可见范围条件
    query = query.where(function() {
      // 用户创建的任务
      this.where('tasks.created_by', userId)
        // 用户作为处理人的任务
        .orWhere('tasks.assignee_id', userId)
        // 用户管理的项目内的任务
        .orWhereIn('tasks.project_id', managedProjectIds);

      // 公开项目中的任务
      this.orWhereExists(function() {
        this.select('*')
          .from('projects')
          .whereRaw('projects.id = tasks.project_id')
          .andWhere('projects.is_public', true);
      });
    });
  }

  // 如果指定了项目ID，在该项目内查重
  if (projectId) {
    query = query.andWhere('tasks.project_id', projectId);
  }

  // 排除自身（编辑时）
  if (excludeId) {
    query = query.andWhere('tasks.id', '!=', excludeId);
  }

  const result = await query.first();

  return {
    exists: !!result,
    existingItem: result ? {
      id: result.id,
      name: result.name,
      createdAt: result.createdAt,
    } : undefined,
  };
}

/**
 * 执行查重检查
 */
export async function checkDuplicate(
  request: DuplicateCheckRequest
): Promise<DuplicateCheckResult> {
  const { type, name, excludeId, projectId, userId, userRole } = request;

  logger.debug(`[DuplicateCheck] 检查${type}名称: ${name}`);

  switch (type) {
    case 'project':
      return checkProjectDuplicate(name, excludeId);
    case 'supplier':
      return checkSupplierDuplicate(name, excludeId);
    case 'client':
      return checkClientDuplicate(name, excludeId);
    case 'task':
      return checkTaskDuplicate(name, projectId, userId, userRole, excludeId);
    default:
      return { exists: false };
  }
}

export default {
  checkDuplicate,
};
