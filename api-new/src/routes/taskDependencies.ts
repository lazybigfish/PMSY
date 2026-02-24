/**
 * 任务依赖关系路由
 * 处理任务依赖的创建、查询、删除等操作
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import db from '../config/database';

const router = Router();

/**
 * 获取任务依赖列表
 * GET /api/task-dependencies/:taskId
 */
router.get('/:taskId', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.sub;

    if (!userId) {
      throw new ValidationError('未登录');
    }

    // 获取前置依赖（当前任务依赖的任务）
    const dependencies = await db('task_dependencies as td')
      .leftJoin('tasks as depends_on', 'td.depends_on_task_id', 'depends_on.id')
      .where('td.task_id', taskId)
      .select(
        'td.id',
        'td.task_id',
        'td.depends_on_task_id',
        'td.dependency_type',
        'td.created_at',
        'depends_on.title as depends_on_title',
        'depends_on.status as depends_on_status',
        'depends_on.due_date as depends_on_due_date',
        'depends_on.priority as depends_on_priority'
      );

    // 获取后续依赖（依赖当前任务的任务）
    const dependents = await db('task_dependencies as td')
      .leftJoin('tasks as dependent_task', 'td.task_id', 'dependent_task.id')
      .where('td.depends_on_task_id', taskId)
      .select(
        'td.id',
        'td.task_id',
        'td.depends_on_task_id',
        'td.dependency_type',
        'td.created_at',
        'dependent_task.title as dependent_title',
        'dependent_task.status as dependent_status',
        'dependent_task.due_date as dependent_due_date',
        'dependent_task.priority as dependent_priority'
      );

    logger.info(`[TaskDependencies] 获取任务依赖: taskId=${taskId}, dependencies=${dependencies.length}, dependents=${dependents.length}`);

    res.json({
      dependencies,
      dependents
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 添加任务依赖
 * POST /api/task-dependencies/:taskId
 */
router.post('/:taskId', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { depends_on_task_id, dependency_type = 'FS' } = req.body;
    const userId = req.user?.sub;

    if (!userId) {
      throw new ValidationError('未登录');
    }

    // 验证必填字段
    if (!depends_on_task_id) {
      throw new ValidationError('必须指定被依赖的任务');
    }

    // 不能依赖自己
    if (taskId === depends_on_task_id) {
      throw new ValidationError('任务不能依赖自己');
    }

    // 检查被依赖的任务是否存在
    const dependsOnTask = await db('tasks')
      .where('id', depends_on_task_id)
      .first();

    if (!dependsOnTask) {
      throw new ValidationError('被依赖的任务不存在');
    }

    // 检查是否在同一项目
    if (dependsOnTask.project_id) {
      const currentTask = await db('tasks')
        .where('id', taskId)
        .first();

      if (currentTask && currentTask.project_id !== dependsOnTask.project_id) {
        throw new ValidationError('只能依赖同一项目内的任务');
      }
    }

    // 检查是否已存在依赖关系
    const existingDep = await db('task_dependencies')
      .where('task_id', taskId)
      .where('depends_on_task_id', depends_on_task_id)
      .first();

    if (existingDep) {
      throw new ValidationError('该依赖关系已存在');
    }

    // 检测循环依赖
    const hasCycle = await checkCycleDependency(taskId, depends_on_task_id);
    if (hasCycle) {
      throw new ValidationError('不能创建循环依赖');
    }

    // 创建依赖关系
    const [newDependency] = await db('task_dependencies')
      .insert({
        task_id: taskId,
        depends_on_task_id,
        dependency_type,
        created_by: userId
      })
      .returning('*');

    logger.info(`[TaskDependencies] 添加依赖成功: taskId=${taskId}, dependsOn=${depends_on_task_id}`);

    res.status(201).json(newDependency);
  } catch (error) {
    next(error);
  }
});

/**
 * 删除任务依赖
 * DELETE /api/task-dependencies/:taskId/:dependencyId
 */
router.delete('/:taskId/:dependencyId', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { taskId, dependencyId } = req.params;
    const userId = req.user?.sub;

    if (!userId) {
      throw new ValidationError('未登录');
    }

    // 检查依赖关系是否存在
    const existingDep = await db('task_dependencies')
      .where('id', dependencyId)
      .where('task_id', taskId)
      .first();

    if (!existingDep) {
      throw new ValidationError('依赖关系不存在');
    }

    // 删除依赖关系
    await db('task_dependencies')
      .where('id', dependencyId)
      .delete();

    logger.info(`[TaskDependencies] 删除依赖成功: dependencyId=${dependencyId}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * 检测循环依赖
 * 使用 DFS 检测是否会形成循环
 */
async function checkCycleDependency(taskId: string, newDependsOnId: string): Promise<boolean> {
  // 构建依赖图
  const graph = new Map<string, string[]>();

  // 获取所有任务的所有依赖关系
  const allDeps = await db('task_dependencies').select('task_id', 'depends_on_task_id');

  for (const dep of allDeps) {
    if (!graph.has(dep.task_id)) {
      graph.set(dep.task_id, []);
    }
    graph.get(dep.task_id)!.push(dep.depends_on_task_id);
  }

  // 添加新边
  if (!graph.has(taskId)) {
    graph.set(taskId, []);
  }
  graph.get(taskId)!.push(newDependsOnId);

  // DFS 检测循环
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) return true;
    }
  }

  return false;
}

/**
 * 获取任务的可选依赖列表（用于选择器）
 * GET /api/task-dependencies/:taskId/options
 */
router.get('/:taskId/options', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.sub;

    if (!userId) {
      throw new ValidationError('未登录');
    }

    // 获取当前任务的所属项目
    const currentTask = await db('tasks')
      .where('id', taskId)
      .first();

    if (!currentTask) {
      throw new ValidationError('任务不存在');
    }

    // 获取同一项目的其他任务（排除自己）
    const availableTasks = await db('tasks')
      .where('project_id', currentTask.project_id)
      .whereNot('id', taskId)
      .select(
        'id',
        'title',
        'status',
        'priority',
        'due_date'
      )
      .orderBy('created_at', 'desc')
      .limit(50);

    // 获取已有的依赖，排除
    const existingDeps = await db('task_dependencies')
      .where('task_id', taskId)
      .select('depends_on_task_id');

    const existingIds = new Set(existingDeps.map(d => d.depends_on_task_id));

    // 过滤掉已有的依赖
    const filteredTasks = availableTasks.filter(t => !existingIds.has(t.id));

    res.json(filteredTasks);
  } catch (error) {
    next(error);
  }
});

export default router;
