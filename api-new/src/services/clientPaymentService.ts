/**
 * 客户回款服务
 * 处理客户回款记录的管理和统计
 */

import { db } from '../config/database';
import { logger } from '../utils/logger';

export interface ClientPayment {
  id: string;
  projectId: string;
  clientId: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ClientPaymentFormData {
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  notes?: string;
}

export interface ProjectPaymentStats {
  contractAmount: number;
  totalClientPayment: number;
  totalSupplierPayment: number;
  remainingClientPayment: number;
  remainingSupplierPayment: number;
}

export interface PaymentBalanceCheckResult {
  canProceed: boolean;
  clientTotalPayment: number;
  supplierTotalPaid: number;
  plannedPaymentAmount: number;
  projectedTotal: number;
  deficit: number;
  message: string;
}

/**
 * 获取项目的客户回款记录
 */
export async function getProjectPayments(projectId: string): Promise<ClientPayment[]> {
  const payments = await db('client_payments')
    .select(
      'id',
      'project_id as projectId',
      'client_id as clientId',
      'amount',
      'payment_date as paymentDate',
      'payment_method as paymentMethod',
      'notes',
      'created_by as createdBy',
      'created_at as createdAt'
    )
    .where('project_id', projectId)
    .orderBy('payment_date', 'desc');

  return payments.map(p => ({
    ...p,
    amount: parseFloat(p.amount),
  }));
}

/**
 * 创建客户回款记录
 */
export async function createPayment(
  projectId: string,
  clientId: string,
  data: ClientPaymentFormData,
  createdBy: string
): Promise<ClientPayment> {
  const [payment] = await db('client_payments')
    .insert({
      project_id: projectId,
      client_id: clientId,
      amount: data.amount,
      payment_date: data.paymentDate,
      payment_method: data.paymentMethod,
      notes: data.notes,
      created_by: createdBy,
    })
    .returning([
      'id',
      'project_id as projectId',
      'client_id as clientId',
      'amount',
      'payment_date as paymentDate',
      'payment_method as paymentMethod',
      'notes',
      'created_by as createdBy',
      'created_at as createdAt',
    ]);

  logger.info(`[ClientPayment] 创建回款记录: ${payment.id}, 项目: ${projectId}, 金额: ${data.amount}`);

  return {
    ...payment,
    amount: parseFloat(payment.amount),
  };
}

/**
 * 删除客户回款记录
 */
export async function deletePayment(paymentId: string): Promise<boolean> {
  const result = await db('client_payments')
    .where('id', paymentId)
    .del();

  logger.info(`[ClientPayment] 删除回款记录: ${paymentId}`);

  return result > 0;
}

/**
 * 获取项目客户回款统计
 */
export async function getProjectPaymentStats(projectId: string): Promise<ProjectPaymentStats> {
  // 获取项目合同金额
  const project = await db('projects')
    .select('amount')
    .where('id', projectId)
    .first();

  const contractAmount = project?.amount ? parseFloat(project.amount) : 0;

  // 获取客户回款合计
  const clientPaymentResult = await db('client_payments')
    .sum('amount as total')
    .where('project_id', projectId)
    .first();

  const totalClientPayment = parseFloat(clientPaymentResult?.total || '0');

  // 获取供应商付款合计（已确认付款）
  // 通过 project_suppliers -> supplier_payment_plans 关联
  const projectSuppliers = await db('project_suppliers')
    .select('id')
    .where('project_id', projectId);

  const projectSupplierIds = projectSuppliers.map(ps => ps.id);

  let totalSupplierPayment = 0;
  if (projectSupplierIds.length > 0) {
    const supplierPaymentResult = await db('supplier_payment_plans')
      .sum('amount as total')
      .whereIn('project_supplier_id', projectSupplierIds)
      .where('status', 'paid')
      .first();

    totalSupplierPayment = parseFloat(supplierPaymentResult?.total || '0');
  }

  return {
    contractAmount,
    totalClientPayment,
    totalSupplierPayment,
    remainingClientPayment: contractAmount - totalClientPayment,
    remainingSupplierPayment: totalClientPayment - totalSupplierPayment,
  };
}

/**
 * 检查供应商付款余额
 * 当付款后累计供应商付款 > 客户回款金额时，返回警告
 */
export async function checkPaymentBalance(
  projectId: string,
  plannedPaymentAmount: number
): Promise<PaymentBalanceCheckResult> {
  const stats = await getProjectPaymentStats(projectId);

  const projectedTotal = stats.totalSupplierPayment + plannedPaymentAmount;
  const deficit = projectedTotal - stats.totalClientPayment;

  const canProceed = deficit <= 0;

  let message = '';
  if (!canProceed) {
    message = `客户回款金额（¥${stats.totalClientPayment.toLocaleString('zh-CN')}）不足以覆盖本次付款后累计供应商付款（¥${projectedTotal.toLocaleString('zh-CN')}），差额为¥${deficit.toLocaleString('zh-CN')}。是否继续付款？`;
  }

  return {
    canProceed,
    clientTotalPayment: stats.totalClientPayment,
    supplierTotalPaid: stats.totalSupplierPayment,
    plannedPaymentAmount,
    projectedTotal,
    deficit,
    message,
  };
}

export default {
  getProjectPayments,
  createPayment,
  deletePayment,
  getProjectPaymentStats,
  checkPaymentBalance,
};
