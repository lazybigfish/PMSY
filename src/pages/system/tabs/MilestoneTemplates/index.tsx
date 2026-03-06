/**
 * 里程碑模板管理 - 重构版
 * 从"版本管理"模式转变为"模板库"模式
 */

import React, { useEffect, useState } from 'react';
import { Search, Plus, Eye, Edit2, Trash2, Ban, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { ModalForm } from '@/components/Modal';
import { TemplateDetailModal } from './components/TemplateDetailModal';
import { TemplateFormModal } from './components/TemplateFormModal';

// --- Types ---

interface MilestoneTemplate {
  id: string;
  name: string;
  version_number: string;
  description: string;
  is_active: boolean;
  // 扩展字段（带默认值兼容）
  is_system?: boolean;
  is_public?: boolean;
  tags?: string[];
  use_count?: number;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  // 统计信息
  phaseCount?: number;
  taskCount?: number;
}

interface TemplateFilter {
  search: string;
  type: 'all' | 'system' | 'public' | 'private';
  status: 'all' | 'active' | 'inactive';
}

// --- Component ---

export default function MilestoneTemplates() {
  // --- State ---
  const [templates, setTemplates] = useState<MilestoneTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<TemplateFilter>({
    search: '',
    type: 'all',
    status: 'all',
  });

  // 获取当前用户角色
  const [userRole, setUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || '');
        setCurrentUserId(user.id || '');
      } catch {
        setUserRole('');
        setCurrentUserId('');
      }
    }
  }, []);

  const isAdmin = userRole === 'admin';

  // Modals
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MilestoneTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<MilestoneTemplate | null>(null);

  // --- Effects ---

  useEffect(() => {
    fetchTemplates();
  }, []);

  // --- Data Fetching ---

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // 使用管理员 API 获取所有模板
      const response = await fetch(`${API_BASE_URL}/admin/milestone-templates?page=1&pageSize=100`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      const result = await response.json();
      
      if (result.success) {
        setTemplates(result.data.list || []);
      } else {
        console.error('Failed to fetch templates:', result.message);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Computed ---

  const filteredTemplates = templates.filter(template => {
    // 搜索过滤
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const matchName = template.name?.toLowerCase().includes(searchLower);
      const matchDesc = template.description?.toLowerCase().includes(searchLower);
      if (!matchName && !matchDesc) return false;
    }

    // 类型过滤
    if (filter.type !== 'all') {
      if (filter.type === 'system' && !template.is_system) return false;
      if (filter.type === 'public' && (template.is_system || !template.is_public)) return false;
      if (filter.type === 'private' && (template.is_system || template.is_public)) return false;
    }

    // 状态过滤
    if (filter.status !== 'all') {
      if (filter.status === 'active' && !template.is_active) return false;
      if (filter.status === 'inactive' && template.is_active) return false;
    }

    return true;
  });

  const stats = {
    total: templates.length,
    system: templates.filter(t => t.is_system).length,
    public: templates.filter(t => !t.is_system && t.is_public).length,
    active: templates.filter(t => t.is_active).length,
  };

  // --- Actions ---

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setFormModalOpen(true);
  };

  const handleEditTemplate = (template: MilestoneTemplate) => {
    setEditingTemplate(template);
    setFormModalOpen(true);
  };

  const handleViewTemplate = (template: MilestoneTemplate) => {
    setViewingTemplate(template);
    setDetailModalOpen(true);
  };

  const handleToggleStatus = async (template: MilestoneTemplate) => {
    const newStatus = !template.is_active;
    const action = newStatus ? '启用' : '禁用';

    if (!confirm(`确定要${action}模板 "${template.name}" 吗？`)) {
      return;
    }

    try {
      const endpoint = newStatus ? 'enable' : 'disable';
      const response = await fetch(`${API_BASE_URL}/admin/milestone-templates/${template.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        fetchTemplates();
        alert(`${action}成功`);
      } else {
        alert(result.message || `${action}失败`);
      }
    } catch (error) {
      console.error(`Error ${action} template:`, error);
      alert(`${action}失败`);
    }
  };

  const handleDeleteTemplate = async (template: MilestoneTemplate) => {
    // 系统模板只有系统管理员可以删除，且只能删除自己创建的系统模板
    if (template.is_system && (!isAdmin || template.created_by !== currentUserId)) {
      alert('系统模板不可删除');
      return;
    }

    if (!confirm(`确定要删除模板 "${template.name}" 吗？\n\n此操作将同时删除该模板下的所有阶段和任务，且无法恢复！`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/milestone-templates/${template.id}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        fetchTemplates();
        alert('删除成功');
      } else {
        alert(result.message || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('删除失败');
    }
  };

  // --- Render Helpers ---

  const getTypeBadge = (template: MilestoneTemplate) => {
    if (template.is_system) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
          系统
        </span>
      );
    }
    if (template.is_public) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          公开
        </span>
      );
    }
    return (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
        私有
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
          启用
        </span>
      );
    }
    return (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
        禁用
      </span>
    );
  };

  const getTemplateIcon = (template: MilestoneTemplate) => {
    if (template.is_system) {
      return (
        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <i className="fas fa-flag-checkered text-white text-sm"></i>
        </div>
      );
    }
    if (template.is_public) {
      return (
        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
          <i className="fas fa-rocket text-white text-sm"></i>
        </div>
      );
    }
    return (
      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
        <i className="fas fa-lock text-white text-sm"></i>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">里程碑模板管理</h2>
        <button
          onClick={handleCreateTemplate}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          新建模板
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">全部模板</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-layer-group text-blue-600"></i>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">系统模板</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.system}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-shield-alt text-purple-600"></i>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">公开模板</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.public}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-globe text-green-600"></i>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已启用</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.active}</p>
            </div>
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-check-circle text-indigo-600"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜索模板名称、描述..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
          value={filter.type}
          onChange={(e) => setFilter({ ...filter, type: e.target.value as any })}
        >
          <option value="all">全部类型</option>
          <option value="system">系统模板</option>
          <option value="public">公开模板</option>
          <option value="private">私有模板</option>
        </select>
        <select
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value as any })}
        >
          <option value="all">全部状态</option>
          <option value="active">已启用</option>
          <option value="inactive">已禁用</option>
        </select>
      </div>

      {/* Templates Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                模板信息
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                统计
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                创建者
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                状态
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredTemplates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  暂无模板数据
                </td>
              </tr>
            ) : (
              filteredTemplates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {getTemplateIcon(template)}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {template.name}
                          <span className="ml-2 text-xs text-gray-500">{template.version_number}</span>
                        </div>
                        {template.description && (
                          <div className="text-sm text-gray-500">{template.description}</div>
                        )}
                        {template.tags && template.tags.length > 0 && (
                          <div className="flex items-center space-x-2 mt-1">
                            {template.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(template)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{template.phaseCount || 0} 阶段</div>
                    <div className="text-sm text-gray-500">
                      {template.taskCount || 0} 任务 · {template.use_count || 0} 使用
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {template.created_by_name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(template.is_active)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleViewTemplate(template)}
                        className="text-indigo-600 hover:text-indigo-900 p-1"
                        title="查看"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="text-indigo-600 hover:text-indigo-900 p-1"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(template)}
                        className={`p-1 ${
                          template.is_active
                            ? 'text-orange-600 hover:text-orange-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                        title={template.is_active ? '禁用' : '启用'}
                      >
                        {template.is_active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className={`p-1 ${
                          template.is_system
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-900'
                        }`}
                        title={template.is_system ? '系统模板不可删除' : '删除'}
                        disabled={template.is_system}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          共 {filteredTemplates.length} 条记录
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 text-sm">
            <i className="fas fa-chevron-left"></i>
          </button>
          <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium">1</button>
          <button className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-md text-sm transition-colors">
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      <TemplateDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        template={viewingTemplate}
        onEdit={() => {
          setDetailModalOpen(false);
          if (viewingTemplate) {
            handleEditTemplate(viewingTemplate);
          }
        }}
        onToggleStatus={() => {
          if (viewingTemplate) {
            handleToggleStatus(viewingTemplate);
          }
        }}
      />

      {/* Form Modal */}
      <TemplateFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        template={editingTemplate}
        onSuccess={() => {
          setFormModalOpen(false);
          fetchTemplates();
        }}
      />
    </div>
  );
}
