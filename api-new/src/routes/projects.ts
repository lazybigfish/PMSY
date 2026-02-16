/**
 * 项目管理路由
 * 处理项目创建、查询、更新等操作
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import dbService from '../services/dbService';
import { initializeProjectMilestones } from '../services/projectInitService';
import { ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/projects
 * 创建新项目（自动初始化里程碑和任务）
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new ValidationError('未登录');
    }

    const {
      name,
      customer_name,
      amount,
      description,
      is_public,
      client_id,
    } = req.body;

    // 验证必填字段
    if (!name || !customer_name) {
      throw new ValidationError('项目名称和客户名称为必填项');
    }

    // 1. 创建项目
    const projectData = {
      name,
      customer_name,
      amount: amount || 0,
      description: description || '',
      is_public: is_public || false,
      status: 'pending',
      manager_id: userId,
      created_by: userId,
    };

    const projects = await dbService.insert('projects', projectData, '*');
    const project = projects[0];
    const projectId = project.id;

    logger.info(`[Projects] 项目创建成功: ${projectId} - ${name}`);

    // 2. 如果指定了客户，创建项目-客户关联
    if (client_id) {
      try {
        await dbService.insert('project_clients', {
          project_id: projectId,
          client_id,
          role: 'primary',
          created_by: userId,
        });
        logger.info(`[Projects] 项目-客户关联创建成功: ${projectId} - ${client_id}`);
      } catch (error) {
        logger.error(`[Projects] 项目-客户关联创建失败: ${projectId} - ${client_id}`, error);
        // 不阻断主流程，继续执行
      }
    }

    // 3. 添加创建者为项目经理
    try {
      await dbService.insert('project_members', {
        project_id: projectId,
        user_id: userId,
        role: 'manager',
        created_by: userId,
      });
      logger.info(`[Projects] 项目成员添加成功: ${projectId} - ${userId}`);
    } catch (error) {
      logger.error(`[Projects] 项目成员添加失败: ${projectId} - ${userId}`, error);
      // 不阻断主流程，继续执行
    }

    // 4. 初始化里程碑和任务
    const initResult = await initializeProjectMilestones(projectId, userId);

    if (!initResult.success) {
      logger.error(`[Projects] 项目里程碑初始化失败: ${projectId} - ${initResult.error}`);
      // 返回警告信息，但项目已创建成功
      return res.status(201).json({
        ...project,
        warning: `项目创建成功，但里程碑初始化失败: ${initResult.error}`,
      });
    }

    logger.info(`[Projects] 项目创建完成（含里程碑初始化）: ${projectId}`);

    // 5. 返回完整的项目信息
    const completeProject = await dbService.queryOne('projects', { eq: { id: projectId } });

    res.status(201).json(completeProject);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects
 * 获取项目列表
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const { status, search, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    // 构建查询
    let query = dbService.getDb()('projects')
      .select(
        'projects.*',
        'profiles.full_name as manager_name',
        'project_milestones.name as current_milestone_name'
      )
      .leftJoin('profiles', 'projects.manager_id', 'profiles.id')
      .leftJoin('project_milestones', 'projects.current_milestone_id', 'project_milestones.id');

    // 非管理员用户只能看到公开项目或自己参与的项目
    // 管理员可以看到所有项目
    if (userRole !== 'admin') {
      query = query.where(function() {
        this.where('projects.is_public', true)
          .orWhereExists(function() {
            this.select('*')
              .from('project_members')
              .whereRaw('project_members.project_id = projects.id')
              .andWhere('project_members.user_id', userId);
          });
      });
    }

    // 状态过滤
    if (status && status !== 'all') {
      query = query.andWhere('projects.status', status);
    }

    // 搜索过滤
    if (search) {
      query = query.andWhere(function() {
        this.where('projects.name', 'ilike', `%${search}%`)
          .orWhere('projects.customer_name', 'ilike', `%${search}%`)
          .orWhere('projects.description', 'ilike', `%${search}%`);
      });
    }

    // 获取总数
    const countQuery = query.clone();
    const totalResult = await countQuery.count('projects.id as count').first();
    const total = parseInt(totalResult?.count as string, 10) || 0;

    // 分页查询
    const projects = await query
      .orderBy('projects.created_at', 'desc')
      .limit(limitNum)
      .offset(offset);

    res.json({
      data: projects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id
 * 获取项目详情
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 查询项目详情
    const project = await dbService.getDb()('projects')
      .select(
        'projects.*',
        'profiles.full_name as manager_name',
        'project_milestones.name as current_milestone_name'
      )
      .leftJoin('profiles', 'projects.manager_id', 'profiles.id')
      .leftJoin('project_milestones', 'projects.current_milestone_id', 'project_milestones.id')
      .where('projects.id', id)
      .first();

    if (!project) {
      throw new ValidationError('项目不存在');
    }

    // 检查权限：管理员可以访问所有项目
    const isAdmin = userRole === 'admin';
    const hasAccess = isAdmin || project.is_public || project.manager_id === userId ||
      await dbService.getDb()('project_members')
        .where({ project_id: id, user_id: userId })
        .first();

    if (!hasAccess) {
      throw new ValidationError('无权访问该项目');
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/projects/:id
 * 更新项目信息
 */
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 检查权限（只有项目经理或管理员可以更新）
    const project = await dbService.queryOne('projects', { eq: { id } });
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    const isAdmin = userRole === 'admin';
    if (!isAdmin && project.manager_id !== userId) {
      throw new ValidationError('无权更新该项目');
    }

    const updateData = {
      ...req.body,
      updated_by: userId,
      updated_at: new Date(),
    };

    // 不允许通过此接口更新某些字段
    delete updateData.id;
    delete updateData.created_by;
    delete updateData.created_at;

    const updated = await dbService.update('projects', { id }, updateData, '*');

    logger.info(`[Projects] 项目更新成功: ${id}`);

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/projects/:id
 * 删除项目
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 检查权限
    const project = await dbService.queryOne('projects', { eq: { id } });
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    const isAdmin = userRole === 'admin';
    if (!isAdmin && project.manager_id !== userId) {
      throw new ValidationError('无权删除该项目');
    }

    await dbService.delete('projects', { id });

    logger.info(`[Projects] 项目删除成功: ${id}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
