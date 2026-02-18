/**
 * 客户回款管理Tab
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Wallet, Receipt, PiggyBank, AlertCircle, Percent } from 'lucide-react';
import { useClientPayment, ClientPaymentFormData } from '../../../hooks/useClientPayment';
import { ModalForm } from '../../../components/Modal';
import { format } from 'date-fns';

type InputMode = 'percentage' | 'amount';

interface ClientPaymentsProps {
  projectId: string;
  canEdit?: boolean;
}

export default function ClientPayments({ projectId, canEdit = true }: ClientPaymentsProps) {
  const { payments, stats, isLoading, createPayment, deletePayment } = useClientPayment({ projectId });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // 输入模式状态
  const [inputMode, setInputMode] = useState<InputMode>('percentage');
  const [percentage, setPercentage] = useState<number>(0);
  const [formData, setFormData] = useState<ClientPaymentFormData>({
    amount: 0,
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  // 计算已回款比例
  const paidPercentage = useMemo(() => {
    if (!stats || stats.contractAmount === 0) return 0;
    return (stats.totalClientPayment / stats.contractAmount) * 100;
  }, [stats]);

  // 计算剩余可回款比例
  const remainingPercentage = useMemo(() => {
    return Math.max(0, 100 - paidPercentage);
  }, [paidPercentage]);

  // 计算当前总比例（已回款 + 当前输入）
  const totalPercentageAfter = useMemo(() => {
    return paidPercentage + percentage;
  }, [paidPercentage, percentage]);

  // 校验是否超过100%
  const isOverLimit = totalPercentageAfter > 100;

  // 当比例变化时，自动计算金额
  useEffect(() => {
    if (inputMode === 'percentage' && stats) {
      const calculatedAmount = (percentage / 100) * stats.contractAmount;
      setFormData(prev => ({ ...prev, amount: Math.round(calculatedAmount * 100) / 100 }));
    }
  }, [percentage, inputMode, stats]);

  // 当金额变化时，自动计算比例
  useEffect(() => {
    if (inputMode === 'amount' && stats && stats.contractAmount > 0) {
      const calculatedPercentage = (formData.amount / stats.contractAmount) * 100;
      setPercentage(Math.round(calculatedPercentage * 100) / 100);
    }
  }, [formData.amount, inputMode, stats]);

  // 重置表单
  const resetForm = () => {
    setInputMode('percentage');
    setPercentage(0);
    setFormData({
      amount: 0,
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: '',
      notes: '',
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (formData.amount <= 0) {
      setFormError('回款金额必须大于0');
      return;
    }

    if (!formData.paymentDate) {
      setFormError('请选择回款日期');
      return;
    }

    if (isOverLimit) {
      setFormError(`回款比例合计不能超过100%，当前已回款${paidPercentage.toFixed(2)}%`);
      return;
    }

    try {
      await createPayment(formData);
      setIsAddModalOpen(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '创建回款记录失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条回款记录吗？')) return;
    try {
      await deletePayment(id);
    } catch (err) {
      alert('删除失败');
    }
  };

  const formatAmount = (amount: number) => {
    return `¥${amount.toLocaleString('zh-CN')}`;
  };

  const getStatusColor = (remaining: number, total: number) => {
    if (total === 0) return 'text-gray-600';
    const ratio = remaining / total;
    if (ratio < 0.1) return 'text-red-600';
    if (ratio < 0.3) return 'text-yellow-600';
    return 'text-green-600';
  };

  // 计算单条回款记录的比例
  const getPaymentPercentage = (amount: number) => {
    if (!stats || stats.contractAmount === 0) return 0;
    return (amount / stats.contractAmount) * 100;
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-50">
                <Wallet className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">合同金额</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatAmount(stats.contractAmount)}</div>
            <div className="text-xs text-gray-500 mt-1">100%</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-green-50">
                <Receipt className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">已回款金额</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{formatAmount(stats.totalClientPayment)}</div>
            <div className="text-xs text-green-600 mt-1">{paidPercentage.toFixed(2)}%</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-orange-50">
                <PiggyBank className="w-4 h-4 text-orange-600" />
              </div>
              <span className="text-sm text-gray-500">未回款金额</span>
            </div>
            <div className={`text-xl font-bold ${getStatusColor(stats.remainingClientPayment, stats.contractAmount)}`}>
              {formatAmount(stats.remainingClientPayment)}
            </div>
            <div className="text-xs text-orange-600 mt-1">{remainingPercentage.toFixed(2)}%</div>
          </div>
        </div>
      )}

      {/* 资金平衡提示 */}
      {stats && stats.remainingSupplierPayment < 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <div className="font-semibold text-red-700">资金缺口警告</div>
            <div className="text-sm text-red-600">
              供应商付款已超出客户回款金额 {formatAmount(Math.abs(stats.remainingSupplierPayment))}
            </div>
          </div>
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">回款记录</h2>
        {canEdit && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            新增回款
          </button>
        )}
      </div>

      {/* 回款列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">暂无回款记录</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">回款日期</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">回款金额</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">比例</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
                {canEdit && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.paymentDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatAmount(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      <Percent className="w-3 h-3 mr-1" />
                      {getPaymentPercentage(payment.amount).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {payment.notes || '-'}
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增回款弹窗 */}
      <ModalForm
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        onSubmit={handleSubmit}
        title="新增回款"
        maxWidth="md"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {formError}
            </div>
          )}

          {/* 合同金额和已回款比例提示 */}
          {stats && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">合同金额:</span>
                <span className="font-medium text-gray-900">{formatAmount(stats.contractAmount)} (100%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">已回款比例:</span>
                <span className="font-medium text-green-600">{paidPercentage.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">剩余可回款比例:</span>
                <span className="font-medium text-orange-600">{remainingPercentage.toFixed(2)}%</span>
              </div>
            </div>
          )}

          {/* 输入方式切换 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">输入方式</label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  checked={inputMode === 'percentage'}
                  onChange={() => setInputMode('percentage')}
                />
                <span className="ml-2 text-sm text-gray-700">按比例</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  checked={inputMode === 'amount'}
                  onChange={() => setInputMode('amount')}
                />
                <span className="ml-2 text-sm text-gray-700">按金额</span>
              </label>
            </div>
          </div>

          {/* 按比例输入 */}
          {inputMode === 'percentage' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">回款比例 *</label>
                <div className="mt-2">
                  {/* 滑块 */}
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max={remainingPercentage}
                      step="0.01"
                      value={percentage}
                      onChange={(e) => setPercentage(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <span className="text-sm font-medium text-gray-900 w-16 text-right">
                      {percentage.toFixed(2)}%
                    </span>
                  </div>
                  {/* 数字输入 - 禁用鼠标滚轮调整 */}
                  <div className="mt-2 flex items-center">
                    <input
                      type="number"
                      min="0"
                      max={remainingPercentage}
                      step="0.01"
                      value={percentage || ''}
                      onChange={(e) => setPercentage(parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-32 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0.00"
                    />
                    <span className="ml-2 text-sm text-gray-500">%</span>
                  </div>
                </div>
              </div>

              {/* 自动计算的金额 */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700">回款金额 (自动计算):</span>
                  <span className="text-lg font-bold text-blue-900">{formatAmount(formData.amount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 按金额输入 */}
          {inputMode === 'amount' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">回款金额 *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">¥</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={stats?.remainingClientPayment}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* 自动计算的比例 */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700">回款比例 (自动计算):</span>
                  <span className="text-lg font-bold text-blue-900">{percentage.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* 比例校验提示 */}
          {isOverLimit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <div className="font-semibold">回款比例合计将超过100%</div>
              <div>已回款: {paidPercentage.toFixed(2)}% + 本次: {percentage.toFixed(2)}% = {totalPercentageAfter.toFixed(2)}%</div>
              <div className="mt-1">最大可输入比例: {remainingPercentage.toFixed(2)}%</div>
            </div>
          )}

          {/* 比例进度预览 */}
          {percentage > 0 && !isOverLimit && (
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-sm text-green-700 mb-2">回款后比例分布:</div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-green-500" 
                  style={{ width: `${paidPercentage}%` }}
                  title={`已回款: ${paidPercentage.toFixed(2)}%`}
                />
                <div 
                  className="h-full bg-blue-500" 
                  style={{ width: `${percentage}%` }}
                  title={`本次回款: ${percentage.toFixed(2)}%`}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>已回款 {paidPercentage.toFixed(2)}%</span>
                <span>本次 +{percentage.toFixed(2)}%</span>
                <span>剩余 {Math.max(0, 100 - totalPercentageAfter).toFixed(2)}%</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">回款日期 *</label>
            <input
              type="date"
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">备注</label>
            <textarea
              rows={3}
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="可选填"
            />
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
