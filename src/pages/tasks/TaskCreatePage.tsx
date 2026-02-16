import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Flag, Users, User, FolderOpen, Box, FileText, Globe } from 'lucide-react';
import { projectService, userService, taskService } from '../../services';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContextNew';
import { Profile, Project, ProjectModule } from '../../types';
import { DatePicker } from '../../components/DatePicker';

interface TaskFormData {
  title: string;
  description: string;
  project_id: string;
  module_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_public: boolean;
  due_date: string;
  creator_id: string;
  assignee_ids: string[];
}

export default function TaskCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [modules, setModules] = useState<ProjectModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    project_id: '',
    module_id: '',
    priority: 'medium',
    is_public: false,
    due_date: '',
    creator_id: user?.id || '',
    assignee_ids: user?.id ? [user.id] : []
  });

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (formData.project_id) {
      fetchModules(formData.project_id);
    } else {
      setModules([]);
      setFormData(prev => ({ ...prev, module_id: '' }));
    }
  }, [formData.project_id]);

  const fetchProjects = async () => {
    try {
      const data = await projectService.getProjects();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await userService.getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchModules = async (projectId: string) => {
    setLoadingModules(true);
    try {
      const data = await projectService.getProjectModules(projectId);
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoadingModules(false);
    }
  };

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
      const indent = '\u00A0\u00A0'.repeat(level);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.project_id || !user) return;

    setSubmitting(true);
    try {
      // 排序处理人，责任人排在第一位
      const creatorId = formData.creator_id;
      const sortedAssigneeIds = [...formData.assignee_ids].sort((a, b) => {
        if (a === creatorId) return -1;
        if (b === creatorId) return 1;
        return 0;
      });

      // 使用 taskService 创建任务（包含处理人）
      const task = await taskService.createTask({
        title: formData.title,
        description: formData.description,
        project_id: formData.project_id,
        priority: formData.priority,
        is_public: formData.is_public,
        due_date: formData.due_date || null,
        created_by: formData.creator_id,
        owner_id: formData.creator_id,
        status: 'todo',
        assignee_ids: sortedAssigneeIds,
        module_ids: formData.module_id ? [formData.module_id] : undefined
      });

      navigate(`/tasks/${task.id}`);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('创建任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAssignee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(userId)
        ? prev.assignee_ids.filter(id => id !== userId)
        : [...prev.assignee_ids, userId]
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return '紧急';
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '中';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const isValid = formData.title.trim() && formData.project_id && formData.creator_id && formData.assignee_ids.length > 0 && formData.due_date;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/tasks')}
          className="p-2 hover:bg-dark-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-dark-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-dark-900">创建新任务</h1>
          <p className="text-sm text-dark-500 mt-1">填写任务信息，分配给团队成员</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 第一行：任务标题 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-dark-100">
          <label className="block text-sm font-medium text-dark-700 mb-2">
            <FileText className="w-4 h-4 inline mr-2" />
            任务标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input w-full text-lg"
            placeholder="输入任务标题，简明扼要地描述任务内容"
            required
          />
        </div>

        {/* 两列布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左列 */}
          <div className="space-y-6">
            {/* 项目信息 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-dark-100">
              <h3 className="text-sm font-semibold text-dark-900 mb-4 flex items-center">
                <FolderOpen className="w-4 h-4 mr-2 text-primary-500" />
                项目信息
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    所属项目 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="input w-full"
                    required
                  >
                    <option value="">选择项目</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">功能模块</label>
                  <select
                    value={formData.module_id}
                    onChange={(e) => setFormData({ ...formData, module_id: e.target.value })}
                    className="input w-full"
                    disabled={!formData.project_id || loadingModules}
                  >
                    <option value="">{loadingModules ? '加载中...' : '选择模块（可选）'}</option>
                    {renderModuleOptions(buildModuleHierarchy(modules))}
                  </select>
                </div>
              </div>
            </div>

            {/* 优先级 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-dark-100">
              <h3 className="text-sm font-semibold text-dark-900 mb-4 flex items-center">
                <Flag className="w-4 h-4 mr-2 text-primary-500" />
                优先级
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority })}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border-2 transition-all ${
                      formData.priority === priority
                        ? getPriorityColor(priority)
                        : 'bg-white border-dark-200 text-dark-600 hover:border-dark-300'
                    }`}
                  >
                    {getPriorityLabel(priority)}
                  </button>
                ))}
              </div>
            </div>

            {/* 任务描述 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-dark-100">
              <h3 className="text-sm font-semibold text-dark-900 mb-4 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-primary-500" />
                任务描述
              </h3>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="input w-full resize-none"
                placeholder="详细描述任务内容、目标和注意事项..."
              />
            </div>
          </div>

          {/* 右列 */}
          <div className="space-y-6">
            {/* 人员配置 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-dark-100">
              <h3 className="text-sm font-semibold text-dark-900 mb-4 flex items-center">
                <Users className="w-4 h-4 mr-2 text-primary-500" />
                人员配置
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    责任人 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.creator_id}
                    onChange={(e) => setFormData({ ...formData, creator_id: e.target.value })}
                    className="input w-full"
                    required
                  >
                    <option value="">选择责任人</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} {u.id === user?.id ? '(我)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-dark-500 mt-1">默认为当前登录用户，可更改</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    处理人 <span className="text-red-500">*</span>
                    <span className="text-xs font-normal text-dark-500 ml-2">至少选择一人</span>
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-dark-50 rounded-xl">
                    {users.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleAssignee(u.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                          formData.assignee_ids.includes(u.id)
                            ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                            : 'bg-white text-dark-700 border-2 border-dark-200 hover:border-dark-300'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-xs font-bold text-white">
                          {u.full_name?.charAt(0) || '?'}
                        </div>
                        {u.full_name}
                        {u.id === user?.id && <span className="text-xs opacity-70">(我)</span>}
                      </button>
                    ))}
                  </div>
                  {formData.assignee_ids.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">请至少选择一名处理人</p>
                  )}
                </div>
              </div>
            </div>

            {/* 其他设置 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-dark-100">
              <h3 className="text-sm font-semibold text-dark-900 mb-4 flex items-center">
                <Box className="w-4 h-4 mr-2 text-primary-500" />
                其他设置
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    截止日期 <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={formData.due_date}
                    onChange={(date) => setFormData({ ...formData, due_date: date })}
                    placeholder="选择截止日期"
                    required
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-dark-50 rounded-xl">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-5 h-5 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="is_public" className="flex items-center gap-2 text-sm text-dark-700 cursor-pointer">
                    <Globe className="w-4 h-4 text-dark-400" />
                    <span>公开任务（所有项目成员可见）</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-4 pt-6 border-t border-dark-100">
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="btn-secondary px-8"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                创建中...
              </>
            ) : (
              '创建任务'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
