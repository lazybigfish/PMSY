import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { ProjectSupplier, Supplier, ProjectModule } from '../../../types';
import { Plus, FileText, X, ChevronRight, ChevronDown } from 'lucide-react';
import { FileUploadButton } from '../../../components/FileUploadButton';
import { SupplierDetailModal } from '../components/SupplierDetailModal';
import { ModalForm } from '../../../components/Modal';
import { ProcurementStatsCard } from '../../../components/ProcurementStatsCard';
import { useProjectFinance } from '../../../hooks/useProjectFinance';
import { numberToChinese } from '../../../lib/utils';

// 模块树形选择组件
interface ModuleTreeSelectProps {
  modules: ProjectModule[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function ModuleTreeSelect({ modules, selectedIds, onChange }: ModuleTreeSelectProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // 构建树形结构
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

  // 获取所有子模块ID（递归）
  const getAllChildrenIds = (module: ProjectModule): string[] => {
    const ids: string[] = [module.id];
    if (module.children) {
      module.children.forEach(child => {
        ids.push(...getAllChildrenIds(child));
      });
    }
    return ids;
  };

  // 获取父模块ID（递归）
  const getParentIds = (moduleId: string, allModules: ProjectModule[]): string[] => {
    const parentIds: string[] = [];
    const module = allModules.find(m => m.id === moduleId);
    if (module?.parent_id) {
      parentIds.push(module.parent_id);
      parentIds.push(...getParentIds(module.parent_id, allModules));
    }
    return parentIds;
  };

  // 检查是否所有子模块都被选中
  const areAllChildrenSelected = (module: ProjectModule): boolean => {
    if (!module.children || module.children.length === 0) {
      return selectedIds.includes(module.id);
    }
    return module.children.every(child => areAllChildrenSelected(child));
  };

  // 检查是否有部分子模块被选中
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
      // 取消选择：移除该模块及其所有子模块
      onChange(selectedIds.filter(id => !allIds.includes(id)));
    } else {
      // 选择：添加该模块及其所有子模块
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
            id={`module-${node.id}`}
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
            htmlFor={`module-${node.id}`} 
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
    <div className="border border-gray-300 rounded-md p-3 max-h-60 overflow-y-auto">
      {treeModules.map(node => renderNode(node))}
    </div>
  );
}

interface SuppliersProps {
  projectId: string;
  canEdit?: boolean;
}

export default function Suppliers({ projectId, canEdit = true }: SuppliersProps) {
  const [projectSuppliers, setProjectSuppliers] = useState<ProjectSupplier[]>([]);
  const [projectModules, setProjectModules] = useState<ProjectModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add Modal State
  const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [addForm, setAddForm] = useState({
    contract_amount: 0,
    contract_file_url: ''
  });
  const [contractAmountError, setContractAmountError] = useState<string>('');

  // Detail Modal State
  const [selectedProjectSupplier, setSelectedProjectSupplier] = useState<ProjectSupplier | null>(null);

  // 使用项目财务 Hook
  const { stats, isLoading: statsLoading, refresh: refreshStats, isLowBudget } = useProjectFinance({ projectId });

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Project Suppliers
      const { data: suppliersData, error: suppliersError } = await api.db
        .from('project_suppliers')
        .select('*')
        .eq('project_id', projectId);

      if (suppliersError) throw suppliersError;

      // 获取供应商详细信息
      const supplierIds = (suppliersData || []).map((item: any) => item.supplier_id).filter(Boolean);
      let suppliersMap: Record<string, any> = {};
      if (supplierIds.length > 0) {
        const { data: suppliersInfo } = await api.db
          .from('suppliers')
          .select('*')
          .in('id', supplierIds);
        suppliersMap = (suppliersInfo || []).reduce((acc: any, s: any) => {
          acc[s.id] = s;
          return acc;
        }, {});
      }

      // 获取付款计划信息（通过 supplier_id 和 project_id 关联）
      const supplierProjectPairs = (suppliersData || []).map((item: any) => ({
        supplier_id: item.supplier_id,
        project_id: item.project_id
      }));
      
      // 获取所有付款计划（使用新的字段结构）
      let paymentsMap: Record<string, number> = {};
      if (suppliersData && suppliersData.length > 0) {
        const projectSupplierIds = suppliersData.map((item: any) => item.id);
        const { data: paymentPlansData } = await api.db
          .from('supplier_payment_plans')
          .select('project_supplier_id, amount, status')
          .in('project_supplier_id', projectSupplierIds);
        
        // 按 project_supplier_id 计算已支付金额（status = 'paid'）
        paymentsMap = (paymentPlansData || []).reduce((acc: any, plan: any) => {
          if (plan.status === 'paid') {
            if (!acc[plan.project_supplier_id]) acc[plan.project_supplier_id] = 0;
            acc[plan.project_supplier_id] += Number(plan.amount) || 0;
          }
          return acc;
        }, {});
      }

      // Fetch Project Modules
      const { data: modulesData, error: modulesError } = await api.db
        .from('project_modules')
        .select('*')
        .eq('project_id', projectId);

      if (modulesError) throw modulesError;

      // 创建模块ID到进度的映射
      const moduleProgressMap: Record<string, number> = {};
      (modulesData || []).forEach((module: any) => {
        moduleProgressMap[module.id] = module.progress || 0;
      });

      // 将返回数据中的字段映射为组件期望的格式，并计算供应商进度
      const mappedSuppliersData = (suppliersData || []).map((item: any) => {
        // 计算供应商负责的模块的平均进度
        const moduleIds = item.module_ids || [];
        let avgProgress = 0;
        if (moduleIds.length > 0) {
          const totalProgress = moduleIds.reduce((sum: number, moduleId: string) => {
            return sum + (moduleProgressMap[moduleId] || 0);
          }, 0);
          avgProgress = Math.round(totalProgress / moduleIds.length);
        }

        return {
          ...item,
          supplier: suppliersMap[item.supplier_id] || null,
          paid_amount: paymentsMap[item.id] || 0,
          progress: avgProgress
        };
      });

      setProjectSuppliers(mappedSuppliersData);
      setProjectModules(modulesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSuppliers = async () => {
    try {
      // 获取已关联的供应商ID列表
      const existingIds = projectSuppliers.map(ps => ps.supplier_id).filter(Boolean);

      // 获取所有活跃的供应商
      const { data: allSuppliers, error } = await api.db
        .from('suppliers')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      // 过滤掉已关联的供应商
      const availableSuppliers = (allSuppliers || []).filter(
        (supplier: Supplier) => !existingIds.includes(supplier.id)
      );

      setAvailableSuppliers(availableSuppliers);

      // 如果没有可用供应商，给出提示
      if (availableSuppliers.length === 0 && (allSuppliers || []).length > 0) {
        alert('所有可用供应商已关联到该项目，如需调整请前往已关联供应商详情页修改。');
      }
    } catch (error) {
      console.error('Error fetching available suppliers:', error);
    }
  };

  const handleAddSupplier = async () => {
    if (!selectedSupplierId) return;

    const projectAmount = stats?.projectAmount || 0;
    const remainingAmount = stats?.remainingAmount || 0;

    // 1. Check if contract amount exceeds total project amount
    if (addForm.contract_amount > projectAmount) {
        alert(`合同金额 (¥${addForm.contract_amount.toLocaleString()}) 不能超过项目总金额 (¥${projectAmount.toLocaleString()})。`);
        return;
    }

    // 2. Check if contract amount exceeds remaining amount
    if (addForm.contract_amount > remainingAmount) {
        alert(`合同金额 (¥${addForm.contract_amount.toLocaleString()}) 超出剩余可外采金额 (¥${remainingAmount.toLocaleString()})。\n请调整合同金额或联系项目经理。`);
        return;
    }

    try {
      const { error } = await api.db.from('project_suppliers').insert({
        project_id: projectId,
        supplier_id: selectedSupplierId,
        contract_amount: addForm.contract_amount,
        module_ids: JSON.stringify(selectedModuleIds),
        contract_file_url: addForm.contract_file_url || null
      });

      if (error) throw error;
      setIsAddModalOpen(false);
      fetchData();
      refreshStats(); // 刷新外采统计
      // Reset form
      setSelectedSupplierId('');
      setSelectedModuleIds([]);
      setAddForm({ contract_amount: 0, contract_file_url: '' });
      setContractAmountError('');
    } catch (error: unknown) {
      console.error('Error adding supplier:', error);
      const err = error as Error;
      alert(`添加失败: ${err.message || '未知错误'}`);
    }
  };

  const handleRemoveSupplier = async (id: string) => {
    if (!confirm('确定要移除该供应商吗？这将同时删除相关的验收和付款记录。')) return;
    try {
      const { error } = await api.db.from('project_suppliers').delete().eq('id', id);
      if (error) throw error;
      setProjectSuppliers(prev => prev.filter(p => p.id !== id));
      refreshStats(); // 刷新外采统计
    } catch (error) {
      console.error('Error removing supplier:', error);
      alert('移除失败');
    }
  };

  // 检查是否可以关联供应商
  const canAssociateSupplier = (): { canAdd: boolean; message?: string } => {
    // 1. 检查项目是否有功能模块
    if (projectModules.length === 0) {
      return {
        canAdd: false,
        message: '该项目暂无功能模块，请先创建功能模块后再关联供应商。'
      };
    }

    // 2. 获取所有已关联的模块ID
    const allAssociatedModuleIds = new Set<string>();
    projectSuppliers.forEach(ps => {
      (ps.module_ids || []).forEach((moduleId: string) => {
        allAssociatedModuleIds.add(moduleId);
      });
    });

    // 3. 检查是否所有模块都已关联供应商
    const allModuleIds = projectModules.map(m => m.id);
    const allModulesAssociated = allModuleIds.every(id => allAssociatedModuleIds.has(id));

    if (allModulesAssociated) {
      return {
        canAdd: false,
        message: '所有功能模块已关联供应商，无法继续添加。如需调整，请先移除现有供应商或修改模块分配。'
      };
    }

    return { canAdd: true };
  };

  const openAddModal = () => {
    // 检查是否可以关联供应商
    const checkResult = canAssociateSupplier();
    if (!checkResult.canAdd) {
      alert(checkResult.message);
      return;
    }

    fetchAvailableSuppliers();
    setIsAddModalOpen(true);
  };

  const getModuleNames = (ids: string[]) => {
    if (!ids || ids.length === 0) return '-';
    return ids.map(id => projectModules.find(m => m.id === id)?.name).filter(Boolean).join(', ');
  };

  // 合同金额变更时实时校验
  const handleContractAmountChange = (value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setAddForm({ ...addForm, contract_amount: numValue });
    
    const remainingAmount = stats?.remainingAmount || 0;
    if (numValue > remainingAmount) {
      setContractAmountError(`合同金额超出剩余可外采金额 ¥${remainingAmount.toLocaleString('zh-CN')}`);
    } else {
      setContractAmountError('');
    }
  };

  return (
    <div className="space-y-6">
      {/* 外采统计卡片 */}
      <ProcurementStatsCard stats={stats} isLoading={statsLoading} />

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">供应商列表</h2>
        {canEdit && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 h-[38px] whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-1" />
            关联供应商
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">序号</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">供应商名称</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">负责模块</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">合同金额</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">已支付金额</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">建设进度</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projectSuppliers.map((ps, index) => (
                <tr key={ps.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                        onClick={() => setSelectedProjectSupplier(ps)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                        {ps.supplier?.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={getModuleNames(ps.module_ids || [])}>
                    {getModuleNames(ps.module_ids || [])}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ¥{ps.contract_amount?.toLocaleString()}
                    </div>
                    <div className="text-xs text-indigo-600 mt-0.5">
                      {numberToChinese(ps.contract_amount || 0)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ¥{(ps.paid_amount || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-indigo-600 mt-0.5">
                      {numberToChinese(ps.paid_amount || 0)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <span className="text-sm text-gray-900 mr-2">{ps.progress || 0}%</span>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${ps.progress || 0}%` }}></div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        onClick={() => setSelectedProjectSupplier(ps)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                        详情
                    </button>
                    <button 
                        onClick={() => handleRemoveSupplier(ps.id)}
                        className="text-red-600 hover:text-red-900"
                    >
                        移除
                    </button>
                  </td>
                </tr>
              ))}
              {projectSuppliers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    暂无关联供应商
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <ModalForm
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setContractAmountError('');
        }}
        onSubmit={(e) => {
          e.preventDefault();
          handleAddSupplier();
        }}
        title="关联新供应商"
        maxWidth="lg"
        submitDisabled={!!contractAmountError || !selectedSupplierId}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700">选择供应商</label>
            <select
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
            >
              <option value="">请选择...</option>
              {availableSuppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">负责功能模块</label>
            <ModuleTreeSelect
              modules={projectModules}
              selectedIds={selectedModuleIds}
              onChange={setSelectedModuleIds}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              合同金额
              {stats && (
                <span className="ml-2 text-xs text-gray-500">
                  (剩余可外采: ¥{stats.remainingAmount.toLocaleString('zh-CN')})
                </span>
              )}
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">¥</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                className={`focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm rounded-md ${
                  contractAmountError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                value={addForm.contract_amount === 0 ? '' : addForm.contract_amount}
                onFocus={(e) => {
                  if (addForm.contract_amount === 0) {
                    e.target.select();
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  // 只允许数字和小数点
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    handleContractAmountChange(value);
                  }
                }}
              />
            </div>
            {contractAmountError && (
              <p className="mt-1 text-xs text-red-600">
                {contractAmountError}
              </p>
            )}
            {addForm.contract_amount > 0 && !contractAmountError && (
              <p className="mt-1 text-xs text-indigo-600">
                大写：{numberToChinese(addForm.contract_amount)}
              </p>
            )}
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700">合同文件</label>
              <div className="mt-1 flex items-center gap-2">
                {addForm.contract_file_url ? (
                  <div className="flex-1 flex items-center gap-2 p-2 bg-gray-50 rounded border">
                    <FileText size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600 truncate flex-1">
                      {addForm.contract_file_url.split('/').pop()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAddForm({...addForm, contract_file_url: ''})}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <FileUploadButton
                    onUploadComplete={(files) => {
                      if (files.length > 0) {
                        setAddForm({...addForm, contract_file_url: files[0].url || ''});
                      }
                    }}
                    onUploadError={(error) => alert(error)}
                    buttonText="上传合同"
                    multiple={false}
                    context={{ projectId, moduleType: 'supplier_contract' }}
                  />
                )}
              </div>
              {addForm.contract_file_url && (
                <a 
                  href={addForm.contract_file_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
                >
                  查看文件
                </a>
              )}
          </div>
        </div>
      </ModalForm>

      {selectedProjectSupplier && (
         <SupplierDetailModal
            projectSupplier={selectedProjectSupplier}
            projectModules={projectModules}
            onClose={() => setSelectedProjectSupplier(null)}
            onUpdate={() => {
                fetchData();
                refreshStats(); // 刷新外采统计
            }}
         />
      )}
    </div>
  );
}
