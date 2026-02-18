/**
 * 项目管理路由
 * 处理项目创建、查询、更新等操作
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import dbService from '../services/dbService';
import { initializeProjectMilestones } from '../services/projectInitService';
import { getProcurementStats, checkContractAmount } from '../services/projectFinanceService';
import {
  getProjectPayments,
  createPayment,
  deletePayment,
  getProjectPaymentStats,
  checkPaymentBalance,
} from '../services/clientPaymentService';
import {
  getProjectRequirements,
  createRequirement,
  updateRequirementStatus,
  getRequirementExpenses,
  createExpense,
  deleteExpense,
} from '../services/extraRequirementService';
import { ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/projects
 * 创建新项目（自动初始化里程碑和任务）
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    // 检查项目名称是否已存在（查重）
    const existingProject = await dbService.queryOne('projects', {
      eq: { name: name.trim() }
    });
    if (existingProject) {
      throw new ValidationError('已有相同项目，请检查项目名称');
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
      res.status(201).json({
        ...project,
        warning: `项目创建成功，但里程碑初始化失败: ${initResult.error}`,
      });
      return;
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
      query = query.where(function(this: any) {
        this.where('projects.is_public', true)
          .orWhereExists(function(this: any) {
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
      query = query.andWhere(function(this: any) {
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

/**
 * GET /api/projects/:id/procurement-stats
 * 获取项目外采统计
 */
