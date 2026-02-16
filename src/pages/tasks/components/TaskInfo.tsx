import React, { useState } from 'react';
import { Calendar, Edit2, X, Check, XCircle } from 'lucide-react';
import { Task, Profile, Project, ProjectModule } from '../../../types';
import { Avatar } from '../../../components/Avatar';

interface TaskModule {
  module_id: string;
}

interface TaskWithRelations extends Task {
  project?: Project;
  assignees?: { user_id: string; is_primary: boolean; user: Profile }[];
  creator?: Profile;
  owner?: Profile;
  task_modules?: TaskModule[];
}

interface TaskInfoProps {
  task: TaskWithRelations;
  availableModules: ProjectModule[];
  allUsers: Profile[];
  canEdit: boolean;
  canUpdateStatus: boolean;
  onStatusChange: (status: string) => void;
  onAddAssignee: (userId: string) => void;
  onRemoveAssignee: (userId: string) => void;
  onUpdateModules: (moduleIds: string[]) => void;
  onRemoveModule?: (moduleId: string, moduleName: string) => void;
}

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急'
};

const priorityColors: Record<string, string> = {
  low: 'badge-mint',
  medium: 'badge-sun',
  high: 'badge-primary',
  urgent: 'bg-red-100 text-red-700'
};

// 模块树节点类型
type ModuleNode = ProjectModule & { children: ModuleNode[] };

// 构建模块树结构
const buildModuleTree = (modules: ProjectModule[]): ModuleNode[] => {
  const moduleMap = new Map<string, ModuleNode>();

  // 首先创建所有模块的映射
  modules.forEach(module => {
    moduleMap.set(module.id, { ...module, children: [] });
  });

  const rootModules: ModuleNode[] = [];

  // 构建父子关系
  modules.forEach(module => {
    const moduleWithChildren = moduleMap.get(module.id)!;
    if (module.parent_id && moduleMap.has(module.parent_id)) {
      const parent = moduleMap.get(module.parent_id)!;
      parent.children.push(moduleWithChildren);
    } else {
      rootModules.push(moduleWithChildren);
    }
  });

  return rootModules;
};

