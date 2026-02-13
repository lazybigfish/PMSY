import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Edit2, Trash2, Eye, X, User, Phone, Mail, MapPin, Building2, Sparkles, TrendingUp, FolderOpen, CheckCircle } from 'lucide-react';

import { Supplier } from '../../types';
import { formatAmount } from '../../lib/utils';

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier>>({});
  const [isEditing, setIsEditing] = useState(false);
  
  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  interface SupplierProjectDetail {
    projectName: string;
    amount: number;
    acceptanceStatus: string;
  }

  const [detailData, setDetailData] = useState<{
    totalProjects: number;
    totalAmount: number;
    projects: SupplierProjectDetail[];
  }>({ totalProjects: 0, totalAmount: 0, projects: [] });
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个供应商吗？')) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuppliers(suppliers.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('删除失败');
    }
  };

  const openDetailModal = async (supplier: Supplier) => {
    setCurrentSupplier(supplier);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('project_suppliers')
        .select(`
            contract_amount,
            project:projects (name),
            acceptances:supplier_acceptances (result)
        `)
        .eq('supplier_id', supplier.id);

      if (error) throw error;

      const projects = data || [];
      const totalProjects = projects.length;
      const totalAmount = projects.reduce((sum, p) => sum + (p.contract_amount || 0), 0);
      
      setDetailData({
        totalProjects,
        totalAmount,
        projects: projects.map(p => {
            const projectName = Array.isArray(p.project) ? p.project[0]?.name : (p.project as { name?: string })?.name;
            return {
                projectName: projectName || '未知项目',
                amount: p.contract_amount || 0,
                acceptanceStatus: p.acceptances?.length > 0
                    ? `${p.acceptances.filter((a: { result: string }) => a.result === 'pass').length} 通过 / ${p.acceptances.length} 总计`
                    : '暂无验收'
            };
        })
      });

    } catch (error) {
      console.error('Error fetching details:', error);
      alert('获取详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supplierData = {
        name: currentSupplier.name,
        contact_person: currentSupplier.contact_person,
        phone: currentSupplier.phone,
        email: currentSupplier.email,
        address: currentSupplier.address,
        description: currentSupplier.description,
        status: currentSupplier.status || 'active'
      };

      if (isEditing && currentSupplier.id) {
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', currentSupplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert([supplierData]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      fetchSuppliers();
      setCurrentSupplier({});
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('保存失败');
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentSupplier({ status: 'active' });
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setIsEditing(true);
    setCurrentSupplier(supplier);
    setIsModalOpen(true);
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 w-16 h-16 rounded-2xl gradient-primary blur-xl opacity-50 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">供应商库</h1>
          <p className="page-subtitle">管理供应商信息、跟踪合作情况</p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary shadow-glow"
        >
          <Plus className="w-5 h-5" />
          新增供应商
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
          <input
            type="text"
            placeholder="搜索供应商名称或联系人..."
            className="input pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      {filteredSuppliers.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-dark-100 flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-10 w-10 text-dark-400" />
          </div>
          <h3 className="text-lg font-medium text-dark-900 mb-2">暂无供应商</h3>
          <p className="text-dark-500">点击上方按钮添加第一个供应商</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <div 
              key={supplier.id} 
              className="card card-hover group cursor-pointer"
              onClick={() => openDetailModal(supplier)}
            >
              {/* Card Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-xl bg-sun-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Building2 className="h-6 w-6 text-sun-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-bold text-dark-900 line-clamp-1" title={supplier.name}>{supplier.name}</h3>
                      <span className={`badge mt-2 ${supplier.status === 'active' ? 'badge-mint' : 'badge-dark'}`}>
                        {supplier.status === 'active' ? '合作中' : '已终止'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Contact Info */}
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-dark-600">
                    <div className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center mr-3">
                      <User className="w-4 h-4 text-dark-500" />
                    </div>
                    <span className="truncate">{supplier.contact_person || '未填写联系人'}</span>
                  </div>
                  <div className="flex items-center text-sm text-dark-600">
                    <div className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center mr-3">
                      <Phone className="w-4 h-4 text-dark-500" />
                    </div>
                    <span className="truncate">{supplier.phone || '未填写电话'}</span>
                  </div>
                  {supplier.email && (
                    <div className="flex items-center text-sm text-dark-600">
                      <div className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center mr-3">
                        <Mail className="w-4 h-4 text-dark-500" />
                      </div>
                      <span className="truncate" title={supplier.email}>{supplier.email}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center text-sm text-dark-600">
                      <div className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center mr-3">
                        <MapPin className="w-4 h-4 text-dark-500" />
                      </div>
                      <span className="truncate" title={supplier.address}>{supplier.address}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {supplier.description && (
                  <div className="mt-4 pt-4 border-t border-dark-100">
                    <p className="text-sm text-dark-500 line-clamp-2 bg-dark-50 rounded-lg px-3 py-2">
                      {supplier.description}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Card Actions */}
              <div className="border-t border-dark-100 p-4 bg-dark-50/50 rounded-b-2xl flex justify-end space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openDetailModal(supplier);
                  }}
                  className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                  title="详情"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(supplier);
                  }}
                  className="p-2 text-dark-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors"
                  title="编辑"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(supplier.id);
                  }}
                  className="p-2 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-dark-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-dark-900">
                {isEditing ? '编辑供应商' : '新增供应商'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-dark-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-dark-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">供应商名称 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="input"
                  value={currentSupplier.name || ''}
                  onChange={e => setCurrentSupplier({...currentSupplier, name: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">联系人</label>
                  <input
                    type="text"
                    className="input"
                    value={currentSupplier.contact_person || ''}
                    onChange={e => setCurrentSupplier({...currentSupplier, contact_person: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">联系电话</label>
                  <input
                    type="text"
                    className="input"
                    value={currentSupplier.phone || ''}
                    onChange={e => setCurrentSupplier({...currentSupplier, phone: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">电子邮箱</label>
                <input
                  type="email"
                  className="input"
                  value={currentSupplier.email || ''}
                  onChange={e => setCurrentSupplier({...currentSupplier, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">地址</label>
                <input
                  type="text"
                  className="input"
                  value={currentSupplier.address || ''}
                  onChange={e => setCurrentSupplier({...currentSupplier, address: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">描述/备注</label>
                <textarea
                  className="input"
                  rows={3}
                  value={currentSupplier.description || ''}
                  onChange={e => setCurrentSupplier({...currentSupplier, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">状态</label>
                <select
                  className="input"
                  value={currentSupplier.status || 'active'}
                  onChange={e => setCurrentSupplier({...currentSupplier, status: e.target.value as 'active' | 'inactive'})}
                >
                  <option value="active">合作中</option>
                  <option value="inactive">已终止</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-ghost"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 bg-dark-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="px-6 py-5 border-b border-dark-100 flex items-center justify-between bg-gradient-to-r from-sun-50/50 to-transparent rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-sun-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-sun-600" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-dark-900">{currentSupplier.name}</h2>
                  <span className={`badge mt-1 ${currentSupplier.status === 'active' ? 'badge-mint' : 'badge-dark'}`}>
                    {currentSupplier.status === 'active' ? '合作中' : '已终止'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 hover:bg-dark-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-dark-500" />
              </button>
            </div>

            {detailLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-pulse mx-auto">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="stat-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="stat-label">参与项目总数</span>
                      <div className="w-10 h-10 rounded-xl bg-sun-100 flex items-center justify-center">
                        <FolderOpen className="h-5 w-5 text-sun-600" />
                      </div>
                    </div>
                    <div className="stat-value text-sun-600">{detailData.totalProjects} 个</div>
                  </div>
                  <div className="stat-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="stat-label">累计合同金额</span>
                      <div className="w-10 h-10 rounded-xl bg-mint-100 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-mint-600" />
                      </div>
                    </div>
                    <div className="stat-value text-mint-600">{formatAmount(detailData.totalAmount)}</div>
                  </div>
                </div>

                {/* Project List */}
                <div>
                  <h3 className="text-lg font-display font-semibold text-dark-900 mb-4">项目清单</h3>
                  <div className="card overflow-hidden">
                    <table className="min-w-full divide-y divide-dark-100">
                      <thead className="bg-dark-50">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider">项目名称</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider">合同金额</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider">验收情况</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-dark-100">
                        {detailData.projects.map((project, index) => (
                          <tr key={index} className="hover:bg-dark-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-dark-900">
                              {project.projectName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-600 font-mono">
                              {formatAmount(project.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-600">
                              {project.acceptanceStatus}
                            </td>
                          </tr>
                        ))}
                        {detailData.projects.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-dark-500">
                              <div className="flex flex-col items-center">
                                <FolderOpen className="h-10 w-10 text-dark-300 mb-3" />
                                暂无参与项目
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end px-6 pb-6">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
