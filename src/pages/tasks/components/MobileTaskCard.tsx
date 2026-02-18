import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Square, Eye, EyeOff, Trash2, AlertCircle, Clock } from 'lucide-react';
import { TaskWithDetails } from './TaskTable';
import { Avatar } from '../../../components/Avatar';

interface MobileTaskCardProps {
  task: TaskWithDetails;
  isSelected: boolean;
  onSelect: (taskId: string, isSelected: boolean) => void;
  onUpdateStatus: (taskId: string, status: string) => void;
  onDelete: (taskId: string) => void;
}

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急'
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700'
};

const statusLabels: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  canceled: '已取消'
};

// 判断任务是否即将到期（3天内）
const isDueSoon = (task: TaskWithDetails): boolean => {
  if (!task.due_date || task.status === 'done') return false;
  const due = new Date(task.due_date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(now.getDate() + 3);
  threeDaysLater.setHours(23, 59, 59, 999);
  return due >= now && due <= threeDaysLater;
};

// 判断任务是否已超期
const isOverdue = (task: TaskWithDetails): boolean => {
  if (!task.due_date || task.status === 'done') return false;
  const due = new Date(task.due_date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return due < now;
};

export function MobileTaskCard({
  task,
  isSelected,
  onSelect,
  onUpdateStatus,
  onDelete
}: MobileTaskCardProps) {
  const navigate = useNavigate();

  const getCardClass = () => {
    const baseClass = 'bg-white dark:bg-dark-800 rounded-lg border p-3 transition-all ';
    if (isOverdue(task)) {
      return baseClass + 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-900/10';
    }
    if (isDueSoon(task)) {
      return baseClass + 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/30 dark:bg-yellow-900/10';
    }
    return baseClass + 'border-dark-100 dark:border-dark-700';
  };

  return (
    <div className={getCardClass()}>
      {/* 头部：选择框 + 标题 + 删除按钮 */}
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(task.id, !isSelected);
          }}
          className="text-dark-400 hover:text-dark-600 transition-colors mt-0.5"
        >
          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
        </button>
        
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => navigate(`/tasks/${task.id}`)}
        >
          <div className="flex items-center gap-1.5">
            {task.is_public ? <Eye className="w-3.5 h-3.5 text-mint-500 flex-shrink-0" /> : <EyeOff className="w-3.5 h-3.5 text-dark-400 flex-shrink-0" />}
            <h3 className="font-medium text-dark-900 dark:text-dark-100 text-sm line-clamp-1">{task.title}</h3>
          </div>
          {task.project?.name && (
            <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">{task.project.name}</p>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="text-dark-400 hover:text-red-500 transition-colors p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 中间：优先级、状态、截止日期 */}
      <div className="flex flex-wrap items-center gap-2 mt-2 pl-7">
        <span className={`px-2 py-0.5 rounded-full text-xs ${priorityColors[task.priority || 'medium']}`}>
          {priorityLabels[task.priority || 'medium']}
        </span>
        
        <select
          value={task.status}
          onChange={(e) => onUpdateStatus(task.id, e.target.value)}
          className="py-0.5 px-2 text-xs border border-dark-200 dark:border-dark-600 rounded bg-white dark:bg-dark-700 text-dark-700 dark:text-dark-300"
        >
          <option value="todo">待办</option>
          <option value="in_progress">进行中</option>
          <option value="done">已完成</option>
          <option value="canceled">已取消</option>
        </select>

        {task.due_date && (
          <span className={`text-xs flex items-center gap-1 ${isOverdue(task) ? 'text-red-600 font-medium' : isDueSoon(task) ? 'text-yellow-700' : 'text-dark-500'}`}>
            {isOverdue(task) && <AlertCircle className="w-3 h-3" />}
            {isDueSoon(task) && !isOverdue(task) && <Clock className="w-3 h-3" />}
            {new Date(task.due_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* 底部：责任人 + 处理人 */}
      <div className="flex items-center justify-between mt-2 pl-7">
        <div className="flex items-center gap-3">
          {task.creator && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-dark-400">责:</span>
              <Avatar userId={task.creator.id} size="xs" />
            </div>
          )}
          {task.assignees && task.assignees.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-dark-400">处:</span>
              <div className="flex -space-x-1">
                {task.assignees.slice(0, 2).map((assignee) => (
                  <Avatar key={assignee.user_id} userId={assignee.user_id} size="xs" />
                ))}
                {task.assignees.length > 2 && (
                  <span className="w-5 h-5 rounded-full bg-dark-200 dark:bg-dark-600 flex items-center justify-center text-xs text-dark-600 dark:text-dark-400">
                    +{task.assignees.length - 2}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
