import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import * as dbService from '../services/dbService';
import { QueryOptions } from '../services/dbService';
import { getUserAccessibleProjects } from '../services/permissionService';

/**
 * REST API 路由
 * 兼容 Supabase PostgREST API 格式
 * 基础路径: /rest/v1
 */

const router = Router();

/**
 * 解析查询参数
 * 将 URL 查询参数转换为 QueryOptions
 */
function parseQueryOptions(req: Request): QueryOptions {
  const options: QueryOptions = {};
  const query = req.query;

  // select 参数
  if (query.select) {
    options.select = query.select as string;
  }

  // order 参数
  if (query.order) {
    options.order = query.order as string;
  }

  // limit 参数
  if (query.limit) {
    options.limit = parseInt(query.limit as string, 10);
  }

  // offset 参数
  if (query.offset) {
    options.offset = parseInt(query.offset as string, 10);
  }

  // 解析 eq 条件 (eq.column=value)
  Object.entries(query).forEach(([key, value]) => {
    if (key.startsWith('eq.')) {
      const column = key.slice(3);
      if (!options.eq) options.eq = {};
      options.eq[column] = value;
    }
  });

  // 解析其他条件参数
  // neq.column=value
  Object.entries(query).forEach(([key, value]) => {
    if (key.startsWith('neq.')) {
      const column = key.slice(4);
      if (!options.neq) options.neq = {};
      options.neq[column] = value;
    }
  });

  // gt.column=value
  Object.entries(query).forEach(([key, value]) => {
    if (key.startsWith('gt.')) {
      const column = key.slice(3);
      if (!options.gt) options.gt = {};
      options.gt[column] = value;
    }
  });

  // gte.column=value
  Object.entries(query).forEach(([key, value]) => {
    if (key.startsWith('gte.')) {
      const column = key.slice(4);
      if (!options.gte) options.gte = {};
      options.gte[column] = value;
    }
  });

  // lt.column=value
  Object.entries(query).forEach(([key, value]) => {
    if (key.startsWith('lt.')) {
      const column = key.slice(3);
      if (!options.lt) options.lt = {};
      options.lt[column] = value;
    }
  });

  // lte.column=value
  Object.entries(query).forEach(([key, value]) => {
    if (key.startsWith('lte.')) {
      const column = key.slice(4);
      if (!options.lte) options.lte = {};
      options.lte[column] = value;
    }
  });

  // like.column=value
  Object.entries(query).forEach(([key, value]) => {
    if (key.startsWith('like.')) {
      const column = key.slice(5);
      if (!options.like) options.like = {};
      options.like[column] = value as string;
    }
  });

  // ilike.column=value
  Object.entries(query).forEach(([key, value]) => {
    if (key.startsWith('ilike.')) {
      const column = key.slice(6);
      if (!options.ilike) options.ilike = {};
      options.ilike[column] = value as string;
    }
  });

  // in.column=value1,value2,value3
  Object.entries(query).forEach(([key, value]) => {
    if (key.startsWith('in.')) {
      const column = key.slice(3);
      if (!options.in) options.in = {};
      const values = (value as string).split(',').map(v => v.trim());
      options.in[column] = values;
    }
  });

  // is.column=null|true|false
  Object.entries(query).forEach(([key, value]) => {
    if (key.startsWith('is.')) {
      const column = key.slice(3);
      if (!options.is) options.is = {};
      if (value === 'null') {
        options.is[column] = null;
      } else if (value === 'true') {
        options.is[column] = true;
      } else if (value === 'false') {
        options.is[column] = false;
      }
    }
  });

  return options;
}

/**
 * 验证表名
 * 防止 SQL 注入
 */
function validateTableName(table: string): boolean {
  // 只允许字母、数字、下划线
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table);
}

// ============================================
// 特定路由（必须放在通用路由之前）
// ============================================

/**
 * GET /rest/v1/milestone-templates/active
 * 获取当前激活的里程碑模板（包含任务）
 * 用于新建项目时初始化里程碑
 */
