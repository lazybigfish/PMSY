import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import * as dbService from '../services/dbService';
import { QueryOptions } from '../services/dbService';

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

/**
 * GET /rest/v1/:table
 * 查询数据（兼容 Supabase 格式）
 */
router.get('/:table', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { table } = req.params;

    if (!validateTableName(table)) {
      throw new ValidationError('无效的表名');
    }

    const options = parseQueryOptions(req);
    console.log('[REST] Query options:', JSON.stringify(options));
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

    // 添加创建者 ID（仅当表有 created_by 字段时）
    const insertData = dataArray.map(item => ({
      ...item,
      ...(hasCreatedBy && req.user?.sub ? { created_by: req.user.sub } : {}),
    }));

    const result = await dbService.insert(table, isBatchInsert ? insertData : insertData[0], select as string);
    
    console.log('[REST] Insert result:', JSON.stringify(result));

    res.status(201).json(result);
  } catch (error) {
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

    // 添加更新者 ID
    const updateData = {
      ...data,
      updated_by: req.user?.sub,
    };

    const result = await dbService.update(table, updateData, conditions, select as string);

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

    if (!validateTableName(table)) {
      throw new ValidationError('无效的表名');
    }

    if (!data || typeof data !== 'object') {
      throw new ValidationError('请求体必须是 JSON 对象');
    }

    // 添加更新者 ID
    const updateData = {
      ...data,
      updated_by: req.user?.sub,
    };

    const result = await dbService.updateById(table, id, updateData, select as string);

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
 * GET /rest/v1/template-versions
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

export default router;
