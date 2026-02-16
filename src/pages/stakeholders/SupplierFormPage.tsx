import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { ArrowLeft, Plus, AlertTriangle, Save } from 'lucide-react';
import { Supplier } from '../../types';

interface SupplierContact {
  id?: string;
  supplier_id?: string;
  name: string;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  is_primary?: boolean;
}

export default function SupplierFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ name?: Supplier; phone?: Supplier } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
    contacts: [{ name: '', phone: '', position: '', email: '' }] as SupplierContact[]
  });

  useEffect(() => {
    if (isEditing && id) {
      fetchSupplier();
    }
  }, [id]);

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      const { data: supplierData, error: supplierError } = await api.db
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();

      if (supplierError) throw supplierError;

      const { data: contactsData } = await api.db
        .from('supplier_contacts')
        .select('*')
        .eq('supplier_id', id);

      setFormData({
        name: supplierData.name || '',
        phone: supplierData.phone || '',
        email: supplierData.email || '',
        address: supplierData.address || '',
        description: supplierData.description || '',
        status: supplierData.status || 'active',
        contacts: contactsData && contactsData.length > 0 
          ? contactsData.map(c => ({ ...c }))
          : [{ name: '', phone: '', position: '', email: '' }]
      });
    } catch (error) {
      console.error('Error fetching supplier:', error);
      alert('获取供应商信息失败');
      navigate('/stakeholders/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const checkDuplicate = async (name: string, phone?: string | null) => {
    const result: { name?: Supplier; phone?: Supplier } = {};
    
    const trimmedName = name?.trim();
    if (trimmedName) {
      const { data: nameCheck } = await api.db
        .from('suppliers')
        .select('*')
        .eq('name', trimmedName);
      
      if (nameCheck && nameCheck.length > 0) {
        const existing = nameCheck.find(s => s.id !== id);
        if (existing) result.name = existing;
      }
    }

    if (phone?.trim()) {
      const { data: phoneCheck } = await api.db
        .from('suppliers')
        .select('*')
        .eq('phone', phone.trim());
      
      if (phoneCheck && phoneCheck.length > 0) {
        const existing = phoneCheck.find(s => s.id !== id);
        if (existing) result.phone = existing;
      }
    }

    return result;
  };

  const handleSubmit = async (e: React.FormEvent, forceAdd = false) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('请填写供应商名称');
      return;
    }

    if (!forceAdd) {
      const duplicate = await checkDuplicate(formData.name, formData.phone);
      if (duplicate.name || duplicate.phone) {
        setDuplicateWarning(duplicate);
        return;
      }
    }

    setSaving(true);
    try {
      const supplierData = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        description: formData.description.trim() || null,
        status: formData.status
      };

      let supplierId = id;

      if (isEditing && id) {
        const { error } = await api.db
          .from('suppliers')
          .update(supplierData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await api.db
          .from('suppliers')
          .insert([supplierData]);
        if (error) throw error;
        supplierId = data?.[0]?.id;
      }

      if (formData.contacts && formData.contacts.length > 0 && supplierId) {
        if (isEditing) {
          await api.db.from('supplier_contacts').delete().eq('supplier_id', supplierId);
        }
        
        const validContacts = formData.contacts.filter(c => c.name?.trim());
        if (validContacts.length > 0) {
          const contactsToInsert = validContacts.map((c, index) => ({
            supplier_id: supplierId,
            name: c.name.trim(),
            position: c.position?.trim() || null,
            phone: c.phone?.trim() || null,
            email: c.email?.trim() || null,
            is_primary: index === 0
          }));
          
          await api.db.from('supplier_contacts').insert(contactsToInsert);
        }
      }
      
      navigate('/stakeholders/suppliers');
    } catch (error) {
      console.error('Error saving supplier:', error);
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
                    {duplicateWarning.phone && (
                      <span>电话重复：{duplicateWarning.phone.name}（{duplicateWarning.phone.status === 'active' ? '合作中' : '已终止'}）</span>
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
          onClick={() => navigate('/stakeholders/suppliers')}
          className="p-2 hover:bg-dark-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-dark-500" />
        </button>
        <div>
          <h1 className="page-title">{isEditing ? '编辑供应商' : '新增供应商'}</h1>
          <p className="page-subtitle">填写供应商基本信息和联系人</p>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-display font-semibold text-dark-900 mb-4">基本信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                供应商名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入供应商名称"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">联系电话</label>
              <input
                type="text"
                className="input"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入联系电话"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">电子邮箱</label>
              <input
                type="email"
                className="input"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="请输入电子邮箱"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-dark-700 mb-2">地址</label>
              <input
                type="text"
                className="input"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="请输入地址"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-dark-700 mb-2">描述/备注</label>
              <textarea
                className="input"
                rows={3}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入描述或备注"
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
            <h2 className="text-lg font-display font-semibold text-dark-900">联系人</h2>
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
                    <label className="block text-xs font-medium text-dark-600 mb-1">姓名</label>
                    <input
                      type="text"
                      className="input"
                      value={contact.name || ''}
                      onChange={e => updateContact(index, 'name', e.target.value)}
                      placeholder="请输入姓名"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-600 mb-1">电话</label>
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
            onClick={() => navigate('/stakeholders/suppliers')}
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
