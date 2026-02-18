/**
 * 合同外需求服务
 * 处理合同外需求的CRUD和状态流转
 */

import { db } from '../config/database';
import { logger } from '../utils/logger';

export type ExtraRequirementStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface ExtraRequirement {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  estimatedCost?: number;
  actualCost: number;
  status: ExtraRequirementStatus;
  requestedBy?: string;
  requestDate?: string;
  approvalDate?: string;
  approvedBy?: string;
  completionDate?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ExtraRequirementFormData {
  name: string;
  description?: string;
  estimatedCost?: number;
  requestedBy?: string;
  requestDate?: string;
  notes?: string;
}

export interface ExtraRequirementExpense {
  id: string;
  requirementId: string;
  amount: number;
  expenseDate: string;
  supplierId?: string;
  supplierName?: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ExtraRequirementExpenseFormData {
  amount: number;
  expenseDate: string;
  supplierId?: string;
  description?: string;
}

/**
 * 获取项目的合同外需求列表
 */
export async function getProjectRequirements(projectId: string): Promise<ExtraRequirement[]> {
  const requirements = await db('extra_requirements as er')
    .leftJoin('profiles as p', 'er.approved_by', 'p.id')
    .select(
      'er.id',
      'er.project_id as projectId',
      'er.name',
      'er.description',
      'er.estimated_cost as estimatedCost',
      'er.actual_cost as actualCost',
      'er.status',
      'er.requested_by as requestedBy',
      'er.request_date as requestDate',
      'er.approval_date as approvalDate',
      'er.approved_by as approvedBy',
      'er.completion_date as completionDate',
      'er.notes',
      'er.created_by as createdBy',
      'er.created_at as createdAt',
      'p.full_name as approvedByName'
    )
    .where('er.project_id', projectId)
    .orderBy('er.created_at', 'desc');

  return requirements.map(r => ({
    id: r.id,
    projectId: r.projectId,
    name: r.name,
    description: r.description,
    estimatedCost: r.estimatedCost ? parseFloat(r.estimatedCost) : undefined,
    actualCost: parseFloat(r.actualCost || '0'),
    status: r.status,
    requestedBy: r.requestedBy,
    requestDate: r.requestDate,
    approvalDate: r.approvalDate,
    approvedBy: r.approvedBy,
    approvedByName: r.approvedByName,
    completionDate: r.completionDate,
    notes: r.notes,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
  }));
}

/**
 * 创建合同外需求
 */
export async function createRequirement(
  projectId: string,
  data: ExtraRequirementFormData,
  createdBy: string
): Promise<ExtraRequirement> {
  const [requirement] = await db('extra_requirements')
    .insert({
      project_id: projectId,
      name: data.name,
      description: data.description,
      estimated_cost: data.estimatedCost,
      status: 'pending',
      requested_by: data.requestedBy,
      request_date: data.requestDate,
      notes: data.notes,
      created_by: createdBy,
    })
    .returning([
      'id',
      'project_id as projectId',
      'name',
      'description',
      'estimated_cost as estimatedCost',
      'actual_cost as actualCost',
      'status',
      'requested_by as requestedBy',
      'request_date as requestDate',
      'notes',
      'created_by as createdBy',
      'created_at as createdAt',
    ]);

  logger.info(`[ExtraRequirement] 创建需求: ${requirement.id}, 项目: ${projectId}, 名称: ${data.name}`);

  return {
    ...requirement,
    estimatedCost: requirement.estimatedCost ? parseFloat(requirement.estimatedCost) : undefined,
    actualCost: parseFloat(requirement.actualCost || '0'),
  };
}

/**
 * 更新需求状态
 */
export async function updateRequirementStatus(
  requirementId: string,
  status: ExtraRequirementStatus,
  approvedBy?: string
): Promise<ExtraRequirement | null> {
  const updateData: Record<string, any> = { status };

  if (status === 'approved' || status === 'rejected') {
    updateData.approval_date = new Date().toISOString().split('T')[0];
    if (approvedBy) {
      updateData.approved_by = approvedBy;
    }
  }

  if (status === 'completed') {
    updateData.completion_date = new Date().toISOString().split('T')[0];
  }

  const [requirement] = await db('extra_requirements')
    .where('id', requirementId)
    .update(updateData)
    .returning([
      'id',
      'project_id as projectId',
      'name',
      'description',
      'estimated_cost as estimatedCost',
      'actual_cost as actualCost',
      'status',
      'requested_by as requestedBy',
      'request_date as requestDate',
      'approval_date as approvalDate',
      'approved_by as approvedBy',
      'completion_date as completionDate',
      'notes',
      'created_by as createdBy',
      'created_at as createdAt',
    ]);

  if (!requirement) {
    return null;
  }

  logger.info(`[ExtraRequirement] 更新状态: ${requirementId}, 新状态: ${status}`);

  return {
    ...requirement,
    estimatedCost: requirement.estimatedCost ? parseFloat(requirement.estimatedCost) : undefined,
    actualCost: parseFloat(requirement.actualCost || '0'),
  };
}

/**
 * 获取需求的支出记录
 */
export async function getRequirementExpenses(requirementId: string): Promise<ExtraRequirementExpense[]> {
  const expenses = await db('extra_requirement_expenses as ere')
    .leftJoin('suppliers as s', 'ere.supplier_id', 's.id')
    .select(
      'ere.id',
      'ere.requirement_id as requirementId',
      'ere.amount',
      'ere.expense_date as expenseDate',
      'ere.supplier_id as supplierId',
      's.name as supplierName',
      'ere.description',
      'ere.created_by as createdBy',
      'ere.created_at as createdAt'
    )
    .where('ere.requirement_id', requirementId)
    .orderBy('ere.expense_date', 'desc');

  return expenses.map(e => ({
    ...e,
    amount: parseFloat(e.amount),
  }));
}

/**
 * 创建支出记录
 */
export async function createExpense(
  requirementId: string,
  data: ExtraRequirementExpenseFormData,
  createdBy: string
): Promise<ExtraRequirementExpense> {
  // 开启事务
  const result = await db.transaction(async (trx) => {
    // 1. 创建支出记录
    const [expense] = await trx('extra_requirement_expenses')
      .insert({
        requirement_id: requirementId,
        amount: data.amount,
        expense_date: data.expenseDate,
        supplier_id: data.supplierId,
        description: data.description,
        created_by: createdBy,
      })
      .returning([
        'id',
        'requirement_id as requirementId',
        'amount',
        'expense_date as expenseDate',
        'supplier_id as supplierId',
        'description',
        'created_by as createdBy',
        'created_at as createdAt',
      ]);

    // 2. 更新需求的实际成本
    const expenses = await trx('extra_requirement_expenses')
      .sum('amount as total')
      .where('requirement_id', requirementId)
      .first();

    const totalActualCost = parseFloat(expenses?.total || '0');

    await trx('extra_requirements')
      .where('id', requirementId)
      .update({ actual_cost: totalActualCost });

    return expense;
  });

  logger.info(`[ExtraRequirement] 创建支出: ${result.id}, 需求: ${requirementId}, 金额: ${data.amount}`);

  // 获取供应商名称
  let supplierName: string | undefined;
  if (data.supplierId) {
    const supplier = await db('suppliers')
      .select('name')
      .where('id', data.supplierId)
      .first();
    supplierName = supplier?.name;
  }

  return {
    ...result,
    amount: parseFloat(result.amount),
    supplierName,
  };
}

/**
 * 删除支出记录
 */
export async function deleteExpense(expenseId: string): Promise<boolean> {
  // 开启事务
  await db.transaction(async (trx) => {
    // 1. 获取支出记录以获取需求ID
    const expense = await trx('extra_requirement_expenses')
      .select('requirement_id')
      .where('id', expenseId)
      .first();

    if (!expense) {
      throw new Error('支出记录不存在');
    }

    const requirementId = expense.requirement_id;

    // 2. 删除支出记录
    await trx('extra_requirement_expenses')
      .where('id', expenseId)
      .del();

    // 3. 更新需求的实际成本
    const expenses = await trx('extra_requirement_expenses')
      .sum('amount as total')
      .where('requirement_id', requirementId)
      .first();

    const totalActualCost = parseFloat(expenses?.total || '0');

    await trx('extra_requirements')
      .where('id', requirementId)
      .update({ actual_cost: totalActualCost });
  });

  logger.info(`[ExtraRequirement] 删除支出: ${expenseId}`);

  return true;
}

export default {
  getProjectRequirements,
  createRequirement,
  updateRequirementStatus,
  getRequirementExpenses,
  createExpense,
  deleteExpense,
};
