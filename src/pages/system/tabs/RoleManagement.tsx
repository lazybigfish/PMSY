
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Shield, Plus, Edit2, Trash2, X, Check, Loader2 } from 'lucide-react';

interface AppRole {
  key: string;
  name: string;
  description: string;
}

const MODULES = [
  { key: 'dashboard', name: '工作台', description: '项目概览、统计信息、快捷入口' },
  { key: 'projects', name: '项目管理', description: '项目创建、里程碑、风险管理' },
  { key: 'tasks', name: '任务中心', description: '任务分配、进度跟踪、协作' },
  { key: 'stakeholders', name: '相关方', description: '供应商库、客户库管理、项目关联' },
  { key: 'analysis', name: '数据分析', description: '项目数据可视化分析' },
  { key: 'water', name: '水漫金山', description: '热点资讯、用户社区' },
  { key: 'files', name: '文件管理', description: '文件上传、存储、管理' },
  { key: 'system', name: '系统设置', description: '用户管理、角色权限、系统配置' },
];

export default function RoleManagement() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  
  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null); // null means creating new
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  
  // Form State for New/Edit Role
  const [formData, setFormData] = useState({ key: '', name: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Roles
      const { data: rolesData, error: rolesError } = await supabase.from('app_roles').select('*').order('name');
      
      if (rolesError) {
        console.warn('Error fetching roles (tables might be missing):', rolesError);
        // Fallback mock data if table missing
        if (rolesError.code === '42P01') { // undefined_table
             alert('错误: 数据库表尚未创建。请联系管理员运行迁移脚本 "20260210200000_add_role_permissions.sql"');
        }
      } else {
        setRoles(rolesData || []);
      }

      // 2. Fetch User Counts
      const { data: profiles } = await supabase.from('profiles').select('role');
      const counts: Record<string, number> = {};
      profiles?.forEach((p: { role?: string | null }) => {
        const r = p.role || 'unknown';
        counts[r] = (counts[r] || 0) + 1;
      });
      setRoleCounts(counts);

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = async (role: AppRole) => {
    setCurrentRole(role);
    setFormData({ key: role.key, name: role.name, description: role.description || '' });
    
    // Fetch permissions for this role
    const { data } = await supabase
      .from('role_permissions')
      .select('module_key')
      .eq('role_key', role.key);
      
    const perms = new Set<string>();
    data?.forEach((p: { module_key: string }) => perms.add(p.module_key));
    setSelectedPermissions(perms);
    
    setIsModalOpen(true);
  };

  const handleCreateClick = () => {
    setCurrentRole(null);
    setFormData({ key: '', name: '', description: '' });
    setSelectedPermissions(new Set());
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.key || !formData.name) {
      alert('请输入角色标识和名称');
      return;
    }

    setSaving(true);
    try {
      // 1. Upsert Role
      const { error: roleError } = await supabase.from('app_roles').upsert({
        key: formData.key,
        name: formData.name,
        description: formData.description
      });

      if (roleError) throw roleError;

      // 2. Update Permissions
      // First delete existing
      await supabase.from('role_permissions').delete().eq('role_key', formData.key);
      
      // Then insert new
      const permsToInsert = Array.from(selectedPermissions).map(mKey => ({
        role_key: formData.key,
        module_key: mKey
      }));
      
      if (permsToInsert.length > 0) {
        const { error: permError } = await supabase.from('role_permissions').insert(permsToInsert);
        if (permError) throw permError;
      }

      alert('保存成功');
      setIsModalOpen(false);
      fetchData();

    } catch (error) {
      console.error('Save error:', error);
      const errorMessage = error instanceof Error ? error.message : '保存失败';
      alert('保存失败: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (moduleKey: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(moduleKey)) {
      newSet.delete(moduleKey);
    } else {
      newSet.add(moduleKey);
    }
    setSelectedPermissions(newSet);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">角色与权限</h3>
        <button 
          onClick={handleCreateClick}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增角色
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div key={role.key} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Shield className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditClick(role)}
                    className="text-gray-400 hover:text-indigo-600"
                    title="编辑权限"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {/* Prevent deleting system roles usually, but for now allow it or just show button */}
                  <button className="text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{role.name}</h4>
              <p className="text-sm text-gray-500 mb-4 h-10">{role.description}</p>
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <span className="text-xs font-medium text-gray-500">成员数量</span>
                <span className="text-sm font-bold text-gray-900">{roleCounts[role.key] || 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{currentRole ? '编辑角色权限' : '新增角色'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">角色标识 (Key)</label>
                  <input
                    type="text"
                    disabled={!!currentRole} // Cannot change key when editing
                    className={`w-full border border-gray-300 rounded-md px-3 py-2 ${currentRole ? 'bg-gray-100' : ''}`}
                    placeholder="例如: manager"
                    value={formData.key}
                    onChange={e => setFormData({...formData, key: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">系统内部使用的唯一标识，创建后不可修改</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">角色名称</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="例如: 项目经理"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">模块访问权限</h4>
                  <div className="text-xs text-gray-500">
                    已选择 {selectedPermissions.size} / {MODULES.length} 个模块
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {MODULES.map(module => (
                    <div 
                      key={module.key}
                      onClick={() => togglePermission(module.key)}
                      className={`
                        flex items-start p-3 rounded-lg border cursor-pointer transition-colors
                        ${selectedPermissions.has(module.key) 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'}
                      `}
                    >
                      <div className={`
                        w-5 h-5 rounded border flex items-center justify-center mr-3 mt-0.5 flex-shrink-0
                        ${selectedPermissions.has(module.key)
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-300 bg-white'}
                      `}>
                        {selectedPermissions.has(module.key) && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 block">{module.name}</span>
                        <span className="text-xs text-gray-500 block mt-0.5">{module.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  提示：勾选模块后，该角色的用户将在导航栏中看到并访问这些模块
                </p>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  保存配置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
