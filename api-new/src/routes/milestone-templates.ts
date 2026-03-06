/**
 * 里程碑模板路由
 * 处理模板查询、保存、管理等操作
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import dbService from '../services/dbService';
import { ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/milestone-templates/available
 * 获取当前用户可用的模板列表（初始化时选择）
 */
router.get('/available', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.sub;
    const { type, search, tags } = req.query;

    logger.info(`[MilestoneTemplates] 获取可用模板列表 - userId: ${userId}, type: ${type}`);

    // 查询模板基本信息
    let query = dbService.getDb()('template_versions')
      .where('is_active', true)
      .select('id', 'name', 'version_number as version', 'description', 'created_at', 'created_by', 'is_public', 'is_system');

    // 类型筛选
    if (type === 'system') {
      // 系统模板：is_system = true
      query = query.where('is_system', true);
    } else if (type === 'public') {
      // 公开模板：is_public = true（包括系统公开模板和其他用户公开模板，以及我的公开模板）
      query = query.where('is_public', true);
    } else if (type === 'private') {
      // 我的模板：当前用户创建的所有模板（包括公开和私有）
      query = query.where('created_by', userId);
    } else {
      // 全部：系统公开模板 + 其他用户公开模板 + 我的所有模板
      query = query.where(function(this: any) {
        this.where('is_public', true)  // 所有公开模板（系统+其他用户+我的公开）
          .orWhere('created_by', userId);  // 我的所有模板（包括私有）
      });
    }

    // 搜索筛选
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.andWhere(function(this: any) {
        this.where('name', 'ilike', searchTerm)
          .orWhere('description', 'ilike', searchTerm);
      });
    }

    // 排序
    query = query.orderBy('created_at', 'desc');

    const templates = await query;

    logger.info(`[MilestoneTemplates] 查询成功: ${templates.length} 条记录`);

    // 获取所有模板的阶段和任务统计
    const templateIds = templates.map((t: any) => t.id);
    let phases: any[] = [];
    let tasks: any[] = [];

    if (templateIds.length > 0) {
      // 查询阶段
      phases = await dbService.getDb()('milestone_templates')
        .whereIn('version_id', templateIds)
        .select('id', 'version_id');

      // 查询任务
      const phaseIds = phases.map((p: any) => p.id);
      if (phaseIds.length > 0) {
        tasks = await dbService.getDb()('milestone_task_templates')
          .whereIn('milestone_template_id', phaseIds)
          .select('id', 'milestone_template_id');
      }
    }

    // 统计每个模板的阶段和任务数量
    const phaseCountMap = new Map();
    const taskCountMap = new Map();

    phases.forEach((phase: any) => {
      const count = phaseCountMap.get(phase.version_id) || 0;
      phaseCountMap.set(phase.version_id, count + 1);
    });

    tasks.forEach((task: any) => {
      const phase = phases.find((p: any) => p.id === task.milestone_template_id);
      if (phase) {
        const count = taskCountMap.get(phase.version_id) || 0;
        taskCountMap.set(phase.version_id, count + 1);
      }
    });

    // 获取创建者信息和角色
    const createdByIds = templates.map((t: any) => t.created_by).filter(Boolean);
    let creatorMap = new Map();
    let adminUserIds = new Set();
    if (createdByIds.length > 0) {
      // 获取创建者基本信息和角色
      const creators = await dbService.getDb()('profiles')
        .whereIn('id', createdByIds)
        .select('id', 'full_name', 'username', 'role');
      creators.forEach((c: any) => {
        creatorMap.set(c.id, c.full_name || c.username || '系统管理员');
        // 判断是否为管理员
        if (c.role === 'admin') {
          adminUserIds.add(c.id);
        }
      });
    }

    // 添加默认值和统计数据
    const templatesWithDefaults = templates.map((t: any) => {
      // 优先使用数据库中的 is_system 字段，如果没有则根据创建者角色判断
      const isSystem = t.is_system !== undefined ? t.is_system : (t.created_by ? adminUserIds.has(t.created_by) : false);
      const isMyTemplate = t.created_by === userId;
      return {
        ...t,
        is_system: isSystem,
        is_public: t.is_public !== false, // 默认为true
        is_custom: !isSystem,
        is_my_template: isMyTemplate,
        tags: [],
        use_count: 0,
        phaseCount: phaseCountMap.get(t.id) || 0,
        taskCount: taskCountMap.get(t.id) || 0,
        created_by_name: creatorMap.get(t.created_by) || '系统管理员',
      };
    });

    res.json({
      success: true,
      data: templatesWithDefaults,
      total: templatesWithDefaults.length,
    });
  } catch (error: any) {
    logger.error(`[MilestoneTemplates] 获取可用模板列表失败: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: error.message || '获取模板列表失败',
    });
  }
});

/**
 * GET /api/milestone-templates/:id/details
 * 获取模板详情（包含阶段和任务）
 */
router.get('/:id/details', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // 查询模板基本信息
    const template = await dbService.getDb()('template_versions')
      .where('id', id)
      .select('id', 'name', 'version_number as version', 'description', 'created_at', 'created_by')
      .first();

    if (!template) {
      throw new ValidationError('模板不存在');
    }

    // 查询创建者信息
    let createdByName = '系统管理员';
    if (template.created_by) {
      const creator = await dbService.getDb()('profiles')
        .where('id', template.created_by)
        .select('full_name', 'username', 'role')
        .first();
      if (creator) {
        createdByName = creator.full_name || creator.username || '未知';
        // 判断是否为系统管理员
        if (creator.role === 'admin') {
          createdByName = '系统管理员';
        }
      }
    }

    // 查询阶段列表
    const phases = await dbService.getDb()('milestone_templates')
      .where('version_id', id)
      .orderBy('phase_order')
      .select('id', 'name', 'description', 'phase_order as order');

    // 查询每个阶段的任务
    const phasesWithTasks = await Promise.all(
      phases.map(async (phase: any) => {
        const tasks = await dbService.getDb()('milestone_task_templates')
          .where('milestone_template_id', phase.id)
          .orderBy('sort_order')
          .select('id', 'name', 'description', 'is_required as isRequired', 'output_documents as outputDocuments', 'sort_order as sortOrder');

        return {
          ...phase,
          tasks: tasks.map((task: any) => ({
            ...task,
            isRequired: task.isRequired || false,
            outputDocuments: task.outputDocuments || [],
          })),
        };
      })
    );

    logger.info(`[MilestoneTemplates] 获取模板详情: ${id}`);

    res.json({
      success: true,
      data: {
        template: {
          ...template,
          is_system: false,
          is_public: true,
          tags: [],
          use_count: 0,
          created_by_name: createdByName,
        },
        phases: phasesWithTasks,
      },
    });
  } catch (error: any) {
    logger.error(`[MilestoneTemplates] 获取模板详情失败: ${error.message}`, error);
    next(error);
  }
});

/**
 * POST /api/milestone-templates/save-from-project
 * 将项目里程碑保存为模板
 */
router.post('/save-from-project', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.sub;
    const {
      projectId,
      name,
      version,
      description,
      tags = [],
      isPublic = false,
      includePhases = true,
      includeTasks = true,
      includeOutputDocs = true,
    } = req.body;

    // 参数验证
    if (!projectId) {
      throw new ValidationError('项目ID不能为空');
    }
    if (!name || name.trim().length < 2) {
      throw new ValidationError('模板名称至少需要2个字符');
    }
    if (!version) {
      throw new ValidationError('版本号不能为空');
    }

    // 检查项目名称唯一性（同一用户）
    const existingTemplate = await dbService.getDb()('template_versions')
      .where('name', name.trim())
      .where('created_by', userId)
      .first();

    if (existingTemplate) {
      throw new ValidationError('您已存在同名模板，请使用其他名称');
    }

    // 获取项目的所有里程碑
    const projectMilestones = await dbService.getDb()('project_milestones')
      .where('project_id', projectId)
      .orderBy('phase_order')
      .select('*');

    if (projectMilestones.length === 0) {
      throw new ValidationError('该项目没有里程碑可保存');
    }

    // 开始事务
    const trx = await dbService.getDb().transaction();

    try {
      // 1. 创建 template_versions 记录
      const [newVersion] = await trx('template_versions')
        .insert({
          name: name.trim(),
          version_name: name.trim(), // 添加 version_name 字段
          version_number: version,
          description: description || '',
          is_active: true,
          created_by: userId,
        })
        .returning('*');

      // 2. 创建 milestone_templates 和 milestone_task_templates
      for (const milestone of projectMilestones) {
        // 创建里程碑模板
        const [newMilestoneTemplate] = await trx('milestone_templates')
          .insert({
            version_id: newVersion.id,
            name: milestone.name,
            description: milestone.description,
            phase_order: milestone.phase_order,
            is_active: true,
            created_by: userId,
          })
          .returning('*');

        // 如果需要包含任务
        if (includeTasks) {
          // 获取该里程碑的任务
          const tasks = await dbService.getDb()('milestone_tasks')
            .where('milestone_id', milestone.id)
            .orderBy('sort_order')
            .select('*');

          // 创建任务模板
          for (const task of tasks) {
            // 处理 output_documents 字段，确保是 JSON 字符串格式
            let outputDocs = '[]';
            if (includeOutputDocs && task.output_documents) {
              if (typeof task.output_documents === 'string') {
                outputDocs = task.output_documents;
              } else {
                outputDocs = JSON.stringify(task.output_documents);
              }
            }
            
            await trx('milestone_task_templates')
              .insert({
                milestone_template_id: newMilestoneTemplate.id,
                name: task.name,
                description: task.description,
                is_required: task.is_required,
                sort_order: task.sort_order,
                output_documents: outputDocs,
              });
          }
        }
      }

      await trx.commit();

      logger.info(`[MilestoneTemplates] 保存项目为模板成功: ${newVersion.id}, projectId: ${projectId}`);

      res.status(201).json({
        success: true,
        data: {
          templateId: newVersion.id,
          name: newVersion.name,
          version: newVersion.version_number,
        },
        message: '模板保存成功',
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
 * GET /api/milestone-templates/tags
 * 获取所有可用的标签列表
 */
router.get('/tags', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 检查标签表是否存在
    const tableExists = await dbService.getDb().schema.hasTable('milestone_template_tags');
    
    if (!tableExists) {
      // 如果表不存在，返回默认标签
      res.json({
        success: true,
        data: [
          { id: '1', name: '政府项目', color: '#3B82F6', description: '适用于政府类项目', usage_count: 0 },
          { id: '2', name: '软件开发', color: '#10B981', description: '适用于软件开发项目', usage_count: 0 },
          { id: '3', name: '工程建设', color: '#F59E0B', description: '适用于工程建设项目', usage_count: 0 },
          { id: '4', name: '敏捷开发', color: '#8B5CF6', description: '适用于敏捷开发项目', usage_count: 0 },
        ],
      });
      return;
    }

    const tags = await dbService.getDb()('milestone_template_tags')
      .orderBy('usage_count', 'desc')
      .orderBy('name')
      .select('id', 'name', 'color', 'description', 'usage_count');

    res.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