router.get('/:id/procurement-stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 检查项目是否存在
    const project = await dbService.queryOne('projects', { eq: { id } });
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    // 检查权限：管理员可以访问所有项目，其他用户需要是项目成员或项目公开
    const isAdmin = userRole === 'admin';
    const hasAccess = isAdmin || project.is_public || project.manager_id === userId ||
      await dbService.getDb()('project_members')
        .where({ project_id: id, user_id: userId })
        .first();

    if (!hasAccess) {
      throw new ValidationError('无权访问该项目');
    }

    const stats = await getProcurementStats(id);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ==================== 客户回款管理 API ====================

/**
 * GET /api/projects/:id/client-payments
 * 获取项目客户回款记录
 */
router.get('/:id/client-payments', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 检查项目是否存在
    const project = await dbService.queryOne('projects', { eq: { id } });
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    // 检查权限
    const isAdmin = userRole === 'admin';
    const hasAccess = isAdmin || project.is_public || project.manager_id === userId ||
      await dbService.getDb()('project_members')
        .where({ project_id: id, user_id: userId })
        .first();

    if (!hasAccess) {
      throw new ValidationError('无权访问该项目');
    }

    const payments = await getProjectPayments(id);
    res.json(payments);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/client-payments
 * 创建客户回款记录
 */
router.post('/:id/client-payments', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 检查项目是否存在
    const project = await dbService.queryOne('projects', { eq: { id } });
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    // 检查权限（只有项目经理或管理员可以创建）
    const isAdmin = userRole === 'admin';
    const isManager = project.manager_id === userId;
    if (!isAdmin && !isManager) {
      throw new ValidationError('无权创建回款记录');
    }

    // 获取项目关联的客户
    const projectClient = await dbService.getDb()('project_clients')
      .select('client_id')
      .where('project_id', id)
      .first();

    if (!projectClient) {
      throw new ValidationError('项目未关联客户，无法创建回款记录');
    }

    const { amount, paymentDate, paymentMethod, notes } = req.body;

    // 参数校验
    if (!amount || amount <= 0) {
      throw new ValidationError('回款金额必须大于0');
    }
    if (!paymentDate) {
      throw new ValidationError('回款日期不能为空');
    }

    const payment = await createPayment(
      id,
      projectClient.client_id,
      { amount, paymentDate, paymentMethod, notes },
      userId!
    );

    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id/payment-stats
 * 获取项目付款统计
 */
router.get('/:id/payment-stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 检查项目是否存在
    const project = await dbService.queryOne('projects', { eq: { id } });
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    // 检查权限
    const isAdmin = userRole === 'admin';
    const hasAccess = isAdmin || project.is_public || project.manager_id === userId ||
      await dbService.getDb()('project_members')
        .where({ project_id: id, user_id: userId })
        .first();

    if (!hasAccess) {
      throw new ValidationError('无权访问该项目');
    }

    const stats = await getProjectPaymentStats(id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id/payment-balance-check
 * 检查供应商付款余额
 */
router.get('/:id/payment-balance-check', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    const { plannedPaymentAmount } = req.query;

    // 检查项目是否存在
    const project = await dbService.queryOne('projects', { eq: { id } });
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    // 检查权限
    const isAdmin = userRole === 'admin';
    const hasAccess = isAdmin || project.is_public || project.manager_id === userId ||
      await dbService.getDb()('project_members')
        .where({ project_id: id, user_id: userId })
        .first();

    if (!hasAccess) {
      throw new ValidationError('无权访问该项目');
    }

    const amount = parseFloat(plannedPaymentAmount as string) || 0;
    const result = await checkPaymentBalance(id, amount);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/client-payments/:paymentId
 * 删除客户回款记录
 */
router.delete('/client-payments/:paymentId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 获取回款记录
    const payment = await dbService.getDb()('client_payments')
      .select('*')
      .where('id', paymentId)
      .first();

    if (!payment) {
      throw new ValidationError('回款记录不存在');
    }

    // 检查权限（只有项目经理、管理员或创建者可以删除）
    const isAdmin = userRole === 'admin';
    const isCreator = payment.created_by === userId;

    // 获取项目信息
    const project = await dbService.queryOne('projects', { eq: { id: payment.project_id } });
    const isManager = project?.manager_id === userId;

    if (!isAdmin && !isManager && !isCreator) {
      throw new ValidationError('无权删除该回款记录');
    }

    await deletePayment(paymentId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ==================== 合同外需求管理 API ====================

/**
 * GET /api/projects/:id/extra-requirements
 * 获取项目合同外需求列表
 */
router.get('/:id/extra-requirements', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 检查项目是否存在
    const project = await dbService.queryOne('projects', { eq: { id } });
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    // 检查权限
    const isAdmin = userRole === 'admin';
    const hasAccess = isAdmin || project.is_public || project.manager_id === userId ||
      await dbService.getDb()('project_members')
        .where({ project_id: id, user_id: userId })
        .first();

    if (!hasAccess) {
      throw new ValidationError('无权访问该项目');
    }

    const requirements = await getProjectRequirements(id);
    res.json(requirements);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/extra-requirements
 * 创建合同外需求
 */
router.post('/:id/extra-requirements', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 检查项目是否存在
    const project = await dbService.queryOne('projects', { eq: { id } });
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    // 检查权限（只有项目经理或管理员可以创建）
    const isAdmin = userRole === 'admin';
    const isManager = project.manager_id === userId;
    if (!isAdmin && !isManager) {
      throw new ValidationError('无权创建合同外需求');
    }

    const { name, description, estimatedCost, requestedBy, requestDate, notes } = req.body;

    // 参数校验
    if (!name) {
      throw new ValidationError('需求名称不能为空');
    }

    const requirement = await createRequirement(
      id,
      { name, description, estimatedCost, requestedBy, requestDate, notes },
      userId!
    );

    res.status(201).json(requirement);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/extra-requirements/:requirementId/status
 * 更新合同外需求状态
 */
router.patch('/extra-requirements/:requirementId/status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requirementId } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 获取需求记录
    const requirement = await dbService.getDb()('extra_requirements')
      .select('*')
      .where('id', requirementId)
      .first();

    if (!requirement) {
      throw new ValidationError('需求记录不存在');
    }

    // 检查权限（只有项目经理或管理员可以更新状态）
    const isAdmin = userRole === 'admin';
    const project = await dbService.queryOne('projects', { eq: { id: requirement.project_id } });
    const isManager = project?.manager_id === userId;

    if (!isAdmin && !isManager) {
      throw new ValidationError('无权更新需求状态');
    }

    const { status } = req.body;
    const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`无效的状态: ${status}`);
    }

    const updatedRequirement = await updateRequirementStatus(requirementId, status, userId);
    res.json(updatedRequirement);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/extra-requirements/:requirementId/expenses
 * 获取合同外需求支出记录
 */
router.get('/extra-requirements/:requirementId/expenses', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requirementId } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 获取需求记录
    const requirement = await dbService.getDb()('extra_requirements')
      .select('*')
      .where('id', requirementId)
      .first();

    if (!requirement) {
      throw new ValidationError('需求记录不存在');
    }

    // 检查权限
    const isAdmin = userRole === 'admin';
    const project = await dbService.queryOne('projects', { eq: { id: requirement.project_id } });
    const hasAccess = isAdmin || project?.is_public || project?.manager_id === userId ||
      await dbService.getDb()('project_members')
        .where({ project_id: requirement.project_id, user_id: userId })
        .first();

    if (!hasAccess) {
      throw new ValidationError('无权访问');
    }

    const expenses = await getRequirementExpenses(requirementId);
    res.json(expenses);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/extra-requirements/:requirementId/expenses
 * 创建合同外需求支出记录
 */
router.post('/extra-requirements/:requirementId/expenses', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requirementId } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 获取需求记录
    const requirement = await dbService.getDb()('extra_requirements')
      .select('*')
      .where('id', requirementId)
      .first();

    if (!requirement) {
      throw new ValidationError('需求记录不存在');
    }

    // 检查权限（只有项目经理或管理员可以创建支出）
    const isAdmin = userRole === 'admin';
    const project = await dbService.queryOne('projects', { eq: { id: requirement.project_id } });
    const isManager = project?.manager_id === userId;

    if (!isAdmin && !isManager) {
      throw new ValidationError('无权创建支出记录');
    }

    // 检查需求状态
    if (requirement.status !== 'approved' && requirement.status !== 'completed') {
      throw new ValidationError('只能为已批准或已完成的需求创建支出记录');
    }

    const { amount, expenseDate, supplierId, description } = req.body;

    // 参数校验
    if (!amount || amount <= 0) {
      throw new ValidationError('支出金额必须大于0');
    }
    if (!expenseDate) {
      throw new ValidationError('支出日期不能为空');
    }

    const expense = await createExpense(
      requirementId,
      { amount, expenseDate, supplierId, description },
      userId!
    );

    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/extra-requirement-expenses/:expenseId
 * 删除合同外需求支出记录
 */
router.delete('/extra-requirement-expenses/:expenseId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 获取支出记录
    const expense = await dbService.getDb()('extra_requirement_expenses')
      .select('*')
      .where('id', expenseId)
      .first();

    if (!expense) {
      throw new ValidationError('支出记录不存在');
    }

    // 检查权限（只有项目经理、管理员或创建者可以删除）
    const isAdmin = userRole === 'admin';
    const isCreator = expense.created_by === userId;

    // 获取需求关联的项目
    const requirement = await dbService.getDb()('extra_requirements')
      .select('project_id')
      .where('id', expense.requirement_id)
      .first();

    const project = await dbService.queryOne('projects', { eq: { id: requirement?.project_id } });
    const isManager = project?.manager_id === userId;

    if (!isAdmin && !isManager && !isCreator) {
      throw new ValidationError('无权删除该支出记录');
    }

    await deleteExpense(expenseId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
