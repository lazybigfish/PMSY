/**
 * 合同外需求管理Tab
 */

import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, Check, Clock, AlertCircle, FileText } from 'lucide-react';
import { 
  useExtraRequirement, 
  ExtraRequirementFormData, 
  ExtraRequirementExpenseFormData,
  ExtraRequirementStatus 
} from '../../../hooks/useExtraRequirement';
import { ModalForm, Modal } from '../../../components/Modal';
import { format } from 'date-fns';

interface ExtraRequirementsProps {
  projectId: string;
  canEdit?: boolean;
}

const statusConfig: Record<ExtraRequirementStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: '待评估', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: '已批准', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800', icon: XCircle },
  completed: { label: '已完成', color: 'bg-blue-100 text-blue-800', icon: Check },
};

export default function ExtraRequirements({ projectId, canEdit = true }: ExtraRequirementsProps) {
  const { 
    requirements, 
    isLoading, 
    createRequirement, 
    updateStatus, 
    createExpense,
    fetchExpenses,
    deleteExpense,
  } = useExtraRequirement({ projectId });
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<ExtraRequirementFormData>({
    name: '',
    description: '',
    estimatedCost: undefined,
    requestedBy: '',
    requestDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  
  const [expenseFormData, setExpenseFormData] = useState<ExtraRequirementExpenseFormData>({
    amount: 0,
    expenseDate: format(new Date(), 'yyyy-MM-dd'),
    description: '',
  });
  
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('需求名称不能为空');
      return;
    }

    try {
      await createRequirement(formData);
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        description: '',
        estimatedCost: undefined,
        requestedBy: '',
        requestDate: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '创建需求失败');
    }
  };

  const handleStatusChange = async (id: string, status: ExtraRequirementStatus) => {
    try {
      await updateStatus(id, status);
    } catch (err) {
      alert('更新状态失败');
    }
  };

  const openExpenseModal = async (requirementId: string) => {
    setSelectedRequirement(requirementId);
    const data = await fetchExpenses(requirementId);
    setExpenses(data);
    setIsExpenseModalOpen(true);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequirement) return;
    
    if (expenseFormData.amount <= 0) {
      setFormError('支出金额必须大于0');
      return;
    }

    try {
      await createExpense(selectedRequirement, expenseFormData);
      const data = await fetchExpenses(selectedRequirement);
      setExpenses(data);
      setExpenseFormData({
        amount: 0,
        expenseDate: format(new Date(), 'yyyy-MM-dd'),
        description: '',
      });
      setFormError('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '创建支出记录失败');
    }
  };

  const handleDeleteExpense = async (expenseId: string, amount: number) => {
    if (!selectedRequirement) return;
    if (!confirm('确定要删除这条支出记录吗？')) return;
    
    try {
      await deleteExpense(expenseId, selectedRequirement, amount);
      const data = await fetchExpenses(selectedRequirement);
      setExpenses(data);
    } catch (err) {
      alert('删除失败');
    }
  };

  const formatAmount = (amount: number) => {
    return `¥${amount.toLocaleString('zh-CN')}`;
  };

  const getCostStatus = (estimated?: number, actual: number = 0) => {
    if (!estimated) return null;
    if (actual > estimated) return { text: '超出预估', color: 'text-red-600' };
    if (actual >= estimated * 0.9) return { text: '接近预估', color: 'text-yellow-600' };
    return { text: '正常', color: 'text-green-600' };
  };

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">合同外需求</h2>
        {canEdit && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            新增需求
          </button>
        )}
      </div>

      {/* 需求列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : requirements.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">暂无合同外需求</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requirements.map((req) => {
            const StatusIcon = statusConfig[req.status].icon;
            const costStatus = getCostStatus(req.estimatedCost, req.actualCost);
            
            return (
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{req.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[req.status].color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig[req.status].label}
                      </span>
                    </div>
                    
                    {req.description && (
                      <p className="text-sm text-gray-600 mb-3">{req.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {req.requestedBy && (
                        <span>提出人: {req.requestedBy}</span>
                      )}
                      {req.requestDate && (
                        <span>提出时间: {req.requestDate}</span>
                      )}
                      {req.estimatedCost !== undefined && (
                        <span>预估成本: {formatAmount(req.estimatedCost)}</span>
                      )}
                      <span>
                        实际支出: {formatAmount(req.actualCost)}
                        {costStatus && (
                          <span className={`ml-2 text-xs ${costStatus.color}`}>
                            ({costStatus.text})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  {canEdit && (
                    <div className="flex items-center gap-2 ml-4">
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(req.id, 'approved')}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            批准
                          </button>
                          <button
                            onClick={() => handleStatusChange(req.id, 'rejected')}
                            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                          >
                            拒绝
                          </button>
                        </>
                      )}
                      {(req.status === 'approved' || req.status === 'completed') && (
                        <button
                          onClick={() => openExpenseModal(req.id)}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                        >
                          记录支出
                        </button>
                      )}
                      {req.status === 'approved' && req.actualCost > 0 && (
                        <button
                          onClick={() => handleStatusChange(req.id, 'completed')}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          标记完成
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 新增需求弹窗 */}
      <ModalForm
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setFormError('');
        }}
        onSubmit={handleSubmit}
        title="新增合同外需求"
        maxWidth="md"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">需求名称 *</label>
            <input
              type="text"
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入需求名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">需求描述</label>
            <textarea
              rows={3}
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="可选填"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">预估成本</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">¥</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  value={formData.estimatedCost || ''}
                  onChange={(e) => setFormData({ ...formData, estimatedCost: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">提出时间</label>
              <input
                type="date"
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={formData.requestDate}
                onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">提出人</label>
            <input
              type="text"
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              value={formData.requestedBy}
              onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
              placeholder="可选填"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">备注</label>
            <textarea
              rows={2}
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="可选填"
            />
          </div>
        </div>
      </ModalForm>

      {/* 支出记录弹窗 */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setFormError('');
          setExpenses([]);
        }}
        title="记录支出"
        maxWidth="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {formError}
            </div>
          )}

          {/* 新增支出表单 */}
          {canEdit && (
            <form onSubmit={handleAddExpense} className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-gray-900">新增支出</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">支出金额 *</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">¥</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-3 sm:text-sm border-gray-300 rounded-md"
                      value={expenseFormData.amount || ''}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">支出日期 *</label>
                  <input
                    type="date"
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={expenseFormData.expenseDate}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, expenseDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">描述</label>
                <input
                  type="text"
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={expenseFormData.description}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                  placeholder="可选填"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
              >
                添加支出
              </button>
            </form>
          )}

          {/* 支出列表 */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">支出记录</h4>
            {expenses.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">暂无支出记录</p>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{formatAmount(expense.amount)}</div>
                      <div className="text-xs text-gray-500">
                        {expense.expenseDate}
                        {expense.description && ` · ${expense.description}`}
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleDeleteExpense(expense.id, expense.amount)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
