/**
 * 模板管理列表组件
 * 用于系统管理中展示和管理所有里程碑模板
 */

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Eye, 
  Edit, 
  Loader2,
  LayoutTemplate,
  Layers,
  ListTodo,
  User,
  Tag,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { 
  getAllTemplatesForAdmin, 
  enableTemplate, 
  disableTemplate, 
  deleteTemplate,
  batchOperateTemplates,
  MilestoneTemplate 
} from '../../../services/systemService';

interface TemplateManagementListProps {
  onViewDetail?: (templateId: string) => void;
  onEdit?: (templateId: string) => void;
}

export function TemplateManagementList({ onViewDetail, onEdit }: TemplateManagementListProps) {
  const [templates, setTemplates] = useState<MilestoneTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'active' | 'inactive',
    type: 'all' as 'all' | 'system' | 'public' | 'private',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<MilestoneTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [filters.status, filters.type, pagination.page]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const result = await getAllTemplatesForAdmin({
        status: filters.status === 'all' ? undefined : filters.status,
        type: filters.type === 'all' ? undefined : filters.type,
        search: filters.search || undefined,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      setTemplates(result.list);
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
      }));
    } catch (error) {
      console.error('Error fetching templates:', error);
      alert('获取模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchTemplates();
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(templates.map(t => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleEnable = async (template: MilestoneTemplate) => {
    try {
      await enableTemplate(template.id);
      alert('模板已启用');
      fetchTemplates();
    } catch (error: any) {
      alert(error.message || '启用失败');
    }
  };

  const handleDisable = async (template: MilestoneTemplate) => {
    try {
      await disableTemplate(template.id);
      alert('模板已禁用');
      fetchTemplates();
    } catch (error: any) {
      alert(error.message || '禁用失败');
    }
  };

  const handleDelete = async (template: MilestoneTemplate) => {
    if (template.is_system) {
      alert('系统模板不能删除');
      return;
    }
    setDeletingTemplate(template);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingTemplate) return;
    
    try {
      await deleteTemplate(deletingTemplate.id);
      alert('模板已删除');
      setShowDeleteConfirm(false);
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      alert(error.message || '删除失败');
    }
  };

  const handleBatchEnable = async () => {
    if (selectedIds.size === 0) return;
    try {
      await batchOperateTemplates('enable', Array.from(selectedIds));
      alert(`已启用 ${selectedIds.size} 个模板`);
      setSelectedIds(new Set());
      fetchTemplates();
    } catch (error: any) {
      alert(error.message || '批量启用失败');
    }
  };

  const handleBatchDisable = async () => {
    if (selectedIds.size === 0) return;
    try {
      await batchOperateTemplates('disable', Array.from(selectedIds));
      alert(`已禁用 ${selectedIds.size} 个模板`);
      setSelectedIds(new Set());
      fetchTemplates();
    } catch (error: any) {
      alert(error.message || '批量禁用失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    
    // 检查是否包含系统模板
    const selectedTemplates = templates.filter(t => selectedIds.has(t.id));
    const hasSystem = selectedTemplates.some(t => t.is_system);
    
    if (hasSystem) {
      alert('选中的模板中包含系统模板，系统模板不能删除');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个模板吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const result = await batchOperateTemplates('delete', Array.from(selectedIds));
      alert(`成功删除 ${result.success} 个模板`);
      if (result.fail > 0) {
        alert(`${result.fail} 个模板删除失败`);
      }
      setSelectedIds(new Set());
      fetchTemplates();
    } catch (error: any) {
      alert(error.message || '批量删除失败');
    }
  };

  const getTemplateTypeLabel = (template: MilestoneTemplate) => {
    if (template.is_system) return { text: '系统', className: 'bg-purple-100 text-purple-700' };
    if (template.is_public) return { text: '公开', className: 'bg-blue-100 text-blue-700' };
    return { text: '私有', className: 'bg-gray-100 text-gray-700' };
  };

  const getSourceLabel = (template: MilestoneTemplate) => {
    return template.is_system ? '系统内置' : '用户创建';
  };

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">全部模板</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <LayoutTemplate className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">系统模板</p>
              <p className="text-2xl font-bold text-gray-900">
                {templates.filter(t => t.is_system).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <LayoutTemplate className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已启用</p>
              <p className="text-2xl font-bold text-green-600">
                {templates.filter(t => t.is_active).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已禁用</p>
              <p className="text-2xl font-bold text-red-600">
                {templates.filter(t => !t.is_active).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索模板名称、描述..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部状态</option>
            <option value="active">已启用</option>
            <option value="inactive">已禁用</option>
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部类型</option>
            <option value="system">系统模板</option>
            <option value="public">公开模板</option>
            <option value="private">私有模板</option>
          </select>
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-blue-700">
              已选择 <span className="font-medium">{selectedIds.size}</span> 项
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBatchEnable}
              className="px-3 py-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              批量启用
            </button>
            <button
              onClick={handleBatchDisable}
              className="px-3 py-1.5 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              批量禁用
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              批量删除
            </button>
          </div>
        </div>
      )}

      {/* 模板列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === templates.length && templates.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">模板名称</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">版本</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">来源</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">统计</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  没有找到匹配的模板
                </td>
              </tr>
            ) : (
              templates.map((template) => {
                const typeLabel = getTemplateTypeLabel(template);
                return (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(template.id)}
                        onChange={() => handleSelectOne(template.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                          template.is_system
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                            : template.is_public
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                            : 'bg-gradient-to-br from-orange-500 to-red-600'
                        }`}>
                          <LayoutTemplate className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">{template.name}</span>
                            <span className={`px-2 py-0.5 text-xs rounded ${typeLabel.className}`}>
                              {typeLabel.text}
                            </span>
                          </div>
                          {template.tags && template.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {template.tags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  {tag}
                                </span>
                              ))}
                              {template.tags.length > 3 && (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  +{template.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">{template.version}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full w-fit">
                          {getSourceLabel(template)}
                        </span>
                        {!template.is_system && (
                          <span className="text-xs text-gray-500 mt-1">{template.created_by_name || '未知'}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {template.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center w-fit">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                          启用
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center w-fit">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
                          禁用
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <Layers className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {template.phaseCount || 0} 阶段
                        </div>
                        <div className="flex items-center">
                          <ListTodo className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {template.taskCount || 0} 任务
                        </div>
                        <div className="flex items-center">
                          <User className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {template.use_count || 0} 使用
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {new Date(template.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onViewDetail?.(template.id)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit?.(template.id)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {template.is_active ? (
                          <button
                            onClick={() => handleDisable(template)}
                            className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="禁用"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnable(template)}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="启用"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {!template.is_system && (
                          <button
                            onClick={() => handleDelete(template)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          共 {pagination.total} 条记录
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  pagination.page === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
            className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="确认删除"
        maxWidth="sm"
      >
        <div className="p-4">
          <p className="text-gray-700 mb-4">
            确定要删除模板 <span className="font-medium">"{deletingTemplate?.name}"</span> 吗？
          </p>
          <p className="text-sm text-gray-500 mb-6">
            此操作不可恢复，删除后该模板将无法再被使用。
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
