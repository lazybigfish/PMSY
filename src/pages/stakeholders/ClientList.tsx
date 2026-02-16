import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Plus, Search, Building2, Phone, MapPin, User, Edit2, Trash2, Eye, X, Sparkles, TrendingUp, FolderOpen, Mail } from 'lucide-react';
import { Client, ClientContact } from '../../types';
import { formatAmount } from '../../lib/utils';

interface ClientWithContacts extends Client {
  contacts?: ClientContact[];
}

const ClientList = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientWithContacts[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithContacts | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data: clientsData, error: clientsError } = await api.db
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      if (clientsData && clientsData.length > 0) {
        const clientIds = clientsData.map(c => c.id);
        const { data: contactsData, error: contactsError } = await api.db
          .from('client_contacts')
          .select('*')
          .in('client_id', clientIds);

        if (contactsError) throw contactsError;

        const clientsWithContacts = clientsData.map(client => ({
          ...client,
          contacts: contactsData?.filter(c => c.client_id === client.id) || []
        }));
        setClients(clientsWithContacts);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    inactive: clients.filter(c => c.status === 'inactive').length
  };

  const handleDelete = async (client: ClientWithContacts) => {
    if (client.status === 'active') {
      if (!confirm('确定要终止与该客户的合作吗？')) return;
      try {
        const { error } = await api.db
          .from('clients')
          .update({ status: 'inactive' })
          .eq('id', client.id);
        if (error) throw error;
        fetchClients();
      } catch (error) {
        console.error('Error terminating client:', error);
        alert('操作失败');
      }
    } else {
      if (!confirm('该客户已终止合作，确定要彻底删除吗？此操作不可恢复！')) return;
      try {
        const { error } = await api.db
          .from('clients')
          .delete()
          .eq('id', client.id);
        if (error) throw error;
        fetchClients();
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('删除失败');
      }
    }
  };

  const getPrimaryContact = (client: ClientWithContacts) => {
    if (!client.contacts || client.contacts.length === 0) return null;
    return client.contacts.find(c => c.is_primary) || client.contacts[0];
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
          <h1 className="page-title">客户库</h1>
          <p className="page-subtitle">管理客户信息、查看关联项目</p>
        </div>
        <button onClick={() => navigate('/stakeholders/clients/new')} className="btn-primary shadow-glow">
          <Plus className="h-5 w-5" />
          新增客户
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
              placeholder="搜索客户名称或地点..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-12 w-full"
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

      {filteredClients.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-dark-100 flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-10 w-10 text-dark-400" />
          </div>
          <h3 className="text-lg font-medium text-dark-900 mb-2">
            {searchTerm || statusFilter !== 'all' ? '未找到匹配的客户' : '暂无客户'}
          </h3>
          <p className="text-dark-500">
            {searchTerm || statusFilter !== 'all' ? '尝试其他搜索条件' : '点击上方按钮添加第一个客户'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const primaryContact = getPrimaryContact(client);
            return (
              <div
                key={client.id}
                className="card card-hover cursor-pointer group flex flex-col hover:-translate-y-0.5 hover:shadow-lg hover:border-primary-300 transition-all duration-200 ease-out"
                onClick={() => { setSelectedClient(client); setShowDetailModal(true); }}
              >
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all duration-200 ${
                        client.status === 'active' ? 'bg-primary-100 group-hover:bg-primary-200' : 'bg-dark-100'
                      }`}>
                        <Building2 className={`h-6 w-6 ${client.status === 'active' ? 'text-primary-600' : 'text-dark-400'}`} />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-bold text-dark-900 line-clamp-1 group-hover:text-primary-600 transition-colors duration-200" title={client.name}>{client.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {client.location && (
                            <span className="flex items-center text-sm text-dark-500">
                              <MapPin className="h-3.5 w-3.5 mr-1" />
                              {client.location}
                            </span>
                          )}
                          <span className={`badge ${client.status === 'active' ? 'badge-mint' : 'badge-dark'}`}>
                            {client.status === 'active' ? '合作中' : '已终止'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {client.code && (
                      <span className="px-2 py-1 bg-dark-50 text-dark-500 text-xs rounded-lg font-mono">
                        {client.code}
                      </span>
                    )}
                  </div>

                  {primaryContact && (
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-dark-600">
                        <div className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center mr-3">
                          <User className="h-4 w-4 text-dark-500" />
                        </div>
                        <div>
                          <span className="font-semibold text-dark-900">{primaryContact.name}</span>
                          {primaryContact.position && (
                            <span className="text-dark-400 text-xs ml-2">{primaryContact.position}</span>
                          )}
                          <div className="flex items-center text-dark-400 mt-0.5 text-xs">
                            <Phone className="h-3 w-3 mr-1" />
                            {primaryContact.phone}
                            {primaryContact.email && (
                              <>
                                <span className="mx-1">·</span>
                                <Mail className="h-3 w-3 mr-1" />
                                {primaryContact.email}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {client.contacts && client.contacts.length > 1 && (
                        <div className="text-xs text-dark-400 bg-dark-50 rounded-lg px-3 py-2">
                          还有 {client.contacts.length - 1} 位联系人
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="border-t border-dark-100 p-4 bg-dark-50/50 rounded-b-2xl flex justify-end space-x-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setShowDetailModal(true); }}
                    className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 ease-out hover:scale-105"
                    title="查看详情"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/stakeholders/clients/${client.id}/edit`); }}
                    className="p-2 text-dark-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all duration-200 ease-out hover:scale-105"
                    title="编辑"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(client); }}
                    className="p-2 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 ease-out hover:scale-105"
                    title={client.status === 'active' ? '终止合作' : '彻底删除'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showDetailModal && selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => { setShowDetailModal(false); setSelectedClient(null); }}
        />
      )}
    </div>
  );
};

