import React, { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { Profile, Project, ProjectModule } from '../../../types';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: TaskFormData) => void;
  projects: Project[];
  users: Profile[];
  currentUserId?: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  project_id: string;
  module_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_public: boolean;
  due_date: string;
  assignee_ids: string[];
}

export function TaskCreateModal({
  isOpen,
  onClose,
  onSubmit,
  projects,
  users,
  currentUserId
}: TaskCreateModalProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    project_id: '',
    module_id: '',
    priority: 'medium',
    is_public: false,
    due_date: '',
    assignee_ids: currentUserId ? [currentUserId] : []
  });
  const [modules, setModules] = useState<ProjectModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (formData.project_id) {
      fetchModules(formData.project_id);
    } else {
      setModules([]);
      setFormData(prev => ({ ...prev, module_id: '' }));
    }
  }, [formData.project_id]);

  const fetchModules = async (projectId: string) => {
    setLoadingModules(true);
    try {
      const { supabase } = await import('../../../lib/supabase');
      const { data } = await supabase
        .from('project_modules')
        .select('*')
        .eq('project_id', projectId);
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoadingModules(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    setSubmitting(true);
    await onSubmit(formData);
    setSubmitting(false);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      project_id: '',
      module_id: '',
      priority: 'medium',
      is_public: false,
      due_date: '',
      assignee_ids: currentUserId ? [currentUserId] : []
    });
  };

  const toggleAssignee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(userId)
        ? prev.assignee_ids.filter(id => id !== userId)
        : [...prev.assignee_ids, userId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">创建新任务</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              任务标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="输入任务标题"
              required
            />
          </div>

          {/* Project & Module */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所属项目</label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">选择项目</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">功能模块</label>
              <select
                value={formData.module_id}
                onChange={(e) => setFormData({ ...formData, module_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                disabled={!formData.project_id || loadingModules}
              >
                <option value="">{loadingModules ? '加载中...' : '选择模块'}</option>
                {modules.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskFormData['priority'] })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full border rounded-lg px-3 py-2 resize-none"
              placeholder="输入任务描述"
            />
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">负责人</label>
            <div className="flex flex-wrap gap-2">
              {users.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleAssignee(user.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    formData.assignee_ids.includes(user.id)
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-500'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-medium">
                    {user.full_name?.charAt(0) || '?'}
                  </div>
                  {user.full_name}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <label htmlFor="is_public" className="text-sm text-gray-700">
              公开任务（所有项目成员可见）
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.title.trim() || submitting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            创建任务
          </button>
        </div>
      </div>
    </div>
  );
}
