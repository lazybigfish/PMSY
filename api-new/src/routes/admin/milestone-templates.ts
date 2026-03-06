/**
 * 管理员 - 里程碑模板管理路由
 * 处理模板的后台管理操作
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth';
import dbService from '../../services/dbService';
import { ValidationError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * 检查用户是否为管理员的中间件
 */
const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin') {
      throw new ValidationError('需要管理员权限');
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/milestone-templates
 * 管理员获取所有模板列表
 */
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, type, search, page = '1', pageSize = '20' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(pageSize as string, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    // 基础查询构建器
    let baseQuery = dbService.getDb()('template_versions');

    // 状态筛选
    if (status && status !== 'all') {
      baseQuery = baseQuery.andWhere('is_active', status === 'active');
    }

    // 搜索筛选
    if (search) {
      const searchTerm = `%${search}%`;
      baseQuery = baseQuery.andWhere(function (this: any) {
        this.where('name', 'ilike', searchTerm)
          .orWhere('description', 'ilike', searchTerm);
      });
    }

    // 获取总数（使用单独的查询）
    const countResult = await baseQuery.clone().count('id as count').first();
    const total = parseInt(countResult?.count as string, 10) || 0;

    // 分页查询（重新构建查询，添加select）
    const templates = await baseQuery
      .select(
        'id',
        'name',
        'version_number as version',
        'description',
        'is_active',
        'is_system',
        'is_public',
        'tags',
        'use_count',
        'created_at',
        'created_by'
      )
      .orderBy('created_at', 'desc')
      .limit(limitNum)
      .offset(offset);

    // 获取创建者信息
    const createdByIds = templates.map((t: any) => t.created_by).filter(Boolean);
    let creatorMap = new Map();
    if (createdByIds.length > 0) {
      const creators = await dbService.getDb()('profiles')
        .whereIn('id', createdByIds)
        .select('id', 'full_name', 'username');
      creators.forEach((c: any) => {
        creatorMap.set(c.id, c.full_name || c.username || '系统管理员');
      });
    }

    // 获取每个模板的阶段数和任务数
    const templatesWithStats = await Promise.all(
      templates.map(async (template: any) => {
        const phaseCountResult = await dbService.getDb()('milestone_templates')
          .where('version_id', template.id)
          .count('id as count')
          .first();

        const taskCountResult = await dbService.getDb()('milestone_task_templates')
          .whereIn('milestone_template_id', function (this: any) {
            this.select('id')
              .from('milestone_templates')
              .where('version_id', template.id);
          })
          .count('id as count')
          .first();

        // 使用数据库中的真实值，如果没有则使用默认值
        return {
          ...template,
          is_system: template.is_system ?? false,
          is_public: template.is_public ?? true,
          tags: template.tags || [],
          use_count: template.use_count || 0,
          created_by: template.created_by,
          created_by_name: creatorMap.get(template.created_by) || '系统管理员',
          phaseCount: parseInt(phaseCountResult?.count as string, 10) || 0,
          taskCount: parseInt(taskCountResult?.count as string, 10) || 0,
        };
      })
    );

    logger.info(`[Admin/MilestoneTemplates] 管理员获取模板列表: ${templatesWithStats.length} 条记录`);

    res.json({
      success: true,
      data: {
        list: templatesWithStats,
        pagination: {
          total,
          page: pageNum,
          pageSize: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    logger.error(`[Admin/MilestoneTemplates] 获取模板列表失败: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: error.message || '获取模板列表失败',
    });
  }
});

/**
 * POST /api/admin/milestone-templates/:id/enable
 * 启用模板
 */
router.post('/:id/enable', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const updated = await dbService.getDb()('template_versions')
      .where('id', id)
      .update({
        is_active: true,
        updated_at: new Date(),
      })
      .returning('*');

    if (!updated || updated.length === 0) {
      throw new ValidationError('模板不存在');
    }

    // 同时启用关联的 milestone_templates
    await dbService.getDb()('milestone_templates')
      .where('version_id', id)
      .update({
        is_active: true,
        updated_at: new Date(),
      });

    logger.info(`[Admin/MilestoneTemplates] 启用模板: ${id}`);

    res.json({
      success: true,
      message: '模板已启用',
      data: updated[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/milestone-templates/:id/disable
 * 禁用模板
 */
router.post('/:id/disable', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // 简化处理：直接禁用，不检查系统模板逻辑（因为 is_system 字段可能不存在）
    const updated = await dbService.getDb()('template_versions')
      .where('id', id)
      .update({
        is_active: false,
        updated_at: new Date(),
      })
      .returning('*');

    if (!updated || updated.length === 0) {
      throw new ValidationError('模板不存在');
    }

    // 同时禁用关联的 milestone_templates
    await dbService.getDb()('milestone_templates')
      .where('version_id', id)
      .update({
        is_active: false,
        updated_at: new Date(),
      });

    logger.info(`[Admin/MilestoneTemplates] 禁用模板: ${id}`);

    res.json({
      success: true,
      message: '模板已禁用',
      data: updated[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/milestone-templates/:id
 * 删除模板
 */
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // 检查模板是否存在
    const template = await dbService.getDb()('template_versions')
      .where('id', id)
      .first();

    if (!template) {
      throw new ValidationError('模板不存在');
    }

    // 开始事务
    const trx = await dbService.getDb().transaction();

    try {
      // 1. 删除关联的 milestone_task_templates
      await trx('milestone_task_templates')
        .whereIn('milestone_template_id', function (this: any) {
          this.select('id')
            .from('milestone_templates')
            .where('version_id', id);
        })
        .delete();

      // 2. 删除关联的 milestone_templates
      await trx('milestone_templates')
        .where('version_id', id)
        .delete();

      // 3. 删除 template_versions
      await trx('template_versions')
        .where('id', id)
        .delete();

      await trx.commit();

      logger.info(`[Admin/MilestoneTemplates] 删除模板: ${id}`);

      res.json({
        success: true,
        message: '模板已删除',
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/milestone-templates/:id/delete
 * 删除模板（POST方式，兼容防火墙）
 */
router.post('/:id/delete', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // 检查模板是否存在
    const template = await dbService.getDb()('template_versions')
      .where('id', id)
      .first();

    if (!template) {
      throw new ValidationError('模板不存在');
    }

    // 开始事务
    const trx = await dbService.getDb().transaction();

    try {
      // 1. 删除关联的 milestone_task_templates
      await trx('milestone_task_templates')
        .whereIn('milestone_template_id', function (this: any) {
          this.select('id')
            .from('milestone_templates')
            .where('version_id', id);
        })
        .delete();

      // 2. 删除关联的 milestone_templates
      await trx('milestone_templates')
        .where('version_id', id)
        .delete();

      // 3. 删除 template_versions
      await trx('template_versions')
        .where('id', id)
        .delete();

      await trx.commit();

      logger.info(`[Admin/MilestoneTemplates] 删除模板: ${id}`);

      res.json({
        success: true,
        message: '模板已删除',
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/milestone-templates/:id/detail
 * 获取模板详情（包含阶段和任务）
 */
router.get('/:id/detail', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // 获取模板基本信息
    const template = await dbService.getDb()('template_versions')
      .where('id', id)
      .first();

    if (!template) {
      throw new ValidationError('模板不存在');
    }

    // 获取阶段列表
    const phases = await dbService.getDb()('milestone_templates')
      .where('version_id', id)
      .orderBy('phase_order', 'asc')
      .select('id', 'name', 'description', 'phase_order');

    // 获取所有阶段的任务
    const phaseIds = phases.map((p: any) => p.id);
    let tasks: any[] = [];
    
    if (phaseIds.length > 0) {
      const rawTasks = await dbService.getDb()('milestone_task_templates')
        .whereIn('milestone_template_id', phaseIds)
        .orderBy('created_at', 'asc')
        .select('id', 'milestone_template_id', 'name', 'description', 'is_required', 'output_documents');
      
      // 处理 output_documents，确保是数组格式
      tasks = rawTasks.map((task: any) => {
        let docs = task.output_documents;
        // 如果是字符串，解析为对象
        if (typeof docs === 'string') {
          try {
            docs = JSON.parse(docs);
          } catch {
            docs = [];
          }
        }
        // 确保是数组
        if (!Array.isArray(docs)) {
          docs = [];
        }
        return {
          ...task,
          output_documents: docs,
        };
      });
    }

    // 组装阶段和任务
    const phasesWithTasks = phases.map((phase: any) => ({
      ...phase,
      tasks: tasks.filter((t: any) => t.milestone_template_id === phase.id),
    }));

    res.json({
      success: true,
      data: {
        template: {
          ...template,
          is_system: template.is_system ?? false,
          is_public: template.is_public ?? true,
          tags: template.tags || [],
          use_count: template.use_count || 0,
        },
        phases: phasesWithTasks,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/milestone-templates
 * 创建新模板
 */
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, version_number, description, is_public, is_active, is_system, tags } = req.body;

    if (!name || !version_number) {
      throw new ValidationError('模板名称和版本号不能为空');
    }

    // 检查模板名称是否已存在
    const existingName = await dbService.getDb()('template_versions')
      .where('name', name)
      .first();

    if (existingName) {
      throw new ValidationError(`模板名称 "${name}" 已存在，请使用不同的名称`);
    }

    const [newTemplate] = await dbService.getDb()('template_versions')
      .insert({
        name,
        version_number,
        version_name: name,
        description: description || '',
        is_active: is_active !== false,
        is_public: is_public === true,
        is_system: is_system === true,
        created_by: req.user?.sub,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    logger.info(`[Admin/MilestoneTemplates] 创建模板: ${newTemplate.id}`);

    res.json({
      success: true,
      message: '模板创建成功',
      data: newTemplate,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/milestone-templates/:id
 * 更新模板
 */
router.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, version_number, description, is_public, is_active, tags } = req.body;

    // 检查模板是否存在
    const existing = await dbService.getDb()('template_versions')
      .where('id', id)
      .first();

    if (!existing) {
      throw new ValidationError('模板不存在');
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (version_number !== undefined) updateData.version_number = version_number;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    const [updated] = await dbService.getDb()('template_versions')
      .where('id', id)
      .update(updateData)
      .returning('*');

    logger.info(`[Admin/MilestoneTemplates] 更新模板: ${id}`);

    res.json({
      success: true,
      message: '模板更新成功',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/milestone-templates/batch
 * 批量操作模板
 */
router.post('/batch', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, ids } = req.body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('参数错误：需要提供 action 和 ids 数组');
    }

    if (!['enable', 'disable', 'delete'].includes(action)) {
      throw new ValidationError('无效的 action');
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        switch (action) {
          case 'enable':
            await dbService.getDb()('template_versions')
              .where('id', id)
              .update({ is_active: true, updated_at: new Date() });
            await dbService.getDb()('milestone_templates')
              .where('version_id', id)
              .update({ is_active: true, updated_at: new Date() });
            successCount++;
            break;

          case 'disable':
            await dbService.getDb()('template_versions')
              .where('id', id)
              .update({ is_active: false, updated_at: new Date() });
            await dbService.getDb()('milestone_templates')
              .where('version_id', id)
              .update({ is_active: false, updated_at: new Date() });
            successCount++;
            break;

          case 'delete':
            const trx = await dbService.getDb().transaction();
            try {
              await trx('milestone_task_templates')
                .whereIn('milestone_template_id', function (this: any) {
                  this.select('id').from('milestone_templates').where('version_id', id);
                })
                .delete();
              await trx('milestone_templates').where('version_id', id).delete();
              await trx('template_versions').where('id', id).delete();
              await trx.commit();
              successCount++;
            } catch (error) {
              await trx.rollback();
              throw error;
            }
            break;
        }
      } catch (error: any) {
        failCount++;
        errors.push(`ID ${id}: ${error.message}`);
      }
    }

    logger.info(`[Admin/MilestoneTemplates] 批量操作: ${action}, 成功: ${successCount}, 失败: ${failCount}`);

    res.json({
      success: true,
      data: {
        action,
        total: ids.length,
        success: successCount,
        fail: failCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/milestone-templates/:templateId/phases
 * 创建阶段
 */
router.post('/:templateId/phases', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId } = req.params;
    const { name, description, phase_order } = req.body;

    if (!name) {
      throw new ValidationError('阶段名称不能为空');
    }

    // 检查模板是否存在
    const template = await dbService.getDb()('template_versions')
      .where('id', templateId)
      .first();

    if (!template) {
      throw new ValidationError('模板不存在');
    }

    const [newPhase] = await dbService.getDb()('milestone_templates')
      .insert({
        version_id: templateId,
        name,
        description: description || '',
        phase_order: phase_order || 0,
        is_active: true,
        created_at: new Date(),
      })
      .returning('*');

    logger.info(`[Admin/MilestoneTemplates] 创建阶段: ${newPhase.id}`);

    res.json({
      success: true,
      message: '阶段创建成功',
      data: newPhase,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/milestone-templates/:templateId/phases/:phaseId/tasks
 * 创建任务
 */
router.post('/:templateId/phases/:phaseId/tasks', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId, phaseId } = req.params;
    const { name, description, is_required, output_documents } = req.body;

    if (!name) {
      throw new ValidationError('任务名称不能为空');
    }

    // 检查阶段是否存在
    const phase = await dbService.getDb()('milestone_templates')
      .where('id', phaseId)
      .where('version_id', templateId)
      .first();

    if (!phase) {
      throw new ValidationError('阶段不存在');
    }

    const [newTask] = await dbService.getDb()('milestone_task_templates')
      .insert({
        milestone_template_id: phaseId,
        name,
        description: description || '',
        is_required: is_required !== false,
        output_documents: output_documents ? JSON.stringify(output_documents) : '[]',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    logger.info(`[Admin] 创建任务:/MilestoneTemplates ${newTask.id}`);

    res.json({
      success: true,
      message: '任务创建成功',
      data: newTask,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/milestone-templates/:templateId/phases/:phaseId
 * 更新阶段
 */
router.put('/:templateId/phases/:phaseId', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId, phaseId } = req.params;
    const { name, description, phase_order } = req.body;

    // 检查阶段是否存在
    const phase = await dbService.getDb()('milestone_templates')
      .where('id', phaseId)
      .where('version_id', templateId)
      .first();

    if (!phase) {
      throw new ValidationError('阶段不存在');
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (phase_order !== undefined) updateData.phase_order = phase_order;

    const [updated] = await dbService.getDb()('milestone_templates')
      .where('id', phaseId)
      .update(updateData)
      .returning('*');

    logger.info(`[Admin/MilestoneTemplates] 更新阶段: ${phaseId}`);

    res.json({
      success: true,
      message: '阶段更新成功',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/milestone-templates/:templateId/phases/:phaseId/update
 * 更新阶段（POST方式，兼容防火墙）
 */
router.post('/:templateId/phases/:phaseId/update', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId, phaseId } = req.params;
    const { name, description, phase_order } = req.body;

    // 检查阶段是否存在
    const phase = await dbService.getDb()('milestone_templates')
      .where('id', phaseId)
      .where('version_id', templateId)
      .first();

    if (!phase) {
      throw new ValidationError('阶段不存在');
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (phase_order !== undefined) updateData.phase_order = phase_order;

    const [updated] = await dbService.getDb()('milestone_templates')
      .where('id', phaseId)
      .update(updateData)
      .returning('*');

    logger.info(`[Admin/MilestoneTemplates] 更新阶段: ${phaseId}`);

    res.json({
      success: true,
      message: '阶段更新成功',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/milestone-templates/:templateId/phases/:phaseId/delete
 * 删除阶段（POST方式，兼容防火墙）
 */
router.post('/:templateId/phases/:phaseId/delete', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId, phaseId } = req.params;

    // 检查阶段是否存在
    const phase = await dbService.getDb()('milestone_templates')
      .where('id', phaseId)
      .where('version_id', templateId)
      .first();

    if (!phase) {
      throw new ValidationError('阶段不存在');
    }

    // 删除阶段下的所有任务
    await dbService.getDb()('milestone_task_templates')
      .where('milestone_template_id', phaseId)
      .delete();

    // 删除阶段
    await dbService.getDb()('milestone_templates')
      .where('id', phaseId)
      .delete();

    logger.info(`[Admin/MilestoneTemplates] 删除阶段: ${phaseId}`);

    res.json({
      success: true,
      message: '阶段删除成功',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/milestone-templates/:templateId/phases/:phaseId
 * 删除阶段
 */
router.delete('/:templateId/phases/:phaseId', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId, phaseId } = req.params;

    // 检查阶段是否存在
    const phase = await dbService.getDb()('milestone_templates')
      .where('id', phaseId)
      .where('version_id', templateId)
      .first();

    if (!phase) {
      throw new ValidationError('阶段不存在');
    }

    // 删除阶段下的所有任务
    await dbService.getDb()('milestone_task_templates')
      .where('milestone_template_id', phaseId)
      .delete();

    // 删除阶段
    await dbService.getDb()('milestone_templates')
      .where('id', phaseId)
      .delete();

    logger.info(`[Admin/MilestoneTemplates] 删除阶段: ${phaseId}`);

    res.json({
      success: true,
      message: '阶段删除成功',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/milestone-templates/:templateId/phases/:phaseId/tasks/:taskId
 * 更新任务
 */
router.put('/:templateId/phases/:phaseId/tasks/:taskId', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId, phaseId, taskId } = req.params;
    const { name, description, is_required, output_documents } = req.body;

    // 检查任务是否存在
    const task = await dbService.getDb()('milestone_task_templates')
      .where('id', taskId)
      .where('milestone_template_id', phaseId)
      .first();

    if (!task) {
      throw new ValidationError('任务不存在');
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_required !== undefined) updateData.is_required = is_required;
    if (output_documents !== undefined) {
      updateData.output_documents = JSON.stringify(output_documents);
    }

    const [updated] = await dbService.getDb()('milestone_task_templates')
      .where('id', taskId)
      .update(updateData)
      .returning('*');

    logger.info(`[Admin/MilestoneTemplates] 更新任务: ${taskId}`);

    res.json({
      success: true,
      message: '任务更新成功',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/milestone-templates/:templateId/phases/:phaseId/tasks/:taskId/update
 * 更新任务（POST方式，兼容防火墙）
 */
router.post('/:templateId/phases/:phaseId/tasks/:taskId/update', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId, phaseId, taskId } = req.params;
    const { name, description, is_required, output_documents } = req.body;

    // 检查任务是否存在
    const task = await dbService.getDb()('milestone_task_templates')
      .where('id', taskId)
      .where('milestone_template_id', phaseId)
      .first();

    if (!task) {
      throw new ValidationError('任务不存在');
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_required !== undefined) updateData.is_required = is_required;
    if (output_documents !== undefined) {
      updateData.output_documents = JSON.stringify(output_documents);
    }

    const [updated] = await dbService.getDb()('milestone_task_templates')
      .where('id', taskId)
      .update(updateData)
      .returning('*');

    logger.info(`[Admin/MilestoneTemplates] 更新任务: ${taskId}`);

    res.json({
      success: true,
      message: '任务更新成功',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/milestone-templates/:templateId/phases/:phaseId/tasks/:taskId/delete
 * 删除任务（POST方式，兼容防火墙）
 */
router.post('/:templateId/phases/:phaseId/tasks/:taskId/delete', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId, phaseId, taskId } = req.params;

    // 检查任务是否存在
    const task = await dbService.getDb()('milestone_task_templates')
      .where('id', taskId)
      .where('milestone_template_id', phaseId)
      .first();

    if (!task) {
      throw new ValidationError('任务不存在');
    }

    // 删除任务
    await dbService.getDb()('milestone_task_templates')
      .where('id', taskId)
      .delete();

    logger.info(`[Admin/MilestoneTemplates] 删除任务: ${taskId}`);

    res.json({
      success: true,
      message: '任务删除成功',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/milestone-templates/:templateId/phases/:phaseId/tasks/:taskId
 * 删除任务
 */
router.delete('/:templateId/phases/:phaseId/tasks/:taskId', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId, phaseId, taskId } = req.params;

    // 检查任务是否存在
    const task = await dbService.getDb()('milestone_task_templates')
      .where('id', taskId)
      .where('milestone_template_id', phaseId)
      .first();

    if (!task) {
      throw new ValidationError('任务不存在');
    }

    // 删除任务
    await dbService.getDb()('milestone_task_templates')
      .where('id', taskId)
      .delete();

    logger.info(`[Admin/MilestoneTemplates] 删除任务: ${taskId}`);

    res.json({
      success: true,
      message: '任务删除成功',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
