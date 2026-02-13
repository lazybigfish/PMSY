import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Search, Building2, Phone, MapPin, User, Edit2, Trash2, Eye, X, Sparkles, TrendingUp, FolderOpen } from 'lucide-react';
import { Client, ClientContact } from '../../types';
import { formatAmount } from '../../lib/utils';

interface ClientWithContacts extends Client {
  contacts?: ClientContact[];
}

const ClientList = () => {
  const [clients, setClients] = useState<ClientWithContacts[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithContacts | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          contacts:client_contacts(*)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该客户吗？')) return;
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'inactive' })
        .eq('id', id);

      if (error) throw error;
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('删除失败');
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">客户库</h1>
          <p className="page-subtitle">管理客户信息、查看关联项目</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary shadow-glow"
        >
          <Plus className="h-5 w-5" />
          新增客户
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
          <input
            type="text"
            placeholder="搜索客户名称或地点..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-12"
          />
        </div>
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-dark-100 flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-10 w-10 text-dark-400" />
          </div>
          <h3 className="text-lg font-medium text-dark-900 mb-2">暂无客户</h3>
          <p className="text-dark-500">点击上方按钮添加第一个客户</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const primaryContact = getPrimaryContact(client);
            return (
              <div
                key={client.id}
                className="card card-hover cursor-pointer group flex flex-col hover:-translate-y-0.5 hover:shadow-lg hover:border-primary-300 transition-all duration-200 ease-out"
                onClick={() => {
                  setSelectedClient(client);
                  setShowDetailModal(true);
                }}
              >
                {/* Card Header */}
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary-200 transition-all duration-200">
                        <Building2 className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-bold text-dark-900 line-clamp-1 group-hover:text-primary-600 transition-colors duration-200" title={client.name}>{client.name}</h3>
                        <div className="flex items-center text-sm text-dark-500 mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {client.location}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  {primaryContact && (
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-dark-600">
                        <div className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center mr-3">
                          <User className="h-4 w-4 text-dark-500" />
                        </div>
                        <div>
                          <span className="font-semibold text-dark-900">{primaryContact.name}</span>
                          <div className="flex items-center text-dark-400 mt-0.5">
                            <Phone className="h-3 w-3 mr-1" />
                            {primaryContact.phone}
                          </div>
                        </div>
                      </div>
                      {client.contacts && client.contacts.length > 1 && (
                        <div className="text-xs text-dark-400 bg-dark-50 rounded-lg px-3 py-2">
                          还有 {client.contacts.length - 1} 位负责人
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Card Actions */}
                <div className="border-t border-dark-100 p-4 bg-dark-50/50 rounded-b-2xl flex justify-end space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClient(client);
                      setShowDetailModal(true);
                    }}
                    className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 ease-out hover:scale-105"
                    title="查看详情"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClient(client);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-dark-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all duration-200 ease-out hover:scale-105"
                    title="编辑"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(client.id);
                    }}
                    className="p-2 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 ease-out hover:scale-105"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <ClientFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchClients();
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedClient && (
        <ClientFormModal
          client={selectedClient}
          onClose={() => {
            setShowEditModal(false);
            setSelectedClient(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedClient(null);
            fetchClients();
          }}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedClient(null);
          }}
          onUpdate={() => {
            fetchClients();
          }}
        />
      )}
    </div>
  );
};

