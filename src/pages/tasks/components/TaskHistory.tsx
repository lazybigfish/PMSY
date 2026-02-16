import React, { useEffect, useState } from 'react';
import { History, User, Calendar, ArrowRight } from 'lucide-react';
import { TaskHistory as TaskHistoryType } from '../../../types';
import { getTaskHistory } from '../../../services/taskService';
import { Loader2 } from 'lucide-react';
import { Avatar } from '../../../components/Avatar';

interface TaskHistoryProps {
  taskId: string;
}

// 字段名称映射
const fieldNameMap: Record<string, string> = {
  title: '标题',
  status: '状态',
  priority: '优先级',
  due_date: '截止日期',
  start_date: '开始日期',
  description: '描述',
  progress: '进度',
  assignees: '处理人',
};

// 状态值映射
const statusValueMap: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  paused: '已暂停',
  done: '已完成',
  canceled: '已取消',
};

// 优先级值映射
const priorityValueMap: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

// 格式化字段值
const formatFieldValue = (fieldName: string, value: string | null): string => {
  if (value === null || value === '空') return '空';

  switch (fieldName) {
    case 'status':
      return statusValueMap[value] || value;
    case 'priority':
      return priorityValueMap[value] || value;
    case 'due_date':
    case 'start_date':
      return value ? new Date(value).toLocaleDateString('zh-CN') : '空';
    default:
      return value;
  }
};

// 获取字段变更图标颜色
const getFieldColor = (fieldName: string): string => {
  const colorMap: Record<string, string> = {
    title: 'bg-blue-100 text-blue-600',
    status: 'bg-primary-100 text-primary-600',
    priority: 'bg-orange-100 text-orange-600',
    due_date: 'bg-red-100 text-red-600',
    start_date: 'bg-green-100 text-green-600',
    description: 'bg-purple-100 text-purple-600',
    progress: 'bg-cyan-100 text-cyan-600',
    assignees: 'bg-violet-100 text-violet-600',
  };
  return colorMap[fieldName] || 'bg-dark-100 text-dark-600';
};

export const TaskHistory: React.FC<TaskHistoryProps> = ({ taskId }) => {
  const [history, setHistory] = useState<TaskHistoryType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [taskId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getTaskHistory(taskId);
      setHistory(data);
    } catch (error) {
      console.error('加载任务历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-dark-50 flex items-center justify-center mx-auto mb-4">
          <History className="w-8 h-8 text-dark-300" />
        </div>
        <p className="text-dark-500">暂无历史记录</p>
        <p className="text-sm text-dark-400 mt-1">任务的变更将自动记录在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((record) => (
        <div
          key={record.id}
          className="flex gap-4 p-4 bg-white rounded-xl border border-dark-100 hover:border-dark-200 transition-colors"
        >
          {/* 用户头像 */}
          <div className="flex-shrink-0">
            {record.creator ? (
              <Avatar
                userId={record.creator.id}
                avatarUrl={record.creator.avatar_url}
                name={record.creator.full_name}
                email={record.creator.email}
                size="md"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-dark-100 flex items-center justify-center">
                <User className="w-5 h-5 text-dark-400" />
              </div>
            )}
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            {/* 头部：用户和时间 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-dark-900">
                {record.creator?.full_name || '系统'}
              </span>
              <span className="text-dark-400">·</span>
              <span className="text-sm text-dark-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(record.created_at).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* 变更描述 */}
            <div className="flex items-start gap-2">
              {/* 字段标签 */}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getFieldColor(
                  record.field_name
                )}`}
              >
                {fieldNameMap[record.field_name] || record.field_name}
              </span>

              {/* 变更内容 */}
              <div className="flex-1">
                {record.description ? (
                  <p className="text-dark-700">{record.description}</p>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-dark-500 line-through">
                      {formatFieldValue(record.field_name, record.old_value)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-dark-400" />
                    <span className="text-dark-900 font-medium">
                      {formatFieldValue(record.field_name, record.new_value)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