router.get('/milestone-templates/active', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { db } = await import('../config/database');

    // 1. 获取当前激活的版本
    const activeVersion = await db('template_versions')
      .where('is_active', true)
      .first();

    if (!activeVersion) {
      return res.status(404).json({ error: '没有激活的里程碑模板版本' });
    }

    // 2. 获取该版本的所有里程碑模板
    const milestoneTemplates = await db('milestone_templates')
      .where('version_id', activeVersion.id)
      .where('is_active', true)
      .orderBy('phase_order')
      .select('*');

    // 3. 获取每个里程碑的任务模板
    const result = await Promise.all(
      milestoneTemplates.map(async (template: any) => {
        const tasks = await db('milestone_task_templates')
          .where('milestone_template_id', template.id)
          .orderBy('sort_order')
          .select('*');

        return {
          id: template.id,
          name: template.name,
          phase_order: template.phase_order,
          description: template.description,
          tasks: tasks.map((task: any) => ({
            id: task.id,
            name: task.name,
            description: task.description,
            is_required: task.is_required,
            output_documents: task.output_documents,
            sort_order: task.sort_order,
          })),
        };
      })
    );

    res.json({
      version: {
        id: activeVersion.id,
        name: activeVersion.name,
        version_number: activeVersion.version_number,
        description: activeVersion.description,
      },
      milestones: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /rest/v1/template-versions/list
 * 获取所有模板版本列表
 */
router.get('/template-versions/list', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { db } = await import('../config/database');

    const versions = await db('template_versions')
      .orderBy('created_at', 'desc')
      .select('*');

    res.json(versions);
  } catch (error) {
    next(error);
  }
});

// ============================================
// 通用路由（必须放在特定路由之后）
// ============================================

/**
 * GET /rest/v1/:table
 * 查询数据（兼容 Supabase 格式）
 */
router.get('/:table', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    if (!validateTableName(table)) {
      throw new ValidationError('无效的表名');
    }

    const options = parseQueryOptions(req);
    console.log('[REST] Query options:', JSON.stringify(options));

    // 对 projects 表进行权限控制
    if (table === 'projects') {
      const isAdmin = userRole === 'admin';

      // 非管理员只能看到公开项目或自己参与的项目
      if (!isAdmin) {
        // 获取用户可访问的项目ID列表
        const accessibleProjectIds = await getUserAccessibleProjects(userId, userRole);

        if (accessibleProjectIds.length === 0) {
          // 用户没有可访问的项目，返回空数组
          res.json([]);
          return;
        }

        // 添加 id 过滤条件
        if (!options.in) {
          options.in = {};
        }
        options.in['id'] = accessibleProjectIds;
      }
      // 管理员可以看到所有项目，不添加额外过滤
    }

    const data = await dbService.query(table, options);
    console.log('[REST] Query result:', JSON.stringify(data));

    // 返回数组格式（Supabase 兼容）
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /rest/v1/:table/:id
 * 根据 ID 查询单条数据
 */
router.get('/:table/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table, id } = req.params;
    const { select } = req.query;

    if (!validateTableName(table)) {
      throw new ValidationError('无效的表名');
    }

    const data = await dbService.findById(table, id, select as string);

    if (!data) {
      throw new NotFoundError('记录不存在');
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /rest/v1/:table
 * 插入数据（兼容 Supabase 格式）
 */
router.post('/:table', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table } = req.params;
    const { select } = req.query;
    const data = req.body;

    if (!validateTableName(table)) {
      throw new ValidationError('无效的表名');
    }

    if (!data || typeof data !== 'object') {
      throw new ValidationError('请求体必须是 JSON 对象');
    }

    // 检查是否为批量插入（数组）
    const isBatchInsert = Array.isArray(data);
    const dataArray = isBatchInsert ? data : [data];

    // 获取表的列信息，检查是否有 created_by 字段
    const columns = await dbService.getTableColumns(table);
    const hasCreatedBy = columns.includes('created_by');

    // 处理数据：添加 created_by 并处理 JSONB 字段
    const insertData = dataArray.map(item => {
      const processedItem: any = { ...item };
      
      // 添加创建者 ID（仅当表有 created_by 字段时）
      if (hasCreatedBy && req.user?.sub) {
        processedItem.created_by = req.user.sub;
      }
      
      // 处理 JSONB 字段：确保它们是对象/数组而不是字符串
      if (table === 'milestone_tasks' && processedItem.output_documents) {
        console.log('[REST] output_documents type:', typeof processedItem.output_documents);
        console.log('[REST] output_documents value:', JSON.stringify(processedItem.output_documents));
        
        if (typeof processedItem.output_documents === 'string') {
          try {
            processedItem.output_documents = JSON.parse(processedItem.output_documents);
          } catch (e) {
            console.warn('[REST] Failed to parse output_documents as JSON:', processedItem.output_documents);
            processedItem.output_documents = [];
          }
        } else if (typeof processedItem.output_documents === 'object' && !Array.isArray(processedItem.output_documents)) {
          // 如果 output_documents 是对象但不是数组，可能是错误的格式
          // 尝试将其转换为数组
          console.warn('[REST] output_documents is object but not array, converting to array');
          processedItem.output_documents = Object.entries(processedItem.output_documents).map(([key, value]) => {
            try {
              return JSON.parse(key);
            } catch (e) {
              return { name: key, required: value };
            }
          });
        }
      }
      
      return processedItem;
    });

    const result = await dbService.insert(table, isBatchInsert ? insertData : insertData[0], select as string);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('[REST] Insert error:', error);
    next(error);
  }
});

/**
 * PATCH /rest/v1/:table
 * 批量更新数据（根据条件）
 */
router.patch('/:table', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table } = req.params;
    const { select } = req.query;
    const data = req.body;
    const userId = req.user?.sub;

    if (!validateTableName(table)) {
      throw new ValidationError('无效的表名');
    }

    if (!data || typeof data !== 'object') {
      throw new ValidationError('请求体必须是 JSON 对象');
    }

    // 解析条件参数
    const conditions: Record<string, any> = {};
    Object.entries(req.query).forEach(([key, value]) => {
      if (key.startsWith('eq.')) {
        const column = key.slice(3);
        conditions[column] = value;
      }
    });

    if (Object.keys(conditions).length === 0) {
      throw new ValidationError('更新操作必须提供条件参数（如 eq.id=value）');
    }

    // 获取表的列信息，检查是否有 updated_by 字段
    const columns = await dbService.getTableColumns(table);
    const hasUpdatedBy = columns.includes('updated_by');

    // 添加更新者 ID（仅当表有 updated_by 字段时）
    const updateData = {
      ...data,
      ...(hasUpdatedBy && userId ? { updated_by: userId } : {}),
    };

    // 调用 dbService.update，传递 currentUserId 供触发器使用
    const result = await dbService.update(table, updateData, conditions, select as string, table === 'tasks' ? userId : undefined);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /rest/v1/:table/:id
 * 根据 ID 更新单条数据
 */
router.patch('/:table/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table, id } = req.params;
    const { select } = req.query;
    const data = req.body;
    const userId = req.user?.sub;

    if (!validateTableName(table)) {
      throw new ValidationError('无效的表名');
    }

    if (!data || typeof data !== 'object') {
      throw new ValidationError('请求体必须是 JSON 对象');
    }

    // 获取表的列信息，检查是否有 updated_by 字段
    const columns = await dbService.getTableColumns(table);
    const hasUpdatedBy = columns.includes('updated_by');

    // 添加更新者 ID（仅当表有 updated_by 字段时）
    const updateData = {
      ...data,
      ...(hasUpdatedBy && userId ? { updated_by: userId } : {}),
    };

    // 调用 dbService.updateById，传递 currentUserId 供触发器使用
    const result = await dbService.updateById(table, id, updateData, select as string, table === 'tasks' ? userId : undefined);

    if (!result) {
      throw new NotFoundError('记录不存在');
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /rest/v1/:table
 * 批量删除数据（根据条件）
 */
router.delete('/:table', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table } = req.params;

    if (!validateTableName(table)) {
      throw new ValidationError('无效的表名');
    }

    // 解析条件参数
    const conditions: Record<string, any> = {};
    Object.entries(req.query).forEach(([key, value]) => {
      if (key.startsWith('eq.')) {
        const column = key.slice(3);
        conditions[column] = value;
      }
    });

    if (Object.keys(conditions).length === 0) {
      throw new ValidationError('删除操作必须提供条件参数（如 eq.id=value）');
    }

    const count = await dbService.remove(table, conditions);

    res.json({
      deleted: count,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /rest/v1/:table/:id
 * 根据 ID 删除单条数据
 */
router.delete('/:table/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table, id } = req.params;

    if (!validateTableName(table)) {
      throw new ValidationError('无效的表名');
    }

    const success = await dbService.removeById(table, id);

    if (!success) {
      throw new NotFoundError('记录不存在');
    }

    res.json({
      deleted: 1,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * HEAD /rest/v1/:table
 * 获取数据计数（用于分页）
 */
router.head('/:table', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table } = req.params;

    if (!validateTableName(table)) {
      throw new ValidationError('无效的表名');
    }

    // 解析条件参数
    const conditions: Record<string, any> = {};
    Object.entries(req.query).forEach(([key, value]) => {
      if (key.startsWith('eq.')) {
        const column = key.slice(3);
        conditions[column] = value;
      }
    });

    const count = await dbService.count(table, Object.keys(conditions).length > 0 ? conditions : undefined);

    res.setHeader('X-Total-Count', count.toString());
    res.status(200).end();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /rest/v1/tasks/batch-delete
 * 批量删除任务
 */
router.post('/tasks/batch-delete', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { task_ids } = req.body;
    const userId = req.user?.sub;

    if (!Array.isArray(task_ids) || task_ids.length === 0) {
      throw new ValidationError('必须提供要删除的任务ID数组');
    }

    const { db } = await import('../config/database');

    // 先检查权限（只能删除自己创建的任务）
    const tasks = await db('tasks')
      .whereIn('id', task_ids)
      .select('id', 'created_by', 'title');

    const deletableTaskIds: string[] = [];
    const failedTasks: { id: string; reason: string }[] = [];

    for (const task of tasks) {
      if (task.created_by === userId) {
        deletableTaskIds.push(task.id);
      } else {
        failedTasks.push({ id: task.id, reason: '无权限删除（非创建者）' });
      }
    }

    // 批量删除（使用事务）
    let deletedCount = 0;
    if (deletableTaskIds.length > 0) {
      await db.transaction(async (trx) => {
        // 删除关联数据
        await trx('task_assignees').whereIn('task_id', deletableTaskIds).delete();
        await trx('task_modules').whereIn('task_id', deletableTaskIds).delete();
        await trx('task_comments').whereIn('task_id', deletableTaskIds).delete();
        await trx('task_progress_updates').whereIn('task_id', deletableTaskIds).delete();
        await trx('task_history').whereIn('task_id', deletableTaskIds).delete();

        // 删除任务
        deletedCount = await trx('tasks').whereIn('id', deletableTaskIds).delete();
      });
    }

    res.json({
      deleted: deletedCount,
      failed: failedTasks,
      message: `成功删除 ${deletedCount} 个任务，${failedTasks.length} 个任务无权限删除`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /rest/v1/tasks/batch-status
 * 批量修改任务状态
 */
router.post('/tasks/batch-status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { task_ids, status } = req.body;
    const userId = req.user?.sub;

    if (!Array.isArray(task_ids) || task_ids.length === 0) {
      throw new ValidationError('必须提供要更新的任务ID数组');
    }

    const validStatuses = ['todo', 'in_progress', 'paused', 'done', 'canceled'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`无效的状态值，必须是: ${validStatuses.join(', ')}`);
    }

    const { db } = await import('../config/database');

    // 设置当前用户ID（供触发器使用）
    if (userId) {
      await db.raw(`SET LOCAL "app.current_user_id" = '${userId}'`);
    }

    // 构建更新数据
    const updateData: any = { status };
    if (status === 'done') {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }

    // 批量更新
    const updatedCount = await db('tasks')
      .whereIn('id', task_ids)
      .update(updateData);

    res.json({
      updated: updatedCount,
      message: `成功更新 ${updatedCount} 个任务的状态`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /rest/v1/tasks/batch-assign
 * 批量分配任务处理人
 */
router.post('/tasks/batch-assign', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { task_ids, user_ids, mode = 'append' } = req.body;
    const userId = req.user?.sub;

    if (!Array.isArray(task_ids) || task_ids.length === 0) {
      throw new ValidationError('必须提供任务ID数组');
    }

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      throw new ValidationError('必须提供用户ID数组');
    }

    if (!['append', 'replace'].includes(mode)) {
      throw new ValidationError('mode 必须是 append 或 replace');
    }

    const { db } = await import('../config/database');

    // 设置当前用户ID（供触发器使用）
    if (userId) {
      await db.raw(`SET LOCAL "app.current_user_id" = '${userId}'`);
    }

    let updatedCount = 0;

    await db.transaction(async (trx) => {
      for (const taskId of task_ids) {
        // 获取已存在的处理人信息（用于记录历史）
        const existingAssignees = await trx('task_assignees')
          .where('task_id', taskId)
          .leftJoin('profiles', 'task_assignees.user_id', 'profiles.id')
          .select('task_assignees.user_id', 'profiles.full_name');
        const existingUserIds = existingAssignees.map((a: any) => a.user_id);

        if (mode === 'replace') {
          // 记录被移除的处理人历史
          for (const assignee of existingAssignees) {
            await trx.raw(
              `SELECT record_task_assignee_change(?, ?, 'remove', ?)`,
              [taskId, userId, assignee.full_name || '未知用户']
            );
          }
          // 删除现有分配
          await trx('task_assignees').where('task_id', taskId).delete();
        }

        // 过滤出需要新增的处理人
        const newUserIds = user_ids.filter((id: string) => !existingUserIds.includes(id));

        if (newUserIds.length > 0) {
          // 获取新处理人的姓名
          const newUsers = await trx('profiles')
            .whereIn('id', newUserIds)
            .select('id', 'full_name');
          const userNameMap = new Map(newUsers.map((u: any) => [u.id, u.full_name || '未知用户']));

          // 插入新处理人
          const assigneesToInsert = newUserIds.map((userId: string, index: number) => ({
            task_id: taskId,
            user_id: userId,
            is_primary: mode === 'replace' && index === 0,
          }));

          await trx('task_assignees').insert(assigneesToInsert);

          // 记录新增处理人的历史
          for (const newUserId of newUserIds) {
            await trx.raw(
              `SELECT record_task_assignee_change(?, ?, 'add', ?)`,
              [taskId, userId, userNameMap.get(newUserId) || '未知用户']
            );
          }

          updatedCount++;
        }
      }
    });

    res.json({
      updated: updatedCount,
      message: `成功为 ${updatedCount} 个任务分配处理人`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /rest/v1/tasks/:id/history
 * 获取任务历史记录
 */
router.get('/tasks/:id/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { db } = await import('../config/database');

    // 查询历史记录并关联用户信息
    const history = await db('task_history')
      .where('task_id', id)
      .leftJoin('profiles', 'task_history.user_id', 'profiles.id')
      .select(
        'task_history.*',
        'profiles.full_name as creator_name',
        'profiles.avatar_url as creator_avatar'
      )
      .orderBy('task_history.created_at', 'desc');

    // 格式化返回数据
    const formattedHistory = history.map((record: any) => ({
      id: record.id,
      task_id: record.task_id,
      user_id: record.user_id,
      field_name: record.field_name,
      old_value: record.old_value,
      new_value: record.new_value,
      change_type: record.change_type,
      description: record.description,
      created_at: record.created_at,
      creator: record.user_id ? {
        id: record.user_id,
        full_name: record.creator_name,
        avatar_url: record.creator_avatar,
      } : null,
    }));

    res.json(formattedHistory);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /rest/v1/tasks/record-assignee-change
 * 记录处理人变更历史（供前端单独调用）
 */
router.post('/tasks/record-assignee-change', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { task_id, change_type, assignee_name } = req.body;
    const userId = req.user?.sub;

    if (!task_id || !change_type || !assignee_name) {
      throw new ValidationError('缺少必要参数: task_id, change_type, assignee_name');
    }

    if (!['add', 'remove'].includes(change_type)) {
      throw new ValidationError('change_type 必须是 add 或 remove');
    }

    const { db } = await import('../config/database');

    // 调用数据库函数记录历史
    await db.raw(
      `SELECT record_task_assignee_change(?, ?, ?, ?)`,
      [task_id, userId, change_type, assignee_name]
    );

    res.json({ success: true, message: '历史记录已保存' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /rest/v1/tasks/record-module-change
 * 记录功能模块变更历史（供前端单独调用）
 */
router.post('/tasks/record-module-change', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { task_id, change_type, module_name } = req.body;
    const userId = req.user?.sub;

    if (!task_id || !change_type || !module_name) {
      throw new ValidationError('缺少必要参数: task_id, change_type, module_name');
    }

    if (!['add', 'remove'].includes(change_type)) {
      throw new ValidationError('change_type 必须是 add 或 remove');
    }

    const { db } = await import('../config/database');

    // 直接插入历史记录
    await db('task_history').insert({
      task_id,
      user_id: userId,
      field_name: 'modules',
      old_value: change_type === 'remove' ? module_name : null,
      new_value: change_type === 'add' ? module_name : null,
      change_type: 'update',
      description: change_type === 'add' 
        ? `添加功能模块: ${module_name}` 
        : `移除功能模块: ${module_name}`
    });

    res.json({ success: true, message: '模块变更历史记录已保存' });
  } catch (error) {
    next(error);
  }
});

export default router;
