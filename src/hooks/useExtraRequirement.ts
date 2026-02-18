/**
 * 合同外需求Hook
 * 管理合同外需求的获取、创建和状态更新
 */

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../lib/api';

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
  approvedByName?: string;
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

interface UseExtraRequirementOptions {
  projectId: string;
}

export function useExtraRequirement(options: UseExtraRequirementOptions) {
  const { projectId } = options;
  
  const [requirements, setRequirements] = useState<ExtraRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取需求列表
  const fetchRequirements = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.get<ExtraRequirement[]>(`/api/projects/${projectId}/extra-requirements`);
      setRequirements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取合同外需求失败');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // 创建需求
  const createRequirement = useCallback(async (data: ExtraRequirementFormData): Promise<ExtraRequirement | null> => {
    if (!projectId) return null;
    
    try {
      const newRequirement = await apiClient.post<ExtraRequirement>(`/api/projects/${projectId}/extra-requirements`, data);
      setRequirements(prev => [newRequirement, ...prev]);
      return newRequirement;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建合同外需求失败');
      throw err;
    }
  }, [projectId]);

  // 更新需求状态
  const updateStatus = useCallback(async (requirementId: string, status: ExtraRequirementStatus): Promise<ExtraRequirement | null> => {
    try {
      const updatedRequirement = await apiClient.patch<ExtraRequirement>(`/api/projects/extra-requirements/${requirementId}/status`, { status });
      setRequirements(prev => 
        prev.map(r => r.id === requirementId ? updatedRequirement : r)
      );
      return updatedRequirement;
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新需求状态失败');
      throw err;
    }
  }, []);

  // 获取支出记录
  const fetchExpenses = useCallback(async (requirementId: string): Promise<ExtraRequirementExpense[]> => {
    return await apiClient.get<ExtraRequirementExpense[]>(`/api/projects/extra-requirements/${requirementId}/expenses`);
  }, []);

  // 创建支出记录
  const createExpense = useCallback(async (
    requirementId: string, 
    data: ExtraRequirementExpenseFormData
  ): Promise<ExtraRequirementExpense | null> => {
    try {
      const newExpense = await apiClient.post<ExtraRequirementExpense>(`/api/projects/extra-requirements/${requirementId}/expenses`, data);
      
      // 更新需求的实际成本
      setRequirements(prev => 
        prev.map(r => {
          if (r.id === requirementId) {
            return {
              ...r,
              actualCost: r.actualCost + data.amount,
            };
          }
          return r;
        })
      );
      
      return newExpense;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建支出记录失败');
      throw err;
    }
  }, []);

  // 删除支出记录
  const deleteExpense = useCallback(async (expenseId: string, requirementId: string, amount: number): Promise<boolean> => {
    try {
      await apiClient.delete(`/api/projects/extra-requirement-expenses/${expenseId}`);
      
      // 更新需求的实际成本
      setRequirements(prev => 
        prev.map(r => {
          if (r.id === requirementId) {
            return {
              ...r,
              actualCost: Math.max(0, r.actualCost - amount),
            };
          }
          return r;
        })
      );
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除支出记录失败');
      throw err;
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  return {
    requirements,
    isLoading,
    error,
    createRequirement,
    updateStatus,
    fetchExpenses,
    createExpense,
    deleteExpense,
    refresh: fetchRequirements,
  };
}

export default useExtraRequirement;
