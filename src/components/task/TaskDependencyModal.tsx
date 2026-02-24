import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { taskService } from '../../services/taskService';
import { useTheme } from '../../context/ThemeContext';
import { Search, X, Link2, AlertCircle } from 'lucide-react';
import type { AvailableDependencyTask, DependencyType, TaskDependenciesResponse } from '../../types/task';

interface TaskDependencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  onSuccess?: () => void;
}

const dependencyTypeLabels: Record<DependencyType, string> = {
  FS: '完成→开始',
  SS: '开始→开始',
  FF: '完成→完成',
  SF: '开始→完成',
};

const statusLabels: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  paused: '已暂停',
  done: '已完成',
  canceled: '已取消',
};

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

export function TaskDependencyModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  onSuccess,
}: TaskDependencyModalProps) {
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dependencies, setDependencies] = useState<TaskDependenciesResponse | null>(null);
  const [availableTasks, setAvailableTasks] = useState<AvailableDependencyTask[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTask, setSelectedTask] = useState<AvailableDependencyTask | null>(null);
  const [dependencyType, setDependencyType] = useState<DependencyType>('FS');

  useEffect(() => {
    if (isOpen && taskId) {
      fetchDependencies();
      fetchAvailableTasks();
    }
  }, [isOpen, taskId]);

  const fetchDependencies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskService.getTaskDependencies(taskId);
      setDependencies(data || { dependencies: [], dependents: [] });
    } catch (err) {
      console.error('Failed to fetch dependencies:', err);
      setDependencies({ dependencies: [], dependents: [] });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTasks = async () => {
    try {
      const tasks = await taskService.getAvailableDependencies(taskId);
      setAvailableTasks(tasks || []);
    } catch (err) {
      console.error('Failed to fetch available tasks:', err);
      setAvailableTasks([]);
    }
  };

  const handleAddDependency = async () => {
    if (!selectedTask) return;

    setSaving(true);
    setError(null);
    try {
      await taskService.addTaskDependency(taskId, {
        depends_on_task_id: selectedTask.id,
        dependency_type: dependencyType,
      });
      await fetchDependencies();
      await fetchAvailableTasks();
      setSelectedTask(null);
      setDependencyType('FS');
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '添加依赖失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    try {
      await taskService.removeTaskDependency(taskId, dependencyId);
      await fetchDependencies();
      await fetchAvailableTasks();
      onSuccess?.();
    } catch (err) {
      console.error('Failed to remove dependency:', err);
    }
  };

  const filteredTasks = availableTasks.filter((task) =>
    task.title.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'paused':
        return 'text-yellow-600';
      case 'canceled':
        return 'text-gray-500';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="任务依赖管理" maxWidth="lg">
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            当前任务：<span className="font-medium text-gray-900 dark:text-gray-100">{taskTitle}</span>
          </p>
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            添加依赖
          </h4>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索任务..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {filteredTasks.length > 0 ? (
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedTask?.id === task.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={getStatusColor(task.status)}>{statusLabels[task.status]}</span>
                        {task.due_date && (
                          <span className="text-gray-400">
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm">
                {searchKeyword ? '没有找到匹配的任务' : '没有可添加的任务'}
              </div>
            )}

            {selectedTask && (
              <div className="mt-3">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  依赖类型
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(dependencyTypeLabels) as DependencyType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setDependencyType(type)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        dependencyType === type
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {dependencyTypeLabels[type]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedTask && (
              <button
                onClick={handleAddDependency}
                disabled={saving || !selectedTask}
                className="w-full mt-3 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {saving ? '添加中...' : '添加依赖'}
              </button>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            前置任务（{dependencies?.dependencies?.length || 0}）
          </h4>
          {loading ? (
            <div className="text-center py-4 text-gray-400">加载中...</div>
          ) : dependencies?.dependencies?.length > 0 ? (
            <div className="space-y-2">
              {dependencies.dependencies.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {dep.depends_on_title || '未知任务'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${getStatusColor(dep.depends_on_status || '')}`}>
                        {statusLabels[dep.depends_on_status || '']}
                      </span>
                      <span className="text-xs text-gray-400">
                        {dependencyTypeLabels[dep.dependency_type as DependencyType]}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDependency(dep.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm">
              暂无前置任务
            </div>
          )}
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            后续任务（{dependencies?.dependents?.length || 0}）
          </h4>
          {dependencies?.dependents?.length > 0 ? (
            <div className="space-y-2">
              {dependencies.dependents.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {dep.dependent_title || '未知任务'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${getStatusColor(dep.dependent_status)}`}>
                        {statusLabels[dep.dependent_status]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {dependencyTypeLabels[dep.dependency_type as DependencyType]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm">
              暂无后续任务
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default TaskDependencyModal;
