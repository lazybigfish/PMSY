/**
 * 项目财务 Hook
 * 处理项目外采统计、供应商金额校验等
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getProjectProcurementStats,
  createProjectSupplier,
  updateProjectSupplier,
  deleteProjectSupplier,
  type ProjectProcurementStats,
  type ProjectSupplierAssociation,
} from '../services/projectFinanceService';

interface UseProjectFinanceOptions {
  projectId: string;
}

interface UseProjectFinanceReturn {
  // 统计数据
  stats: ProjectProcurementStats | null;
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  refresh: () => Promise<void>;
  createAssociation: (data: Omit<ProjectSupplierAssociation, 'project_id'>) => Promise<ProjectSupplierAssociation>;
  updateAssociation: (id: string, data: Partial<ProjectSupplierAssociation>) => Promise<ProjectSupplierAssociation>;
  deleteAssociation: (id: string) => Promise<void>;
  
  // 辅助状态
  isLowBudget: boolean;
}

export function useProjectFinance({ projectId }: UseProjectFinanceOptions): UseProjectFinanceReturn {
  const [stats, setStats] = useState<ProjectProcurementStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getProjectProcurementStats(projectId);
      setStats(data);
    } catch (err: any) {
      setError(err.message || '获取外采统计失败');
      console.error('[useProjectFinance] 获取统计失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // 创建供应商关联
  const createAssociation = useCallback(async (
    data: Omit<ProjectSupplierAssociation, 'project_id'>
  ): Promise<ProjectSupplierAssociation> => {
    const result = await createProjectSupplier({
      ...data,
      project_id: projectId,
    });
    // 刷新统计
    await fetchStats();
    return result;
  }, [projectId, fetchStats]);

  // 更新供应商关联
  const updateAssociation = useCallback(async (
    id: string,
    data: Partial<ProjectSupplierAssociation>
  ): Promise<ProjectSupplierAssociation> => {
    const result = await updateProjectSupplier(id, data);
    // 刷新统计
    await fetchStats();
    return result;
  }, [fetchStats]);

  // 删除供应商关联
  const deleteAssociation = useCallback(async (id: string): Promise<void> => {
    await deleteProjectSupplier(id);
    // 刷新统计
    await fetchStats();
  }, [fetchStats]);

  // 是否低预算（剩余金额低于10%）
  const isLowBudget = stats ? stats.remainingPercentage < 10 : false;

  // 组件挂载时自动获取数据
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
    createAssociation,
    updateAssociation,
    deleteAssociation,
    isLowBudget,
  };
}
