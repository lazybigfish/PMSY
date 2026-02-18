/**
 * 项目供应商关联路由
 * 处理项目与供应商的关联操作，包含金额校验
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import dbService from '../services/dbService';
import { checkContractAmount } from '../services/projectFinanceService';
import { ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/project-suppliers
 * 创建项目供应商关联（带金额校验）
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    
    const {
      project_id,
      supplier_id,
      contract_amount,
      contract_date,
      delivery_date,
      status,
      notes,
      module_ids,
    } = req.body;

    // 验证必填字段
    if (!project_id || !supplier_id) {
      throw new ValidationError('项目ID和供应商ID为必填项');
    }

    // 检查权限（只有项目经理或管理员可以关联供应商）
    const project = await dbService.queryOne('projects', { eq: { id: project_id } });
    if (!project) {
      throw new ValidationError('项目不存在');
    }

    const isAdmin = userRole === 'admin';
    const isManager = project.manager_id === userId;
    
    if (!isAdmin && !isManager) {
      // 检查是否是项目成员
      const isMember = await dbService.queryOne('project_members', { 
        eq: { project_id, user_id: userId } 
      });
      
      if (!isMember) {
        throw new ValidationError('无权为该项目关联供应商');
      }
    }

    // 检查供应商是否已关联
    const existingAssociation = await dbService.queryOne('project_suppliers', {
      eq: { project_id, supplier_id }
    });

    if (existingAssociation) {
      throw new ValidationError('该供应商已关联到此项目');
    }

    // 金额校验
    const contractAmountNum = contract_amount ? parseFloat(contract_amount) : 0;
    if (contractAmountNum > 0) {
      const checkResult = await checkContractAmount(project_id, contractAmountNum);
      if (!checkResult.valid) {
        throw new ValidationError(checkResult.message || '合同金额超出剩余可外采金额');
      }
    }

    // 创建关联
    const associationData = {
      project_id,
      supplier_id,
      contract_amount: contractAmountNum,
      contract_date,
      delivery_date,
      status: status || 'active',
      notes,
      module_ids: module_ids || [],
    };

    const result = await dbService.insert('project_suppliers', associationData, '*');

    logger.info(`[ProjectSuppliers] 供应商关联创建成功: ${project_id} - ${supplier_id}`);

    res.status(201).json(result[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/project-suppliers/:id
 * 更新项目供应商关联（带金额校验）
 */
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    
    const {
      contract_amount,
      contract_date,
      delivery_date,
      status,
      notes,
      module_ids,
    } = req.body;

    // 获取现有关联
    const existingAssociation = await dbService.queryOne('project_suppliers', { eq: { id } });
    if (!existingAssociation) {
      throw new ValidationError('供应商关联不存在');
    }

    // 检查权限
    const project = await dbService.queryOne('projects', { 
      eq: { id: existingAssociation.project_id } 
    });
    
    const isAdmin = userRole === 'admin';
    const isManager = project?.manager_id === userId;
    
    if (!isAdmin && !isManager) {
      throw new ValidationError('无权更新该供应商关联');
    }

    // 金额校验（如果修改了合同金额）
    const newContractAmount = contract_amount !== undefined 
      ? parseFloat(contract_amount) 
      : existingAssociation.contract_amount;
      
    if (newContractAmount > 0) {
      const checkResult = await checkContractAmount(
        existingAssociation.project_id, 
        newContractAmount,
        existingAssociation.supplier_id // 排除当前供应商的原金额
      );
      
      if (!checkResult.valid) {
        throw new ValidationError(checkResult.message || '合同金额超出剩余可外采金额');
      }
    }

    // 更新数据
    const updateData: any = {
      updated_at: new Date(),
    };

    if (contract_amount !== undefined) updateData.contract_amount = newContractAmount;
    if (contract_date !== undefined) updateData.contract_date = contract_date;
    if (delivery_date !== undefined) updateData.delivery_date = delivery_date;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (module_ids !== undefined) updateData.module_ids = module_ids;

    const result = await dbService.update('project_suppliers', { id }, updateData, '*');

    logger.info(`[ProjectSuppliers] 供应商关联更新成功: ${id}`);

    res.json(result[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/project-suppliers/:id
 * 删除项目供应商关联
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 获取现有关联
    const existingAssociation = await dbService.queryOne('project_suppliers', { eq: { id } });
    if (!existingAssociation) {
      throw new ValidationError('供应商关联不存在');
    }

    // 检查权限
    const project = await dbService.queryOne('projects', { 
      eq: { id: existingAssociation.project_id } 
    });
    
    const isAdmin = userRole === 'admin';
    const isManager = project?.manager_id === userId;
    
    if (!isAdmin && !isManager) {
      throw new ValidationError('无权删除该供应商关联');
    }

    await dbService.remove('project_suppliers', { id });

    logger.info(`[ProjectSuppliers] 供应商关联删除成功: ${id}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