// 渲染模块树
const renderModuleTree = (
  modules: ModuleNode[],
  selectedModuleIds: string[],
  onToggle: (moduleId: string) => void,
  level = 0
): React.ReactNode[] => {
  const result: React.ReactNode[] = [];
  
  modules.forEach(module => {
    const isSelected = selectedModuleIds.includes(module.id);
    const hasChildren = module.children.length > 0;
    
    result.push(
      <div
        key={module.id}
        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
          isSelected ? 'bg-primary-50 text-primary-700' : 'hover:bg-dark-50'
        }`}
        style={{ paddingLeft: `${12 + level * 20}px` }}
        onClick={() => onToggle(module.id)}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(module.id)}
          className="w-4 h-4 rounded border-dark-300 text-primary-500 focus:ring-primary-400"
          onClick={(e) => e.stopPropagation()}
        />
        <span className="text-sm font-medium">{module.name}</span>
        {hasChildren && (
          <span className="text-xs text-dark-400 ml-auto">
            {module.children.length} 个子模块
          </span>
        )}
      </div>
    );
    
    if (hasChildren) {
      result.push(...renderModuleTree(module.children, selectedModuleIds, onToggle, level + 1));
    }
  });
  
  return result;
};

export function TaskInfo({
  task,
  availableModules,
  allUsers,
  canEdit,
  canUpdateStatus,
  onStatusChange,
  onAddAssignee,
  onRemoveAssignee,
  onUpdateModules,
  onRemoveModule
}: TaskInfoProps) {
  const [isEditingModules, setIsEditingModules] = useState(false);
  const [tempSelectedModules, setTempSelectedModules] = useState<string[]>(
    task.task_modules?.map(tm => tm.module_id) || []
  );

  // 获取已关联的模块
  const associatedModules = availableModules.filter(module =>
    task.task_modules?.some(tm => tm.module_id === module.id)
  );

  const handleToggleModule = (moduleId: string) => {
    setTempSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSaveModules = () => {
    onUpdateModules(tempSelectedModules);
    setIsEditingModules(false);
  };

  const handleCancelEdit = () => {
    setTempSelectedModules(task.task_modules?.map(tm => tm.module_id) || []);
    setIsEditingModules(false);
  };

  const moduleTree = buildModuleTree(availableModules);

  return (
    <div className="space-y-6">
      {/* Status & Priority */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-2">状态</label>
          <select
            value={task.status}
            onChange={(e) => onStatusChange(e.target.value)}
            disabled={!canUpdateStatus}
            className="w-32"
          >
            <option value="todo">待办</option>
            <option value="in_progress">进行中</option>
            <option value="done">已完成</option>
            <option value="canceled">已取消</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-2">优先级</label>
          <span className={`badge ${priorityColors[task.priority || 'medium']}`}>
            {priorityLabels[task.priority || 'medium']}
          </span>
        </div>
      </div>

      {/* Owner (责任人) */}
      <div>
        <label className="block text-sm font-medium text-dark-700 mb-2">责任人</label>
        <div className="flex items-center gap-2">
          <Avatar
            userId={task.creator?.id}
            avatarUrl={task.creator?.avatar_url}
            name={task.creator?.full_name}
            size="xs"
            className="flex-shrink-0"
          />
          <span className="text-sm font-medium text-dark-900">{task.creator?.full_name || '未知'}</span>
          <span className="text-xs text-dark-400">(任务创建者)</span>
        </div>
      </div>

      {/* Assignees (处理人) */}
      <div>
        <label className="block text-sm font-medium text-dark-700 mb-2">处理人</label>
        <div className="flex flex-wrap gap-2">
          {task.assignees?.map((assignee) => (
            <div
              key={assignee.user_id}
              className="flex items-center gap-2 bg-violet-100 rounded-full pl-1 pr-3 py-1"
            >
              <Avatar
                userId={assignee.user?.id}
                avatarUrl={assignee.user?.avatar_url}
                name={assignee.user?.full_name}
                size="xs"
              />
              <span className="text-sm font-medium text-dark-900">{assignee.user?.full_name}</span>
              {assignee.is_primary && (
                <span className="text-xs text-violet-600 font-semibold">(主)</span>
              )}
              {canEdit && (
                <button
                  onClick={() => onRemoveAssignee(assignee.user_id)}
                  className="text-dark-400 hover:text-red-600 ml-1 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {canEdit && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onAddAssignee(e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-32"
              defaultValue=""
            >
              <option value="" disabled>+ 添加</option>
              {allUsers
                .filter(u => !task.assignees?.some(a => a.user_id === u.id))
                .map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
            </select>
          )}
        </div>
      </div>

      {/* Project */}
      <div>
        <label className="block text-sm font-medium text-dark-700 mb-2">所属项目</label>
        <div className="flex items-center gap-2">
          <span className="text-dark-900 font-medium">{task.project?.name || '未分配'}</span>
        </div>
      </div>

      {/* Associated Modules */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-dark-700">关联模块</label>
          {canEdit && !isEditingModules && associatedModules.length > 0 && (
            <button
              onClick={() => setIsEditingModules(true)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              <Edit2 className="w-3.5 h-3.5" />
              变更
            </button>
          )}
        </div>
        
        {!isEditingModules ? (
          // 显示模式：只显示已关联的模块
          <div className="flex flex-wrap gap-2">
            {associatedModules.length > 0 ? (
              associatedModules.map((module) => (
                <span
                  key={module.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-700"
                >
                  {module.name}
                  {canEdit && onRemoveModule && (
                    <button
                      onClick={() => onRemoveModule(module.id, module.name)}
                      className="ml-1 hover:text-primary-900 focus:outline-none"
                      title="移除关联"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </span>
              ))
            ) : (
              <span className="text-dark-400 text-sm">未关联任何模块</span>
            )}
            {canEdit && (
              <button
                onClick={() => setIsEditingModules(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {associatedModules.length === 0 ? '+ 添加关联' : '+ 管理关联'}
              </button>
            )}
          </div>
        ) : (
          // 编辑模式：显示所有模块供选择
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-dark-100">
              <span className="text-sm font-medium text-dark-700">选择关联模块</span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="p-1.5 text-dark-400 hover:text-dark-600 hover:bg-dark-100 rounded-lg transition-colors"
                  title="取消"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSaveModules}
                  className="p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                  title="保存"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              {renderModuleTree(moduleTree, tempSelectedModules, handleToggleModule)}
            </div>
            <div className="mt-3 pt-3 border-t border-dark-100 text-xs text-dark-400">
              已选择 {tempSelectedModules.length} 个模块
            </div>
          </div>
        )}
      </div>

      {/* Due Date */}
      <div>
        <label className="block text-sm font-medium text-dark-700 mb-2">截止日期</label>
        <div className="flex items-center gap-2 text-dark-600">
          <Calendar className="w-4 h-4" />
          <span>{task.due_date ? new Date(task.due_date).toLocaleDateString('zh-CN') : '未设置'}</span>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-2">任务描述</label>
          <p className="text-dark-700 whitespace-pre-wrap bg-dark-50 rounded-xl p-4">{task.description}</p>
        </div>
      )}
    </div>
  );
}
