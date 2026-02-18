import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Plus, Search, Edit2, Trash2, Eye, X, User, Phone, Mail, MapPin, Building2, Sparkles, TrendingUp, FolderOpen } from 'lucide-react';
import { Supplier } from '../../types';
import { formatAmount } from '../../lib/utils';

interface SupplierContact {
  id?: string;
  supplier_id?: string;
  name: string;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  is_primary?: boolean;
}

interface SupplierWithContacts extends Supplier {
  contacts?: SupplierContact[];
}

export default function SupplierList() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<SupplierWithContacts[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Partial<SupplierWithContacts>>({});
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
      setLoading(true);
      const { data: suppliersData, error: suppliersError } = await api.db
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (suppliersError) throw suppliersError;

      if (suppliersData && suppliersData.length > 0) {
        const supplierIds = suppliersData.map(s => s.id);
        const { data: contactsData, error: contactsError } = await api.db
          .from('supplier_contacts')
          .select('*')
          .in('supplier_id', supplierIds);

        if (contactsError && !contactsError.message?.includes('does not exist')) {
          console.warn('Could not fetch supplier contacts:', contactsError);
        }

        const suppliersWithContacts = suppliersData.map(supplier => ({
          ...supplier,
          contacts: contactsData?.filter(c => c.supplier_id === supplier.id) || []
        }));
        setSuppliers(suppliersWithContacts);
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (supplier: SupplierWithContacts) => {
    if (supplier.status === 'active') {
      if (!confirm('确定要终止与该供应商的合作吗？')) return;
      try {
        const { error } = await api.db
          .from('suppliers')
          .update({ status: 'inactive' })
          .eq('id', supplier.id);
        if (error) throw error;
        fetchSuppliers();
      } catch (error) {
        console.error('Error terminating supplier:', error);
        alert('操作失败');
      }
    } else {
      if (!confirm('该供应商已终止合作，确定要彻底删除吗？此操作不可恢复！')) return;
      try {
        const { error } = await api.db
          .from('suppliers')
          .delete()
          .eq('id', supplier.id);
        if (error) throw error;
        fetchSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
        alert('删除失败');
      }
    }
  };

  const openDetailModal = async (supplier: SupplierWithContacts) => {
    setCurrentSupplier(supplier);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    
    try {
      const { data: projectSuppliersData, error: psError } = await api.db
        .from('project_suppliers')
        .select('id, project_id, contract_amount')
        .eq('supplier_id', supplier.id);

      if (psError) throw psError;

      if (projectSuppliersData && projectSuppliersData.length > 0) {
        const projectIds = projectSuppliersData.map(ps => ps.project_id);
        const projectSupplierIds = projectSuppliersData.map(ps => ps.id);

        const [projectsResult, acceptancesResult] = await Promise.all([
          api.db.from('projects').select('id, name, status').in('id', projectIds),
          api.db.from('supplier_acceptances').select('project_supplier_id, status').in('project_supplier_id', projectSupplierIds)
        ]);

        if (projectsResult.error) throw projectsResult.error;
        if (acceptancesResult.error) throw acceptancesResult.error;

        const projectsMap = new Map((projectsResult.data || []).map(p => [p.id, p]));
        const acceptancesMap = new Map<string, { status: string }[]>();
        (acceptancesResult.data || []).forEach(a => {
          if (!acceptancesMap.has(a.project_supplier_id)) {
            acceptancesMap.set(a.project_supplier_id, []);
          }
          acceptancesMap.get(a.project_supplier_id)!.push({ status: a.status });
        });

        const projects = projectSuppliersData.map(ps => ({
          contract_amount: ps.contract_amount,
          project: projectsMap.get(ps.project_id) || null,
          acceptances: acceptancesMap.get(ps.id) || []
        }));

        const totalProjects = projects.length;
        const totalAmount = projects.reduce((sum, p) => sum + (p.contract_amount || 0), 0);
        
        setDetailData({
          totalProjects,
          totalAmount,
          projects: projects.map(p => ({
              projectName: p.project?.name || '未知项目',
              amount: p.contract_amount || 0,
              acceptanceStatus: p.acceptances?.length > 0
                  ? `${p.acceptances.filter((a: { status: string }) => a.status === 'passed').length} 通过 / ${p.acceptances.length} 总计`
                  : '暂无验收'
          }))
        });
      } else {
        setDetailData({ totalProjects: 0, totalAmount: 0, projects: [] });
      }
    } catch (error) {
      console.error('Error fetching details:', error);
      alert('获取详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'active').length,
    inactive: suppliers.filter(s => s.status === 'inactive').length
  };

  const getPrimaryContact = (supplier: SupplierWithContacts) => {
    if (!supplier.contacts || supplier.contacts.length === 0) {
      return supplier.contact_person ? { name: supplier.contact_person, phone: supplier.phone, email: supplier.email } : null;
    }
    return supplier.contacts.find(c => c.is_primary) || supplier.contacts[0];
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">供应商库</h1>
          <p className="page-subtitle">管理供应商信息、跟踪合作情况</p>
        </div>
        <button onClick={() => navigate('/stakeholders/suppliers/new')} className="btn-primary shadow-glow">
          <Plus className="w-5 h-5" />
          新增供应商
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-dark-900">{stats.total}</div>
          <div className="text-sm text-dark-500">总数</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-mint-600">{stats.active}</div>
          <div className="text-sm text-dark-500">合作中</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-dark-400">{stats.inactive}</div>
          <div className="text-sm text-dark-500">已终止</div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
            <input
              type="text"
              placeholder="搜索供应商名称、联系人或电话..."
              className="input pl-12 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status
                    ? status === 'active' ? 'bg-mint-100 text-mint-700' 
                      : status === 'inactive' ? 'bg-dark-100 text-dark-600'
                      : 'bg-primary-100 text-primary-700'
                    : 'bg-dark-50 text-dark-500 hover:bg-dark-100'
                }`}
              >
                {status === 'all' ? '全部' : status === 'active' ? '合作中' : '已终止'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-dark-100 flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-10 w-10 text-dark-400" />
          </div>
          <h3 className="text-lg font-medium text-dark-900 mb-2">
            {searchTerm || statusFilter !== 'all' ? '未找到匹配的供应商' : '暂无供应商'}
          </h3>
          <p className="text-dark-500">
            {searchTerm || statusFilter !== 'all' ? '尝试其他搜索条件' : '点击上方按钮添加第一个供应商'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => {
            const primaryContact = getPrimaryContact(supplier);
            return (
              <div 
                key={supplier.id} 
                className="card card-hover group cursor-pointer"
                onClick={() => openDetailModal(supplier)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                        supplier.status === 'active' ? 'bg-sun-100' : 'bg-dark-100'
                      }`}>
                        <Building2 className={`h-6 w-6 ${supplier.status === 'active' ? 'text-sun-600' : 'text-dark-400'}`} />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-bold text-dark-900 line-clamp-1" title={supplier.name}>{supplier.name}</h3>
                        <span className={`badge mt-2 ${supplier.status === 'active' ? 'badge-mint' : 'badge-dark'}`}>
                          {supplier.status === 'active' ? '合作中' : '已终止'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {primaryContact && (
                      <>
                        <div className="flex items-center text-sm text-dark-600">
                          <div className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-dark-500" />
                          </div>
                          <span className="truncate">{primaryContact.name || '未填写联系人'}</span>
                        </div>
                        <div className="flex items-center text-sm text-dark-600">
                          <div className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center mr-3">
                            <Phone className="w-4 h-4 text-dark-500" />
                          </div>
                          <span className="truncate">{primaryContact.phone || '未填写电话'}</span>
                        </div>
                        {primaryContact.email && (
                          <div className="flex items-center text-sm text-dark-600">
                            <div className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center mr-3">
                              <Mail className="w-4 h-4 text-dark-500" />
                            </div>
                            <span className="truncate" title={primaryContact.email}>{primaryContact.email}</span>
                          </div>
                        )}
                      </>
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

                  {supplier.contacts && supplier.contacts.length > 1 && (
                    <div className="mt-3 text-xs text-dark-400 bg-dark-50 rounded-lg px-3 py-2">
                      还有 {supplier.contacts.length - 1} 位联系人
                    </div>
                  )}

                  {supplier.description && (
                    <div className="mt-4 pt-4 border-t border-dark-100">
                      <p className="text-sm text-dark-500 line-clamp-2 bg-dark-50 rounded-lg px-3 py-2">
                        {supplier.description}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-dark-100 p-4 bg-dark-50/50 rounded-b-2xl flex justify-end space-x-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openDetailModal(supplier); }}
                    className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                    title="详情"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/stakeholders/suppliers/${supplier.id}/edit`); }}
                    className="p-2 text-dark-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors"
                    title="编辑"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(supplier); }}
                    className="p-2 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title={supplier.status === 'active' ? '终止合作' : '彻底删除'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isDetailModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-[100] animate-fade-in"
          style={{
            background: `radial-gradient(circle at center,
              rgba(0,0,0,0.5) 0%,
              rgba(0,0,0,0.35) 15%,
              rgba(0,0,0,0.2) 30%,
              rgba(0,0,0,0.05) 50%,
              transparent 70%
            )`,
          }}
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-dark-100 flex items-center justify-between bg-gradient-to-r from-sun-50/50 to-transparent rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${currentSupplier.status === 'active' ? 'bg-sun-100' : 'bg-dark-100'}`}>
                  <Building2 className={`h-6 w-6 ${currentSupplier.status === 'active' ? 'text-sun-600' : 'text-dark-400'}`} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-dark-900">{currentSupplier.name}</h2>
                  <span className={`badge mt-1 ${currentSupplier.status === 'active' ? 'badge-mint' : 'badge-dark'}`}>
                    {currentSupplier.status === 'active' ? '合作中' : '已终止'}
                  </span>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-dark-100 rounded-xl transition-colors">
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

                {currentSupplier.contacts && currentSupplier.contacts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-display font-semibold text-dark-900 mb-4">联系人</h3>
                    <div className="space-y-3">
                      {currentSupplier.contacts.map((contact) => (
                        <div key={contact.id || contact.name} className="flex items-center justify-between p-4 bg-dark-50 rounded-xl">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold shadow-glow">
                              {contact.name?.[0] || '?'}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-bold text-dark-900">
                                {contact.name}
                                {contact.is_primary && <span className="ml-2 badge badge-primary">主要</span>}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-dark-500 mt-0.5">
                                {contact.position && <span>{contact.position}</span>}
                                {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>}
                                {contact.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contact.email}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-display font-semibold text-dark-900 mb-4">项目清单</h3>
                  <div className="card overflow-hidden">
                    <table className="min-w-full divide-y divide-dark-100">
                      <thead className="bg-dark-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider">项目名称</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider">合同金额</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider">验收情况</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-dark-100">
                        {detailData.projects.map((project, index) => (
                          <tr key={index} className="hover:bg-dark-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-dark-900">{project.projectName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-600 font-mono">{formatAmount(project.amount)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-600">{project.acceptanceStatus}</td>
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
              <button onClick={() => setIsDetailModalOpen(false)} className="btn-secondary">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