interface ClientDetailModalProps {
  client: ClientWithContacts;
  onClose: () => void;
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    fetchClientProjects();
  }, [client.id]);

  const fetchClientProjects = async () => {
    try {
      setLoading(true);
      const { data: projectClientsData, error: projectClientsError } = await api.db
        .from('project_clients')
        .select('*')
        .eq('client_id', client.id);

      if (projectClientsError) throw projectClientsError;

      if (projectClientsData && projectClientsData.length > 0) {
        const projectIds = projectClientsData.map(pc => pc.project_id);
        const { data: projectsData, error: projectsError } = await api.db
          .from('projects')
          .select('id, name, status')
          .in('id', projectIds);

        if (projectsError) throw projectsError;

        const projectList = projectClientsData.map(pc => ({
          ...pc,
          project: projectsData?.find(p => p.id === pc.project_id) || null
        }));
        setProjects(projectList);

        const total = projectList.reduce((sum, p) => sum + (p.contract_amount || 0), 0);
        setTotalAmount(total);
      } else {
        setProjects([]);
        setTotalAmount(0);
      }
    } catch (error) {
      console.error('Error fetching client projects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
        <div className="px-6 py-5 border-b border-dark-100 flex items-center justify-between bg-gradient-to-r from-primary-50/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${client.status === 'active' ? 'bg-primary-100' : 'bg-dark-100'}`}>
              <Building2 className={`h-6 w-6 ${client.status === 'active' ? 'text-primary-600' : 'text-dark-400'}`} />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-dark-900">{client.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {client.location && (
                  <span className="text-sm text-dark-500 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />{client.location}
                  </span>
                )}
                <span className={`badge ${client.status === 'active' ? 'badge-mint' : 'badge-dark'}`}>
                  {client.status === 'active' ? '合作中' : '已终止'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dark-100 rounded-xl transition-colors">
            <X className="h-5 w-5 text-dark-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {client.code && (
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-dark-50 text-dark-500 text-sm rounded-lg font-mono">编码: {client.code}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">合同总额</span>
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary-600" />
                </div>
              </div>
              <div className="stat-value text-primary-600">{formatAmount(totalAmount)}</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">项目数量</span>
                <div className="w-10 h-10 rounded-xl bg-mint-100 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-mint-600" />
                </div>
              </div>
              <div className="stat-value text-mint-600">{projects.length}个</div>
            </div>
          </div>

          {client.contacts && client.contacts.length > 0 && (
            <div>
              <h3 className="text-lg font-display font-semibold text-dark-900 mb-4">联系人</h3>
              <div className="space-y-3">
                {client.contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-4 bg-dark-50 rounded-xl">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold shadow-glow">
                        {contact.name[0]}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-bold text-dark-900">
                          {contact.name}
                          {contact.is_primary && <span className="ml-2 badge badge-primary">主要</span>}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-dark-500 mt-0.5">
                          {contact.position && <span>{contact.position}</span>}
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>
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
            <h3 className="text-lg font-display font-semibold text-dark-900 mb-4">关联项目</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-pulse mx-auto">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 bg-dark-50 rounded-xl">
                <FolderOpen className="h-10 w-10 text-dark-300 mx-auto mb-3" />
                <p className="text-dark-500">暂无关联项目</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-dark-50 rounded-xl hover:bg-dark-100 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-dark-900">{item.project?.name}</p>
                      <p className="text-xs text-dark-500 mt-1">合同金额: {formatAmount(item.contract_amount || 0)}</p>
                    </div>
                    <a href={`/projects/${item.project?.id}`} className="text-sm font-semibold text-primary-600 hover:text-primary-700" onClick={(e) => { e.preventDefault(); window.location.href = `/projects/${item.project?.id}`; }}>
                      查看
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientList;
