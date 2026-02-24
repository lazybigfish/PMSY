import React, { useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { GanttTask, GanttViewMode } from '../../types/gantt';
import { STATUS_COLORS, PRIORITY_LABELS, STATUS_LABELS } from '../../types/gantt';
import { Avatar } from '../../components/Avatar';

interface GanttTaskBarProps {
  task: GanttTask;
  position: { left: number; width: number };
  columnWidth: number;
  viewMode: GanttViewMode;
  onClick?: (task: GanttTask) => void;
}

export function GanttTaskBar({
  task,
  position,
  columnWidth,
  viewMode,
  onClick,
}: GanttTaskBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
  const isOverdue = task.endDate && new Date(task.endDate) < new Date() && task.status !== 'done' && task.status !== 'canceled';
  
  const barColor = isOverdue ? '#ef4444' : statusColor;

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return format(date, 'MM/dd', { locale: zhCN });
  };

  const firstAssignee = task.assignees?.[0];

  return (
    <div
      className="absolute h-8 rounded-md cursor-pointer transition-all hover:shadow-md"
      style={{
        left: position.left + 8,
        width: position.width - 16,
        backgroundColor: barColor,
        top: '8px',
      }}
      onClick={() => onClick?.(task)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className="h-full rounded-md overflow-hidden"
        style={{ width: `${task.progress}%`, backgroundColor: 'rgba(255,255,255,0.3)' }}
      />

      <div className="absolute inset-0 flex items-center justify-between px-2">
        <span className="text-white text-xs font-medium truncate drop-shadow-sm">
          {task.title}
        </span>
        {firstAssignee?.user && (
          <Avatar
            avatarUrl={firstAssignee.user.avatar_url || undefined}
            name={firstAssignee.user.full_name || '用户'}
            size="xs"
            className="w-5 h-5"
          />
        )}
      </div>

      {isOverdue && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}

      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-2">
            {task.title}
          </h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">状态</span>
              <span className="text-gray-900 dark:text-gray-100">{STATUS_LABELS[task.status]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">优先级</span>
              <span className="text-gray-900 dark:text-gray-100">{PRIORITY_LABELS[task.priority]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">开始</span>
              <span className="text-gray-900 dark:text-gray-100">{formatDate(task.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">截止</span>
              <span className={isOverdue ? 'text-red-500 font-medium' : 'text-gray-900 dark:text-gray-100'}>
                {formatDate(task.endDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">进度</span>
              <span className="text-gray-900 dark:text-gray-100">{task.progress}%</span>
            </div>
            {task.assignees && task.assignees.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">负责人</span>
                <div className="flex items-center gap-1">
                  {task.assignees.slice(0, 3).map((a) => (
                    <span key={a.user_id} className="text-gray-900 dark:text-gray-100">
                      {a.user?.full_name || '未知'}
                    </span>
                  ))}
                  {task.assignees.length > 3 && (
                    <span className="text-gray-500">+{task.assignees.length - 3}</span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700" />
        </div>
      )}
    </div>
  );
}

export default GanttTaskBar;
