/**
 * 客户回款Hook
 * 管理客户回款记录的获取、创建和删除
 */

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../lib/api';

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

interface UseClientPaymentOptions {
  projectId: string;
}

export function useClientPayment(options: UseClientPaymentOptions) {
  const { projectId } = options;
  
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [stats, setStats] = useState<ProjectPaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取回款记录列表
  const fetchPayments = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.get<ClientPayment[]>(`/api/projects/${projectId}/client-payments`);
      setPayments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取回款记录失败');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // 获取付款统计
  const fetchStats = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const data = await apiClient.get<ProjectPaymentStats>(`/api/projects/${projectId}/payment-stats`);
      setStats(data);
    } catch (err) {
      console.error('获取付款统计失败:', err);
    }
  }, [projectId]);

  // 创建回款记录
  const createPayment = useCallback(async (data: ClientPaymentFormData): Promise<ClientPayment | null> => {
    if (!projectId) return null;
    
    try {
      const newPayment = await apiClient.post<ClientPayment>(`/api/projects/${projectId}/client-payments`, data);
      setPayments(prev => [newPayment, ...prev]);
      await fetchStats(); // 刷新统计
      return newPayment;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建回款记录失败');
      throw err;
    }
  }, [projectId, fetchStats]);

  // 删除回款记录
  const deletePayment = useCallback(async (paymentId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/api/projects/client-payments/${paymentId}`);
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      await fetchStats(); // 刷新统计
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除回款记录失败');
      throw err;
    }
  }, [fetchStats]);

  // 检查付款余额
  const checkPaymentBalance = useCallback(async (plannedPaymentAmount: number): Promise<PaymentBalanceCheckResult> => {
    if (!projectId) {
      throw new Error('项目ID不能为空');
    }
    
    return await apiClient.get<PaymentBalanceCheckResult>(
      `/api/projects/${projectId}/payment-balance-check?plannedPaymentAmount=${plannedPaymentAmount}`
    );
  }, [projectId]);

  // 初始加载
  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [fetchPayments, fetchStats]);

  return {
    payments,
    stats,
    isLoading,
    error,
    createPayment,
    deletePayment,
    checkPaymentBalance,
    refresh: fetchPayments,
    refreshStats: fetchStats,
  };
}

export default useClientPayment;
