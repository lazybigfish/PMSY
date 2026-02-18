import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { Task } from '../../../types';

interface MyTasksProps {
  tasks: Task[];
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

export function MyTasks({ tasks }: MyTasksProps) {
  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by priority (urgent > high > medium > low)
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
  }).slice(0, 5);

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow border border-dark-100 dark:border-dark-700">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-dark-100 dark:border-dark-700">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-dark-100">我的任务</h2>
        <Link to="/tasks" className="text-xs sm:text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1 min-h-touch">
          查看全部
          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
        </Link>
      </div>

      <div className="divide-y divide-dark-100 dark:divide-dark-700">
        {sortedTasks.map((task) => (
          <Link
            key={task.id}
            to={`/tasks/${task.id}`}
            className="block p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors min-h-touch"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 dark:text-dark-100 truncate">{task.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-dark-400">
                  <span className={`px-2 py-0.5 rounded-full ${priorityColors[task.priority || 'medium']}`}>
                    {priorityLabels[task.priority || 'medium']}
                  </span>
                  {task.due_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(task.due_date).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}

        {sortedTasks.length === 0 && (
          <div className="p-6 sm:p-8 text-center text-gray-500 dark:text-dark-400">
            <p className="text-sm">暂无任务</p>
          </div>
        )}
      </div>
    </div>
  );
}
