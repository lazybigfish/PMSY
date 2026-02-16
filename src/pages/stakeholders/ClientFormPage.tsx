import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { ArrowLeft, Plus, AlertTriangle, Save } from 'lucide-react';
import { Client } from '../../types';

interface ClientContact {
  id?: string;
  client_id?: string;
  name: string;
  phone?: string | null;
  position?: string | null;
  email?: string | null;
  is_primary?: boolean;
}

export default function ClientFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ name?: Client; code?: Client } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    status: 'active' as 'active' | 'inactive',
    contacts: [{ name: '', phone: '', position: '', email: '' }] as ClientContact[]
  });

  useEffect(() => {
    if (isEditing && id) {
      fetchClient();
    }
  }, [id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const { data: clientData, error: clientError } = await api.db
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (clientError) throw clientError;

      const { data: contactsData } = await api.db
        .from('client_contacts')
        .select('*')
        .eq('client_id', id);

      setFormData({
        name: clientData.name || '',
        code: clientData.code || '',
        location: clientData.location || '',
        status: clientData.status || 'active',
        contacts: contactsData && contactsData.length > 0 
          ? contactsData.map(c => ({ ...c }))
          : [{ name: '', phone: '', position: '', email: '' }]
      });
    } catch (error) {
      console.error('Error fetching client:', error);
      alert('获取客户信息失败');
      navigate('/stakeholders/clients');
    } finally {
      setLoading(false);
    }
  };

  const checkDuplicate = async (name: string, code?: string) => {
    const result: { name?: Client; code?: Client } = {};
    
    const trimmedName = name?.trim();
    if (trimmedName) {
      const { data: nameCheck } = await api.db
        .from('clients')
        .select('*')
        .eq('name', trimmedName);
      
      if (nameCheck && nameCheck.length > 0) {
        const existing = nameCheck.find(c => c.id !== id);
        if (existing) result.name = existing;
      }
    }

    const trimmedCode = code?.trim();
    if (trimmedCode) {
      const { data: codeCheck } = await api.db
        .from('clients')
        .select('*')
        .eq('code', trimmedCode);
      
      if (codeCheck && codeCheck.length > 0) {
        const existing = codeCheck.find(c => c.id !== id);
        if (existing) result.code = existing;
      }
    }

    return result;
  };

  const handleSubmit = async (e: React.FormEvent, forceAdd = false) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('请填写客户名称');
      return;
    }
    
    const validContacts = formData.contacts.filter(c => c.name.trim() || c.phone?.trim());
    const hasInvalidContact = validContacts.some(c => !c.name.trim() || !c.phone?.trim());
    if (hasInvalidContact) {
      alert('已填写的联系人需要同时填写姓名和电话');
      return;
    }

    if (!forceAdd) {
      const duplicate = await checkDuplicate(formData.name, formData.code);
      if (duplicate.name || duplicate.code) {
        setDuplicateWarning(duplicate);
        return;
      }
    }

    setSaving(true);
    try {
      const clientData = {
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        location: formData.location.trim() || null,
        status: formData.status
      };

      let clientId = id;

      if (isEditing && id) {
        const { error } = await api.db
          .from('clients')
          .update(clientData)
          .eq('id', id);
        if (error) throw error;
        await api.db.from('client_contacts').delete().eq('client_id', id);
      } else {
        const { data, error } = await api.db
          .from('clients')
          .insert([clientData]);
        if (error) throw error;
        clientId = data?.[0]?.id;
      }

      const contactsToInsert = validContacts.map((c, index) => ({
        client_id: clientId,
        name: c.name.trim(),
        phone: c.phone!.trim(),
        position: c.position?.trim() || null,
        email: c.email?.trim() || null,
        is_primary: index === 0
      }));

      const { error: contactsError } = await api.db
        .from('client_contacts')
        .insert(contactsToInsert);
      
      if (contactsError) throw contactsError;
      
      navigate('/stakeholders/clients');
    } catch (error) {
      console.error('Error saving client:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const addContact = () => {
    setFormData({
      ...formData,
      contacts: [...formData.contacts, { name: '', phone: '', position: '', email: '' }]
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {duplicateWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 shadow-lg animate-slide-down">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-white" />
                <div className="text-white">
                  <p className="font-semibold">检测到可能的重复记录</p>
                  <div className="text-sm text-amber-100 mt-1">
                    {duplicateWarning.name && (
                      <span className="mr-4">名称重复：{duplicateWarning.name.name}（{duplicateWarning.name.status === 'active' ? '合作中' : '已终止'}）</span>
                    )}
                    {duplicateWarning.code && (
                      <span>编码重复：{duplicateWarning.code.name}（编码 {duplicateWarning.code.code}）</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDuplicateWarning(null)}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm font-medium"
                >
                  返回修改
                </button>
                <button
                  onClick={(e) => handleSubmit(e, true)}
                  className="px-4 py-2 bg-white text-amber-600 rounded-lg hover:bg-amber-50 transition-colors text-sm font-medium"
                >
                  仍然保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/stakeholders/clients')}
          className="p-2 hover:bg-dark-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-dark-500" />
        </button>
        <div>
          <h1 className="page-title">{isEditing ? '编辑客户' : '新增客户'}</h1>
          <p className="page-subtitle">填写客户基本信息和联系人</p>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-display font-semibold text-dark-900 mb-4">基本信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                客户名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入客户名称"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">客户编码</label>
              <input
                type="text"
                className="input"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                placeholder="如：C001"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">地点</label>
              <input
                type="text"
                className="input"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="请输入地点"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">状态</label>
              <select
                className="input"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              >
                <option value="active">合作中</option>
                <option value="inactive">已终止</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-dark-900">
              联系人 <span className="text-sm font-normal text-dark-500">（选填）</span>
            </h2>
            <button
              type="button"
              onClick={addContact}
              className="btn-secondary text-sm"
            >
              <Plus className="h-4 w-4" />
              添加联系人
            </button>
          </div>
          <div className="space-y-4">
            {formData.contacts.map((contact, index) => (
              <div key={index} className="p-4 bg-dark-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-dark-700">
                    联系人 {index + 1}
                    {index === 0 && <span className="ml-2 text-xs text-primary-600">(主要联系人)</span>}
                  </span>
                  {formData.contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      删除
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-dark-600 mb-1">
                      姓名
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={contact.name || ''}
                      onChange={e => updateContact(index, 'name', e.target.value)}
                      placeholder="请输入姓名"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-600 mb-1">
                      电话
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={contact.phone || ''}
                      onChange={e => updateContact(index, 'phone', e.target.value)}
                      placeholder="请输入电话"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-600 mb-1">职位</label>
                    <input
                      type="text"
                      className="input"
                      value={contact.position || ''}
                      onChange={e => updateContact(index, 'position', e.target.value)}
                      placeholder="请输入职位"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-600 mb-1">邮箱</label>
                    <input
                      type="email"
                      className="input"
                      value={contact.email || ''}
                      onChange={e => updateContact(index, 'email', e.target.value)}
                      placeholder="请输入邮箱"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/stakeholders/clients')}
            className="btn-ghost"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            <Save className="h-4 w-4" />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
