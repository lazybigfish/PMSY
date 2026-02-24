import React, { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Profile, Project, ProjectModule } from '../../../types';
import { ModalForm } from '../../../components/Modal';
import { DatePicker } from '../../../components/DatePicker';
import { Avatar } from '../../../components/Avatar';

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
  creator_id: string;
  assignee_ids: string[];
  dependency_task_ids: string[];
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
    creator_id: currentUserId || '',
    assignee_ids: currentUserId ? [currentUserId] : [],
    dependency_task_ids: []
  });
  const [modules, setModules] = useState<ProjectModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableDependencies, setAvailableDependencies] = useState<any[]>([]);
  const [loadingDependencies, setLoadingDependencies] = useState(false);

  const buildModuleHierarchy = (modules: ProjectModule[]): ProjectModule[] => {
    const moduleMap = new Map<string, ProjectModule>();
    const rootModules: ProjectModule[] = [];
    
    modules.forEach(m => {
      moduleMap.set(m.id, { ...m, children: [] });
    });
    
    modules.forEach(m => {
      const module = moduleMap.get(m.id)!;
      if (m.parent_id && moduleMap.has(m.parent_id)) {
        const parent = moduleMap.get(m.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(module);
      } else {
        rootModules.push(module);
      }
    });
    
    return rootModules;
  };

  const renderModuleOptions = (modules: ProjectModule[], level: number = 0): JSX.Element[] => {
    const options: JSX.Element[] = [];
    
    modules.forEach(m => {
      const indent = '  '.repeat(level);
      const prefix = level > 0 ? '└─ ' : '';
      options.push(
        <option key={m.id} value={m.id}>
          {indent}{prefix}{m.name}
        </option>
      );
      
      if (m.children && m.children.length > 0) {
        options.push(...renderModuleOptions(m.children, level + 1));
      }
    });
    
    return options;
  };

  useEffect(() => {
    if (formData.project_id) {
      fetchModules(formData.project_id);
      fetchAvailableDependencies(formData.project_id);
    } else {
      setModules([]);
      setFormData(prev => ({ ...prev, module_id: '' }));
    }
  }, [formData.project_id]);

  const fetchModules = async (projectId: string) => {
    setLoadingModules(true);
    try {
      const { api } = await import('../../../lib/api');
      const { data } = await api.db
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

  const fetchAvailableDependencies = async (projectId: string) => {
    if (!projectId) {
      setAvailableDependencies([]);
      return;
    }
    setLoadingDependencies(true);
    try {
      const { api } = await import('../../../lib/api');
      const { data } = await api.db
        .from('tasks')
        .select('id, title, status, priority, due_date')
        .eq('project_id', projectId)
        .neq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(50);
      setAvailableDependencies(data || []);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
    } finally {
      setLoadingDependencies(false);
    }
  };

  const toggleDependency = (taskId: string) => {
    setFormData(prev => ({
      ...prev,
      dependency_task_ids: prev.dependency_task_ids.includes(taskId)
        ? prev.dependency_task_ids.filter(id => id !== taskId)
        : [...prev.dependency_task_ids, taskId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    setSubmitting(true);
    await onSubmit(formData);
    setSubmitting(false);
    
    setFormData({
      title: '',
      description: '',
      project_id: '',
      module_id: '',
      priority: 'medium',
      is_public: false,
      due_date: '',
      creator_id: currentUserId || '',
      assignee_ids: currentUserId ? [currentUserId] : [],
      dependency_task_ids: []
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

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="创建新任务"
      maxWidth="2xl"
      submitText="创建任务"
      isSubmitting={submitting}
      submitDisabled={!formData.title.trim() || !formData.creator_id || formData.assignee_ids.length === 0 || !formData.due_date}
    >
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1">
            任务标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input w-full"
            placeholder="输入任务标题"
            required
          />
        </div>

        {/* Project & Module */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">所属项目</label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="input w-full"
            >
              <option value="">选择项目</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">功能模块</label>
            <select
              value={formData.module_id}
              onChange={(e) => setFormData({ ...formData, module_id: e.target.value })}
              className="input w-full"
              disabled={!formData.project_id || loadingModules}
            >
              <option value="">{loadingModules ? '加载中...' : '选择模块'}</option>
              {renderModuleOptions(buildModuleHierarchy(modules))}
            </select>
          </div>
        </div>

        {/* Priority & Due Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">优先级</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskFormData['priority'] })}
              className="input w-full"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="urgent">紧急</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              截止日期 <span className="text-red-500">*</span>
            </label>
            <DatePicker
              value={formData.due_date}
              onChange={(date) => setFormData({ ...formData, due_date: date })}
              placeholder="选择截止日期"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1">任务描述</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="input w-full resize-none"
            placeholder="输入任务描述"
          />
        </div>

        {/* Creator */}
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-2">
            责任人 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.creator_id}
            onChange={(e) => setFormData({ ...formData, creator_id: e.target.value })}
            className="input w-full"
            required
          >
            <option value="">选择责任人</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.full_name} {user.id === currentUserId ? '(我)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-dark-500 mt-1">默认为当前登录用户，可更改</p>
        </div>

        {/* Assignees */}
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-2">
            处理人 <span className="text-red-500">*</span>
            <span className="text-xs font-normal text-dark-500 ml-2">至少选择一人</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {users.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => toggleAssignee(user.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  formData.assignee_ids.includes(user.id)
                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                    : 'bg-dark-100 text-dark-700 border-2 border-transparent hover:bg-dark-200'
                }`}
              >
                <Avatar
                  userId={user.id}
                  avatarUrl={user.avatar_url}
                  name={user.full_name}
                  size="xs"
                />
                {user.full_name}
                {user.id === currentUserId && <span className="text-xs opacity-70">(我)</span>}
              </button>
            ))}
          </div>
          {formData.assignee_ids.length === 0 && (
            <p className="text-xs text-red-500 mt-1">请至少选择一名处理人</p>
          )}
          <p className="text-xs text-dark-500 mt-1">默认已添加当前用户作为处理人</p>
        </div>

        {/* Dependencies */}
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-2">
            前置任务
            <span className="text-xs font-normal text-dark-500 ml-2">设置此任务的前置任务</span>
          </label>
          {formData.project_id ? (
            loadingDependencies ? (
              <p className="text-xs text-dark-400">加载中...</p>
            ) : availableDependencies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableDependencies.map(task => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggleDependency(task.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      formData.dependency_task_ids.includes(task.id)
                        ? 'bg-violet-100 text-violet-700 border-2 border-violet-500'
                        : 'bg-dark-100 text-dark-700 border-2 border-transparent hover:bg-dark-200'
                    }`}
                  >
                    <span className="truncate max-w-[150px]">{task.title}</span>
                    {formData.dependency_task_ids.includes(task.id) && (
                      <span className="text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-dark-400">该项目暂无其他未完成的任务</p>
            )
          ) : (
            <p className="text-xs text-dark-400">请先选择所属项目</p>
          )}
        </div>

        {/* Visibility */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_public"
            checked={formData.is_public}
            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
            className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="is_public" className="text-sm text-dark-700">
            公开任务（所有项目成员可见）
          </label>
        </div>
      </div>
    </ModalForm>
  );
}
