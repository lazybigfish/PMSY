import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Square, Eye, EyeOff, Trash2, ArrowUpDown } from 'lucide-react';
import { Task, Profile, Project } from '../../../types';

interface TaskWithDetails extends Task {
  project?: Project;
  creator?: Profile;  // 责任人（创建者）
  assignees?: { user_id: string; is_primary: boolean; user: Profile }[];
  assignee_profiles?: Profile[];
}

interface TaskTableProps {
  tasks: TaskWithDetails[];
  selectedTasks: Set<string>;
  onSelectTask: (taskId: string, isSelected: boolean) => void;
  onSelectAll: (isSelected: boolean) => void;
  onUpdateStatus: (taskId: string, status: string) => void;
  onDeleteTask: (taskId: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: 'created_at' | 'due_date' | 'priority' | 'completed_at') => void;
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

const statusLabels: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  canceled: '已取消'
};

const statusColors: Record<string, string> = {
  todo: 'badge-dark',
  in_progress: 'badge-primary',
  done: 'badge-mint',
  canceled: 'badge-dark'
};

export function TaskTable({
  tasks,
  selectedTasks,
  onSelectTask,
  onSelectAll,
  onUpdateStatus,
  onDeleteTask,
  sortBy,
  sortOrder,
  onSort
}: TaskTableProps) {
  const navigate = useNavigate();
  const allSelected = tasks.length > 0 && tasks.every(t => selectedTasks.has(t.id));

  const getSortIndicator = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 text-dark-300 ml-1" />;
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full divide-y divide-dark-100">
        <thead className="bg-dark-50">
          <tr>
            <th className="px-4 py-3 w-10">
              <button
                onClick={() => onSelectAll(!allSelected)}
                className="text-dark-400 hover:text-dark-600 transition-colors"
              >
                {allSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              </button>
            </th>
            <th 
              className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider cursor-pointer hover:bg-dark-100 transition-colors"
              onClick={() => onSort('created_at')}
            >
              <div className="flex items-center">
                任务
                {getSortIndicator('created_at')}
              </div>
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider">
              项目
            </th>
            <th 
              className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider cursor-pointer hover:bg-dark-100 transition-colors"
              onClick={() => onSort('priority')}
            >
              <div className="flex items-center">
                优先级
                {getSortIndicator('priority')}
              </div>
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider">
              状态
            </th>
            <th 
              className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider cursor-pointer hover:bg-dark-100 transition-colors"
              onClick={() => onSort('due_date')}
            >
              <div className="flex items-center">
                截止日期
                {getSortIndicator('due_date')}
              </div>
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider">
              责任人
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider">
              处理人
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-dark-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-dark-100">
          {tasks.map((task) => (
            <tr 
              key={task.id} 
              className={`hover:bg-dark-50 transition-colors ${selectedTasks.has(task.id) ? 'bg-primary-50/50' : ''}`}
            >
              <td className="px-4 py-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTask(task.id, !selectedTasks.has(task.id));
                  }}
                  className="text-dark-400 hover:text-dark-600 transition-colors"
                >
                  {selectedTasks.has(task.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>
              </td>
              <td className="px-4 py-3">
                <div 
                  className="cursor-pointer"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <div className="flex items-center gap-2">
                    {task.is_public ? <Eye className="w-4 h-4 text-mint-500" /> : <EyeOff className="w-4 h-4 text-dark-400" />}
                    <span className="font-medium text-dark-900">{task.title}</span>
                  </div>
                  {task.description && (
                    <p className="text-sm text-dark-500 mt-1 line-clamp-1">{task.description}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-dark-600">
                {task.project?.name || '-'}
              </td>
              <td className="px-4 py-3">
                <span className={`badge ${priorityColors[task.priority || 'medium']}`}>
                  {priorityLabels[task.priority || 'medium']}
                </span>
              </td>
              <td className="px-4 py-3">
                <select
                  value={task.status}
                  onChange={(e) => onUpdateStatus(task.id, e.target.value)}
                  className="w-24"
                >
                  <option value="todo">待办</option>
                  <option value="in_progress">进行中</option>
                  <option value="done">已完成</option>
                  <option value="canceled">已取消</option>
                </select>
              </td>
              <td className="px-4 py-3 text-sm text-dark-600">
                {task.due_date ? new Date(task.due_date).toLocaleDateString('zh-CN') : '-'}
              </td>
              <td className="px-4 py-3">
                {/* 责任人 */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white"
                    title={task.creator?.full_name || '未知'}
                  >
                    {task.creator?.full_name?.charAt(0) || '?'}
                  </div>
                  <span className="text-sm text-dark-700">{task.creator?.full_name || '未知'}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                {/* 处理人 */}
                <div className="flex -space-x-2">
                  {task.assignee_profiles?.slice(0, 3).map((profile, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center border-2 border-white text-xs font-bold text-violet-600"
                      title={profile.full_name}
                    >
                      {profile.full_name?.charAt(0) || '?'}
                    </div>
                  ))}
                  {(task.assignee_profiles?.length || 0) > 3 && (
                    <div className="w-8 h-8 rounded-full bg-dark-100 flex items-center justify-center border-2 border-white text-xs text-dark-600">
                      +{task.assignee_profiles!.length - 3}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定要删除这个任务吗？')) {
                      onDeleteTask(task.id);
                    }
                  }}
                  className="text-dark-400 hover:text-red-600 p-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-12 text-center text-dark-500">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-dark-100 flex items-center justify-center mb-4">
                    <CheckSquare className="h-8 w-8 text-dark-400" />
                  </div>
                  暂无任务
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