// Client Form Modal Component
interface ClientFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
  client?: ClientWithContacts;
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({ onClose, onSuccess, client }) => {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    location: client?.location || '',
    contacts: client?.contacts?.map(c => ({ name: c.name, phone: c.phone })) || [{ name: '', phone: '' }]
  });
  const [loading, setLoading] = useState(false);

  const addContact = () => {
    setFormData({
      ...formData,
      contacts: [...formData.contacts, { name: '', phone: '' }]
    });
  };

  const removeContact = (index: number) => {
    if (formData.contacts.length <= 1) return;
    setFormData({
      ...formData,
      contacts: formData.contacts.filter((_, i) => i !== index)
    });
  };

  const updateContact = (index: number, field: string, value: string) => {
    const newContacts = [...formData.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setFormData({ ...formData, contacts: newContacts });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.location.trim()) {
      alert('请填写客户名称和地点');
      return;
    }
    
    const validContacts = formData.contacts.filter(c => c.name.trim() && c.phone.trim());
    if (validContacts.length === 0) {
      alert('请至少添加一位负责人');
      return;
    }

    setLoading(true);
    try {
      let clientId = client?.id;
      
      if (client) {
        const { error } = await supabase
          .from('clients')
          .update({
            name: formData.name,
            location: formData.location,
            updated_at: new Date().toISOString()
          })
          .eq('id', client.id);
        
        if (error) throw error;
        
        await supabase.from('client_contacts').delete().eq('client_id', client.id);
      } else {
        const { data, error } = await supabase
          .from('clients')
          .insert({
            name: formData.name,
            location: formData.location,
            status: 'active'
          })
          .select()
          .single();
        
        if (error) throw error;
        clientId = data.id;
      }
      
      const contactsToInsert = validContacts.map((c, index) => ({
        client_id: clientId,
        name: c.name,
        phone: c.phone,
        is_primary: index === 0
      }));
      
      const { error: contactsError } = await supabase
        .from('client_contacts')
        .insert(contactsToInsert);
      
      if (contactsError) throw contactsError;
      
      onSuccess();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-dark-900">
            {client ? '编辑客户' : '新增客户'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-100 rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-dark-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-2">
              客户名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="请输入客户名称"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-2">
              地点 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="input"
              placeholder="请输入地点"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-3">
              负责人 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {formData.contacts.map((contact, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                    className="input flex-1"
                    placeholder="姓名"
                  />
                  <input
                    type="text"
                    value={contact.phone}
                    onChange={(e) => updateContact(index, 'phone', e.target.value)}
                    className="input flex-1"
                    placeholder="联系电话"
                  />
                  {formData.contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addContact}
              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              添加负责人
            </button>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Client Detail Modal Component
interface ClientDetailModalProps {
  client: ClientWithContacts;
  onClose: () => void;
  onUpdate: () => void;
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose, onUpdate }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    fetchClientProjects();
  }, [client.id]);

  const fetchClientProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_clients')
        .select(`
          *,
          project:projects(id, name, status)
        `)
        .eq('client_id', client.id);

      if (error) throw error;
      
      const projectList = data || [];
      setProjects(projectList);
      
      const total = projectList.reduce((sum, p) => sum + (p.contract_amount || 0), 0);
      setTotalAmount(total);
    } catch (error) {
      console.error('Error fetching client projects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-dark-100 flex items-center justify-between bg-gradient-to-r from-primary-50/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-dark-900">{client.name}</h2>
              <p className="text-sm text-dark-500 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {client.location}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-100 rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-dark-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">合同总额</span>
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary-600" />
                </div>
              </div>
              <div className="stat-value text-primary-600">
                {formatAmount(totalAmount)}
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">项目数量</span>
                <div className="w-10 h-10 rounded-xl bg-mint-100 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-mint-600" />
                </div>
              </div>
              <div className="stat-value text-mint-600">
                {projects.length}个
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div>
            <h3 className="text-lg font-display font-semibold text-dark-900 mb-4">负责人</h3>
            <div className="space-y-3">
              {client.contacts?.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-4 bg-dark-50 rounded-xl"
                >
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold shadow-glow">
                      {contact.name[0]}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-bold text-dark-900">
                        {contact.name}
                        {contact.is_primary && (
                          <span className="ml-2 badge badge-primary">主要</span>
                        )}
                      </p>
                      <p className="text-sm text-dark-500 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3.5 w-3.5" />
                        {contact.phone}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Related Projects */}
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
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-dark-50 rounded-xl hover:bg-dark-100 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-dark-900">
                        {item.project?.name}
                      </p>
                      <p className="text-xs text-dark-500 mt-1">
                        合同金额: {formatAmount(item.contract_amount || 0)}
                      </p>
                    </div>
                    <a
                      href={`/projects/${item.project?.id}`}
                      className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/projects/${item.project?.id}`;
                      }}
                    >
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
