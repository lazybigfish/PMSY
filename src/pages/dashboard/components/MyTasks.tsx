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
    <div className="bg-white rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">我的任务</h2>
        <Link to="/tasks" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
          查看全部
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y">
        {sortedTasks.map((task) => (
          <Link
            key={task.id}
            to={`/tasks/${task.id}`}
            className="block p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">{task.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
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
          <div className="p-8 text-center text-gray-500">
            <p>暂无任务</p>
          </div>
        )}
      </div>
    </div>
  );
}
