import React, { useState, useEffect } from 'react';
import { ProjectSupplier, ProjectModule, SupplierAcceptance } from '../../../types';
import { FileText, X, ExternalLink, Plus, Upload, ChevronRight, ChevronDown, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { DatePicker } from '../../../components/DatePicker';

// 验收类型配置
const ACCEPTANCE_TYPE_CONFIG = {
  initial: { label: '初验', color: 'bg-blue-100 text-blue-800', icon: Clock },
  final: { label: '终验', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  phase: { label: '阶段性验收', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
};

// 模块树形选择组件（用于详情页编辑）
interface ModuleTreeSelectProps {
  modules: ProjectModule[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function ModuleTreeSelect({ modules, selectedIds, onChange }: ModuleTreeSelectProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const buildTree = (items: ProjectModule[]): ProjectModule[] => {
    const map: Record<string, ProjectModule> = {};
    const roots: ProjectModule[] = [];

    items.forEach((item) => {
      map[item.id] = { ...item, children: [] };
    });

    items.forEach((item) => {
      if (item.parent_id && map[item.parent_id]) {
        map[item.parent_id].children?.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });

    return roots;
  };

  const getAllChildrenIds = (module: ProjectModule): string[] => {
    const ids: string[] = [module.id];
    if (module.children) {
      module.children.forEach(child => {
        ids.push(...getAllChildrenIds(child));
      });
    }
    return ids;
  };

  const areAllChildrenSelected = (module: ProjectModule): boolean => {
    if (!module.children || module.children.length === 0) {
      return selectedIds.includes(module.id);
    }
    return module.children.every(child => areAllChildrenSelected(child));
  };

  const hasSomeChildrenSelected = (module: ProjectModule): boolean => {
    if (!module.children || module.children.length === 0) {
      return false;
    }
    const childrenIds = getAllChildrenIds(module).filter(id => id !== module.id);
    return childrenIds.some(id => selectedIds.includes(id)) && !areAllChildrenSelected(module);
  };

  const handleToggle = (module: ProjectModule) => {
    const allIds = getAllChildrenIds(module);
    const isSelected = selectedIds.includes(module.id);

    if (isSelected) {
      onChange(selectedIds.filter(id => !allIds.includes(id)));
    } else {
      const newIds = [...selectedIds];
      allIds.forEach(id => {
        if (!newIds.includes(id)) {
          newIds.push(id);
        }
      });
      onChange(newIds);
    }
  };

  const toggleExpand = (moduleId: string) => {
    setExpanded(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const treeModules = buildTree(modules);

  const renderNode = (node: ProjectModule, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded[node.id] ?? true;
    const isSelected = selectedIds.includes(node.id);
    const isIndeterminate = hasSomeChildrenSelected(node);
    const allChildrenSelected = hasChildren && areAllChildrenSelected(node);

    return (
      <div key={node.id}>
        <div 
          className="flex items-center py-1.5 hover:bg-gray-50 rounded"
          style={{ paddingLeft: `${level * 20}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="mr-1 p-0.5 rounded hover:bg-gray-200"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          ) : (
            <span className="w-6" />
          )}
          <input
            type="checkbox"
            id={`detail-module-${node.id}`}
            checked={isSelected || allChildrenSelected}
            ref={(el) => {
              if (el) {
                el.indeterminate = isIndeterminate;
              }
            }}
            onChange={() => handleToggle(node)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label 
            htmlFor={`detail-module-${node.id}`} 
            className="ml-2 block text-sm text-gray-900 cursor-pointer flex-1"
            onClick={() => handleToggle(node)}
          >
            {node.name}
          </label>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children?.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (modules.length === 0) {
    return <p className="text-sm text-gray-500 py-2">该项目暂无功能模块</p>;
  }

  return (
    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md bg-white p-2">
      {treeModules.map(node => renderNode(node))}
    </div>
  );
}

// 付款计划类型定义
interface SupplierPaymentPlan {
  id: string;
  project_supplier_id: string;
  planned_date: string;
  amount: number;
  percentage: number;
  reason: string;
  status: 'pending' | 'paid';
  actual_payment_date?: string;
  voucher_url?: string;
  created_at: string;
  updated_at: string;
}

interface SupplierDetailModalProps {
  projectSupplier: ProjectSupplier;
  projectModules: ProjectModule[];
  onClose: () => void;
  onUpdate: () => void;
}

export function SupplierDetailModal({ projectSupplier, projectModules, onClose, onUpdate }: SupplierDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'acceptance-payment'>('info');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] overflow-y-auto">
      <div className="bg-white rounded-lg max-w-6xl w-full h-[90vh] flex flex-col shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{projectSupplier.supplier?.name}</h3>
            <p className="text-sm text-gray-500 mt-1">供应商详情管理</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              基本信息
            </button>
            <button
              onClick={() => setActiveTab('acceptance-payment')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'acceptance-payment'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              验收与付款
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <SupplierInfoTab
              projectSupplier={projectSupplier}
              projectModules={projectModules}
              onUpdate={onUpdate}
            />
          )}
          {activeTab === 'acceptance-payment' && (
            <SupplierAcceptancePaymentTab
              projectSupplier={projectSupplier}
              onUpdate={onUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// 获取验收状态显示配置
function getAcceptanceStatusConfig(acceptances: SupplierAcceptance[]) {
  if (acceptances.length === 0) {
    return {
      label: '未验收',
      color: 'bg-gray-50',
      textColor: 'text-gray-600',
      subText: '暂无验收记录'
    };
  }

  const hasFinal = acceptances.some(a => a.acceptance_type === 'final');
  const hasInitial = acceptances.some(a => a.acceptance_type === 'initial');
  const hasPhase = acceptances.some(a => a.acceptance_type === 'phase');

  // 按日期排序获取最新验收
  const sortedAcceptances = [...acceptances].sort(
    (a, b) => new Date(b.acceptance_date).getTime() - new Date(a.acceptance_date).getTime()
  );
  const latestAcceptance = sortedAcceptances[0];
  const latestTypeConfig = ACCEPTANCE_TYPE_CONFIG[latestAcceptance.acceptance_type];

  if (hasFinal) {
    return {
      label: '终验完成',
      color: 'bg-green-50',
      textColor: 'text-green-600',
      subText: `最新: ${latestTypeConfig.label} ${new Date(latestAcceptance.acceptance_date).toLocaleDateString('zh-CN')}`
    };
  }

  if (hasInitial) {
    return {
      label: '初验完成',
      color: 'bg-blue-50',
      textColor: 'text-blue-600',
      subText: `最新: 初验 ${new Date(latestAcceptance.acceptance_date).toLocaleDateString('zh-CN')}`
    };
  }

  if (hasPhase) {
    return {
      label: '阶段性验收',
      color: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      subText: `最新: 阶段性验收 ${new Date(latestAcceptance.acceptance_date).toLocaleDateString('zh-CN')}`
    };
  }

  return {
    label: '未验收',
    color: 'bg-gray-50',
    textColor: 'text-gray-600',
    subText: '暂无验收记录'
  };
}

// 基本信息标签页
function SupplierInfoTab({ projectSupplier, projectModules, onUpdate }: {
  projectSupplier: ProjectSupplier;
  projectModules: ProjectModule[];
  onUpdate: () => void;
}) {
  const [isEditingModules, setIsEditingModules] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>(projectSupplier.module_ids || []);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const [acceptanceStatus, setAcceptanceStatus] = useState<{
    count: number;
    config: { label: string; color: string; textColor: string; subText: string };
  }>({ count: 0, config: { label: '未验收', color: 'bg-gray-50', textColor: 'text-gray-600', subText: '暂无验收记录' } });
  
  const [paymentStats, setPaymentStats] = useState({
    totalPaid: 0,
    remaining: 0,
    remainingPercentage: 0
  });

  useEffect(() => {
    fetchAcceptanceStatus();
    fetchPaymentStats();
  }, [projectSupplier.id]);

  const fetchAcceptanceStatus = async () => {
    const { data } = await supabase
      .from('supplier_acceptances')
      .select('*')
      .eq('project_supplier_id', projectSupplier.id);
    
    const acceptances = data || [];
    setAcceptanceStatus({
      count: acceptances.length,
      config: getAcceptanceStatusConfig(acceptances)
    });
  };

  const fetchPaymentStats = async () => {
    const { data } = await supabase
      .from('supplier_payment_plans')
      .select('amount, status')
      .eq('project_supplier_id', projectSupplier.id);
    
    const plans = data || [];
    const totalPaid = plans
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const remaining = (projectSupplier.contract_amount || 0) - totalPaid;
    const remainingPercentage = projectSupplier.contract_amount > 0 
      ? (remaining / projectSupplier.contract_amount) * 100 
      : 0;
    
    setPaymentStats({
      totalPaid,
      remaining,
      remainingPercentage
    });
  };

  const getModuleNames = (ids: string[]) => {
    if (!ids || ids.length === 0) return '-';
    return ids.map(id => projectModules.find(m => m.id === id)?.name).filter(Boolean).join(', ');
  };

  const handleSaveModules = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('project_suppliers')
        .update({ module_ids: selectedModules })
        .eq('id', projectSupplier.id);

      if (error) throw error;
      onUpdate();
      setIsEditingModules(false);
    } catch (error) {
      console.error('Error updating modules:', error);
      alert('更新负责模块失败');
    } finally {
      setLoading(false);
    }
  };

  const canEditModules = async () => {
    if (!user) return false;
    const { data } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectSupplier.project_id)
      .eq('user_id', user.id)
      .single();
    return !!data;
  };

  const [canEdit, setCanEdit] = useState(false);
  useEffect(() => {
    canEditModules().then(setCanEdit);
  }, [user, projectSupplier.project_id]);

  return (
    <div className="space-y-6">
      {/* 统计指标区域 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">合同金额</p>
          <p className="text-lg font-bold text-blue-600">¥{(projectSupplier.contract_amount || 0).toLocaleString()}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">已支付金额</p>
          <p className="text-lg font-bold text-green-600">¥{paymentStats.totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">未支付金额</p>
          <p className="text-lg font-bold text-orange-600">¥{paymentStats.remaining.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">未支付比例</p>
          <p className="text-lg font-bold text-purple-600">{paymentStats.remainingPercentage.toFixed(1)}%</p>
        </div>
        <div className={`${acceptanceStatus.config.color} p-4 rounded-lg text-center`}>
          <p className="text-sm text-gray-600 mb-1">验收状态</p>
          <p className={`text-lg font-bold ${acceptanceStatus.config.textColor}`}>
            {acceptanceStatus.config.label}
          </p>
          {acceptanceStatus.count > 0 && (
            <p className="text-xs text-gray-500 mt-1">{acceptanceStatus.count} 条记录</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500 mb-2">供应商名称</h4>
          <p className="text-lg font-semibold text-gray-900">{projectSupplier.supplier?.name}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500 mb-2">联系人</h4>
          <p className="text-lg font-semibold text-gray-900">{projectSupplier.supplier?.contact_person || '-'}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500 mb-2">联系电话</h4>
          <p className="text-lg font-semibold text-gray-900">{projectSupplier.supplier?.phone || '-'}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500 mb-2">合同金额</h4>
          <p className="text-lg font-semibold text-indigo-600">¥{projectSupplier.contract_amount?.toLocaleString()}</p>
        </div>
      </div>

      {/* 负责模块 - 可编辑 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium text-gray-500">负责模块</h4>
          {canEdit && !isEditingModules && (
            <button
              onClick={() => setIsEditingModules(true)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              调整
            </button>
          )}
        </div>
        
        {isEditingModules ? (
          <div className="space-y-3">
            <ModuleTreeSelect
              modules={projectModules}
              selectedIds={selectedModules}
              onChange={setSelectedModules}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveModules}
                disabled={loading}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => {
                  setIsEditingModules(false);
                  setSelectedModules(projectSupplier.module_ids || []);
                }}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-900">{getModuleNames(projectSupplier.module_ids || [])}</p>
        )}
      </div>

      {projectSupplier.contract_file_url && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500 mb-2">合同文件</h4>
          <a
            href={projectSupplier.contract_file_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
          >
            <FileText className="h-4 w-4 mr-2" />
            查看合同文件
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </div>
      )}
    </div>
  );
}

// 验收与付款合并标签页
function SupplierAcceptancePaymentTab({ projectSupplier, onUpdate }: {
  projectSupplier: ProjectSupplier;
  onUpdate: () => void;
}) {
  const [acceptances, setAcceptances] = useState<SupplierAcceptance[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<SupplierPaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAcceptanceModal, setShowAddAcceptanceModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SupplierPaymentPlan | null>(null);

  // 统计计算
  const contractAmount = projectSupplier.contract_amount || 0;
  const totalPaid = paymentPlans
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const remaining = contractAmount - totalPaid;
  const remainingPercentage = contractAmount > 0 ? (remaining / contractAmount) * 100 : 0;

  useEffect(() => {
    fetchData();
  }, [projectSupplier.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAcceptances(), fetchPaymentPlans()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAcceptances = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_acceptances')
        .select('*')
        .eq('project_supplier_id', projectSupplier.id)
        .order('acceptance_date', { ascending: false });

      if (error) throw error;
      setAcceptances(data || []);
    } catch (error) {
      console.error('Error fetching acceptances:', error);
    }
  };

  const fetchPaymentPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_payment_plans')
        .select('*')
        .eq('project_supplier_id', projectSupplier.id)
        .order('planned_date', { ascending: true });

      if (error) throw error;
      setPaymentPlans(data || []);
    } catch (error) {
      console.error('Error fetching payment plans:', error);
    }
  };

  const handleAddAcceptance = async (type: 'initial' | 'final' | 'phase', date: string) => {
    try {
      const { error } = await supabase
        .from('supplier_acceptances')
        .insert({
          project_supplier_id: projectSupplier.id,
          acceptance_type: type,
          acceptance_date: date,
          result: 'pass',
          description: '',
          attachments: [],
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
      
      await fetchAcceptances();
      onUpdate();
      setShowAddAcceptanceModal(false);
    } catch (error) {
      console.error('Error adding acceptance:', error);
      alert('新增验收记录失败');
    }
  };

  const handleDeleteAcceptance = async (id: string) => {
    if (!confirm('确定要删除这条验收记录吗？')) return;

    try {
      const { error } = await supabase
        .from('supplier_acceptances')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchAcceptances();
      onUpdate();
    } catch (error) {
      console.error('Error deleting acceptance:', error);
      alert('删除验收记录失败');
    }
  };

  const handleConfirmPayment = async (plan: SupplierPaymentPlan, actualDate: string, voucherFile?: File) => {
    try {
      let voucherUrl = '';
      
      if (voucherFile) {
        const fileExt = voucherFile.name.split('.').pop();
        const fileName = `${plan.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-vouchers')
          .upload(fileName, voucherFile);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('payment-vouchers')
          .getPublicUrl(fileName);
        
        voucherUrl = publicUrl;
      }

      const { error } = await supabase
        .from('supplier_payment_plans')
        .update({
          status: 'paid',
          actual_payment_date: actualDate,
          voucher_url: voucherUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', plan.id);

      if (error) throw error;

      await fetchPaymentPlans();
      onUpdate();
      setShowConfirmModal(false);
      setSelectedPlan(null);
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('确认付款失败');
    }
  };

  const handleRevokePayment = async (plan: SupplierPaymentPlan) => {
    if (!confirm('确定要撤回此付款记录吗？')) return;

    try {
      const { error } = await supabase
        .from('supplier_payment_plans')
        .update({
          status: 'pending',
          actual_payment_date: null,
          voucher_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', plan.id);

      if (error) throw error;

      await fetchPaymentPlans();
      onUpdate();
    } catch (error) {
      console.error('Error revoking payment:', error);
      alert('撤回付款失败');
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片区域 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">合同金额</p>
          <p className="text-xl font-bold text-blue-600">¥{contractAmount.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">已支付金额</p>
          <p className="text-xl font-bold text-green-600">¥{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">未支付金额</p>
          <p className="text-xl font-bold text-orange-600">¥{remaining.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">未支付比例</p>
          <p className="text-xl font-bold text-purple-600">{remainingPercentage.toFixed(1)}%</p>
        </div>
      </div>

      {/* 左右分栏 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 左侧：验收记录 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-medium text-gray-900">验收记录</h4>
            <button 
              onClick={() => setShowAddAcceptanceModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增验收
            </button>
          </div>

          {acceptances.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">暂无验收记录</div>
          ) : (
            <div className="space-y-3">
              {acceptances.map((acceptance) => {
                const typeConfig = ACCEPTANCE_TYPE_CONFIG[acceptance.acceptance_type];
                const TypeIcon = typeConfig.icon;
                
                return (
                  <div key={acceptance.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${typeConfig.color}`}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeConfig.color}`}>
                              {typeConfig.label}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              acceptance.result === 'pass'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {acceptance.result === 'pass' ? '通过' : '不通过'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(acceptance.acceptance_date).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAcceptance(acceptance.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 右侧：付款管理 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-medium text-gray-900">付款管理</h4>
            <button 
              onClick={() => setShowAddPaymentModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              新增付款计划
            </button>
          </div>

          {paymentPlans.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">暂无付款计划</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">序号</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentPlans.map((plan, index) => (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(plan.planned_date).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        ¥{plan.amount?.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          plan.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {plan.status === 'paid' ? '已付款' : '待付款'}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                        {plan.status === 'pending' ? (
                          <button
                            onClick={() => {
                              setSelectedPlan(plan);
                              setShowConfirmModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            确认付款
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRevokePayment(plan)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            撤回
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 新增验收弹窗 */}
      {showAddAcceptanceModal && (
        <AddAcceptanceModal
          onClose={() => setShowAddAcceptanceModal(false)}
          onConfirm={handleAddAcceptance}
        />
      )}

      {/* 新增付款计划弹窗 */}
      {showAddPaymentModal && (
        <AddPaymentPlanModal
          projectSupplierId={projectSupplier.id}
          contractAmount={contractAmount}
          onClose={() => setShowAddPaymentModal(false)}
          onSuccess={() => {
            fetchPaymentPlans();
            onUpdate();
            setShowAddPaymentModal(false);
          }}
        />
      )}

      {/* 确认付款弹窗 */}
      {showConfirmModal && selectedPlan && (
        <ConfirmPaymentModal
          plan={selectedPlan}
          onClose={() => {
            setShowConfirmModal(false);
            setSelectedPlan(null);
          }}
          onConfirm={handleConfirmPayment}
        />
      )}
    </div>
  );
}

// 新增验收弹窗
function AddAcceptanceModal({ 
  onClose, 
  onConfirm 
}: { 
  onClose: () => void;
  onConfirm: (type: 'initial' | 'final' | 'phase', date: string) => void;
}) {
  const [selectedType, setSelectedType] = useState<'initial' | 'final' | 'phase'>('initial');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = () => {
    onConfirm(selectedType, selectedDate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">新增验收</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 验收类型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择验收类型 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {(['initial', 'final', 'phase'] as const).map((type) => {
                const config = ACCEPTANCE_TYPE_CONFIG[type];
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                      selectedType === type
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-gray-900">{config.label}</span>
                    {selectedType === type && (
                      <CheckCircle className="h-5 w-5 text-indigo-600 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 验收日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              验收日期 <span className="text-red-500">*</span>
            </label>
            <DatePicker
              value={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              placeholder="选择验收日期"
              className="w-full"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

// 新增付款计划弹窗
function AddPaymentPlanModal({ 
  projectSupplierId, 
  contractAmount, 
  onClose, 
  onSuccess 
}: { 
  projectSupplierId: string;
  contractAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [plans, setPlans] = useState<Array<{
    id: string;
    planned_date: string;
    percentage: number;
    amount: number;
    reason: string;
  }>>([{
    id: Date.now().toString(),
    planned_date: '',
    percentage: 0,
    amount: 0,
    reason: ''
  }]);

  const handleAddPlan = () => {
    setPlans([...plans, {
      id: Date.now().toString(),
      planned_date: '',
      percentage: 0,
      amount: 0,
      reason: ''
    }]);
  };

  const handleRemovePlan = (id: string) => {
    if (plans.length > 1) {
      setPlans(plans.filter(p => p.id !== id));
    }
  };

  const handlePlanChange = (id: string, field: string, value: string | number) => {
    setPlans(plans.map(plan => {
      if (plan.id !== id) return plan;
      
      const updated = { ...plan, [field]: value };
      
      if (field === 'percentage') {
        updated.amount = Math.round(contractAmount * (Number(value) / 100));
      }
      
      return updated;
    }));
  };

  const handleSubmit = async () => {
    for (const plan of plans) {
      if (!plan.planned_date || plan.percentage <= 0 || !plan.reason) {
        alert('请填写所有必填字段');
        return;
      }
    }

    try {
      const paymentPlans = plans.map(plan => ({
        project_supplier_id: projectSupplierId,
        planned_date: plan.planned_date,
        amount: plan.amount,
        percentage: plan.percentage,
        reason: plan.reason,
        status: 'pending'
      }));

      const { error } = await supabase
        .from('supplier_payment_plans')
        .insert(paymentPlans);

      if (error) throw error;
      onSuccess();
    } catch (error) {
      console.error('Error creating payment plans:', error);
      alert('创建付款计划失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">新增付款计划</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              合同金额: <span className="font-bold">¥{contractAmount.toLocaleString()}</span>
            </p>
          </div>

          {plans.map((plan, index) => (
            <div key={plan.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-900">付款计划 {index + 1}</h4>
                {plans.length > 1 && (
                  <button
                    onClick={() => handleRemovePlan(plan.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    删除
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    付款时间 <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={plan.planned_date}
                    onChange={(date) => handlePlanChange(plan.id, 'planned_date', date)}
                    placeholder="选择付款时间"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    付款比例 (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={plan.percentage}
                    onChange={(e) => handlePlanChange(plan.id, 'percentage', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    付款金额 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={plan.amount}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">根据比例自动计算</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    付款事由 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={plan.reason}
                    onChange={(e) => handlePlanChange(plan.id, 'reason', e.target.value)}
                    placeholder="如：首付款、二期款等"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleAddPlan}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
          >
            + 添加更多付款计划
          </button>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

// 确认付款弹窗
function ConfirmPaymentModal({ 
  plan, 
  onClose, 
  onConfirm 
}: { 
  plan: SupplierPaymentPlan;
  onClose: () => void;
  onConfirm: (plan: SupplierPaymentPlan, actualDate: string, voucherFile?: File) => void;
}) {
  const [actualDate, setActualDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherFile, setVoucherFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVoucherFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">确认付款</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p className="text-sm text-gray-600">
              计划付款金额: <span className="font-bold text-gray-900">¥{plan.amount?.toLocaleString()}</span>
            </p>
            <p className="text-sm text-gray-600">
              计划付款时间: <span className="font-bold text-gray-900">{new Date(plan.planned_date).toLocaleDateString('zh-CN')}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              实际付款时间 <span className="text-red-500">*</span>
            </label>
            <DatePicker
              value={actualDate}
              onChange={(date) => setActualDate(date)}
              placeholder="选择实际付款时间"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              付款凭证
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-500 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                    <span>上传文件</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">或拖拽到此处</p>
                </div>
                <p className="text-xs text-gray-500">支持图片、PDF格式</p>
                {voucherFile && (
                  <p className="text-sm text-indigo-600">已选择: {voucherFile.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(plan, actualDate, voucherFile || undefined)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            确认付款
          </button>
        </div>
      </div>
    </div>
  );
}
