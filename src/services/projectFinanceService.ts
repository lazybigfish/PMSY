/**
 * 项目财务服务
 * 处理项目外采统计、供应商金额校验等
 */

import { api } from '../lib/api';

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
export async function getProjectProcurementStats(
  projectId: string
): Promise<ProjectProcurementStats> {
  return api.request(`/api/projects/${projectId}/procurement-stats`);
}

/**
 * 项目供应商关联（带金额校验）
 */
export interface ProjectSupplierAssociation {
  id?: string;
  project_id: string;
  supplier_id: string;
  contract_amount?: number;
  contract_date?: string;
  delivery_date?: string;
  status?: string;
  notes?: string;
  module_ids?: string[];
}

/**
 * 创建项目供应商关联
 * @param data 关联数据
 * @returns 创建的关联
 */
export async function createProjectSupplier(
  data: ProjectSupplierAssociation
): Promise<ProjectSupplierAssociation> {
  return api.request('/api/project-suppliers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 更新项目供应商关联
 * @param id 关联ID
 * @param data 更新数据
 * @returns 更新后的关联
 */
export async function updateProjectSupplier(
  id: string,
  data: Partial<ProjectSupplierAssociation>
): Promise<ProjectSupplierAssociation> {
  return api.request(`/api/project-suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * 删除项目供应商关联
 * @param id 关联ID
 */
export async function deleteProjectSupplier(id: string): Promise<void> {
  return api.request(`/api/project-suppliers/${id}`, {
    method: 'DELETE',
  });
}

// 导出服务对象
export const projectFinanceService = {
  getProjectProcurementStats,
  createProjectSupplier,
  updateProjectSupplier,
  deleteProjectSupplier,
};
