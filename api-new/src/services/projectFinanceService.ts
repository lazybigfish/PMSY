import { db } from '../config/database';

/**
 * 供应商合同摘要
 */
export interface SupplierContractSummary {
  supplierId: string;
  supplierName: string;
  contractAmount: number;
}

/**
 * 项目外采统计
 */
export interface ProjectProcurementStats {
  projectAmount: number;
  totalContractAmount: number;
  remainingAmount: number;
  remainingPercentage: number;
  supplierContracts: SupplierContractSummary[];
}

/**
 * 获取项目外采统计
 * @param projectId 项目ID
 * @returns 项目外采统计信息
 */
export async function getProcurementStats(projectId: string): Promise<ProjectProcurementStats> {
  // 获取项目金额
  const project = await db('projects')
    .select('amount')
    .where({ id: projectId })
    .first();

  const projectAmount = project?.amount ? parseFloat(project.amount) : 0;

  // 获取已关联供应商的合同金额
  const supplierContracts = await db('project_suppliers as ps')
    .join('suppliers as s', 'ps.supplier_id', 's.id')
    .select(
      'ps.supplier_id as supplierId',
      's.name as supplierName',
      'ps.contract_amount as contractAmount'
    )
    .where({ 'ps.project_id': projectId });

  // 计算已外采金额合计
  const totalContractAmount = supplierContracts.reduce((sum, item) => {
    return sum + (item.contractAmount ? parseFloat(item.contractAmount) : 0);
  }, 0);

  // 计算剩余金额
  const remainingAmount = projectAmount - totalContractAmount;

  // 计算剩余百分比
  const remainingPercentage = projectAmount > 0
    ? Math.round((remainingAmount / projectAmount) * 100)
    : 0;

  return {
    projectAmount,
    totalContractAmount,
    remainingAmount,
    remainingPercentage,
    supplierContracts: supplierContracts.map(item => ({
      supplierId: item.supplierId,
      supplierName: item.supplierName,
      contractAmount: item.contractAmount ? parseFloat(item.contractAmount) : 0,
    })),
  };
}

/**
 * 检查合同金额是否超出剩余可外采金额
 * @param projectId 项目ID
 * @param contractAmount 合同金额
 * @param excludeSupplierId 排除的供应商ID（编辑时使用）
 * @returns 检查结果
 */
export async function checkContractAmount(
  projectId: string,
  contractAmount: number,
  excludeSupplierId?: string
): Promise<{
  valid: boolean;
  message?: string;
  remainingAmount: number;
}> {
  const stats = await getProcurementStats(projectId);

  // 如果编辑现有供应商，需要加上该供应商原有的合同金额
  let adjustedRemainingAmount = stats.remainingAmount;
  if (excludeSupplierId) {
    const existingContract = stats.supplierContracts.find(
      sc => sc.supplierId === excludeSupplierId
    );
    if (existingContract) {
      adjustedRemainingAmount += existingContract.contractAmount;
    }
  }

  if (contractAmount > adjustedRemainingAmount) {
    return {
      valid: false,
      message: `合同金额超出剩余可外采金额 ¥${adjustedRemainingAmount.toLocaleString('zh-CN')}`,
      remainingAmount: adjustedRemainingAmount,
    };
  }

  return {
    valid: true,
    remainingAmount: adjustedRemainingAmount,
  };
}

/**
 * 检查剩余金额是否低于10%
 * @param projectId 项目ID
 * @returns 是否低于10%
 */
export async function isLowRemainingBudget(projectId: string): Promise<boolean> {
  const stats = await getProcurementStats(projectId);
  return stats.remainingPercentage < 10;
}

export default {
  getProcurementStats,
  checkContractAmount,
  isLowRemainingBudget,
};
