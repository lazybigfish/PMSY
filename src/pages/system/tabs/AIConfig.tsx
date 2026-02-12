
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { AIProvider, AIRole } from '../../../types';
import { Loader2, Trash2 } from 'lucide-react';

const AIConfig = () => {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [roles, setRoles] = useState<AIRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newProvider, setNewProvider] = useState({ name: '', api_endpoint: '', api_key: '', model: '' });
  const [newRole, setNewRole] = useState({ name: '', description: '', system_prompt: '' });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data: providersData } = await supabase.from('ai_providers').select('*');
      const { data: rolesData } = await supabase.from('ai_roles').select('*');
      setProviders(providersData || []);
      setRoles(rolesData || []);
    } catch (error) {
      console.error('Error fetching AI config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('ai_providers').insert([newProvider]);
    if (!error) {
      setNewProvider({ name: '', api_endpoint: '', api_key: '', model: '' });
      fetchConfig();
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('ai_roles').insert([newRole]);
    if (!error) {
      setNewRole({ name: '', description: '', system_prompt: '' });
      fetchConfig();
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('确认删除？')) return;
    await supabase.from('ai_providers').delete().eq('id', id);
    fetchConfig();
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('确认删除？')) return;
    await supabase.from('ai_roles').delete().eq('id', id);
    fetchConfig();
  };

  if (loading) return <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />;

  return (
    <div className="space-y-8">
      {/* AI Providers Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">AI服务提供商</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <form onSubmit={handleAddProvider} className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="text-sm font-medium">新增提供商</h4>
                <input placeholder="名称 (如: OpenAI)" className="w-full p-2 border rounded" value={newProvider.name} onChange={e => setNewProvider({...newProvider, name: e.target.value})} required />
                <input placeholder="API地址" className="w-full p-2 border rounded" value={newProvider.api_endpoint} onChange={e => setNewProvider({...newProvider, api_endpoint: e.target.value})} required />
                <input placeholder="API密钥" type="password" className="w-full p-2 border rounded" value={newProvider.api_key} onChange={e => setNewProvider({...newProvider, api_key: e.target.value})} required />
                <input placeholder="模型 (如: gpt-4)" className="w-full p-2 border rounded" value={newProvider.model} onChange={e => setNewProvider({...newProvider, model: e.target.value})} required />
                <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">添加</button>
            </form>

            <div className="space-y-2">
                {providers.map(provider => (
                    <div key={provider.id} className="flex justify-between items-center p-3 bg-white border rounded shadow-sm">
                        <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-sm text-gray-500">{provider.model}</div>
                        </div>
                        <button onClick={() => handleDeleteProvider(provider.id)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                    </div>
                ))}
            </div>
        </div>
      </div>

      <hr />

      {/* AI Roles Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">AI角色预设</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <form onSubmit={handleAddRole} className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="text-sm font-medium">新增角色</h4>
                <input placeholder="角色名称 (如: 资深项目经理)" className="w-full p-2 border rounded" value={newRole.name} onChange={e => setNewRole({...newRole, name: e.target.value})} required />
                <input placeholder="描述" className="w-full p-2 border rounded" value={newRole.description} onChange={e => setNewRole({...newRole, description: e.target.value})} />
                <textarea placeholder="系统提示词" className="w-full p-2 border rounded" rows={3} value={newRole.system_prompt} onChange={e => setNewRole({...newRole, system_prompt: e.target.value})} required />
                <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">添加</button>
            </form>

            <div className="space-y-2">
                {roles.map(role => (
                    <div key={role.id} className="flex justify-between items-center p-3 bg-white border rounded shadow-sm">
                        <div>
                            <div className="font-medium">{role.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">{role.description}</div>
                        </div>
                        {!role.is_default && (
                            <button onClick={() => handleDeleteRole(role.id)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfig;
