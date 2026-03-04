/**
 * 优化与反馈 - 反馈列表页
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useFeedbackList, useFeedbackStats } from '../../hooks/useFeedback';
import { FeedbackSubmitModal } from './components/FeedbackSubmitModal';
import {
  FeedbackStatus,
  FeedbackType,
  FeedbackStatusConfig,
  FeedbackTypeLabels,
} from '../../types/feedback';

export function FeedbackTab() {
  const navigate = useNavigate();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | ''>('');

  const { feedbackList, total, loading, refresh } = useFeedbackList({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  });
  const { stats, refresh: refreshStats } = useFeedbackStats();

  // 排序：进行中的在前，已完成/拒绝的在后
  const sortedFeedbackList = useMemo(() => {
    const processingStatuses = ['pending', 'accepted', 'developing', 'testing'];
    const completedStatuses = ['ready', 'completed', 'rejected'];

    return [...feedbackList].sort((a, b) => {
      const aIsProcessing = processingStatuses.includes(a.status);
      const bIsProcessing = processingStatuses.includes(b.status);
      const aIsCompleted = completedStatuses.includes(a.status);
      const bIsCompleted = completedStatuses.includes(b.status);

      // 进行中的排在前面
      if (aIsProcessing && !bIsProcessing) return -1;
      if (!aIsProcessing && bIsProcessing) return 1;

      // 同类别内按时间倒序
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [feedbackList]);

  const handleSuccess = () => {
    refresh();
    refreshStats();
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const isCompletedOrRejected = (status: FeedbackStatus) => {
    return ['ready', 'completed', 'rejected'].includes(status);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">优化与反馈</h2>
        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          提交反馈
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500 mt-1">全部反馈</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          <div className="text-sm text-gray-500 mt-1">待处理</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          <div className="text-sm text-gray-500 mt-1">进行中</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-500 mt-1">已完成</div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | '')}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部状态</option>
          {Object.entries(FeedbackStatusConfig).map(([status, config]) => (
            <option key={status} value={status}>
              {config.label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as FeedbackType | '')}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部类型</option>
          {Object.entries(FeedbackTypeLabels).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>
        <div className="flex-1"></div>
        <span className="text-sm text-gray-500">共 {total} 条反馈</span>
      </div>

      {/* 反馈列表 */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : sortedFeedbackList.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            暂无反馈，点击右上角提交反馈
          </div>
        ) : (
          sortedFeedbackList.map((feedback) => {
            const statusConfig = FeedbackStatusConfig[feedback.status] || {
              label: feedback.status,
              bg: 'bg-gray-100',
              text: 'text-gray-600',
              border: 'border-gray-200',
            };
            const isDone = isCompletedOrRejected(feedback.status);

            return (
              <div
                key={feedback.id}
                onClick={() => navigate(`/water/feedback/${feedback.id}`)}
                className={`bg-white rounded-xl p-4 border border-gray-200 cursor-pointer transition-all hover:border-blue-500 hover:shadow-md ${
                  isDone ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* 状态标签 */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusConfig.bg} ${statusConfig.text}`}
                    >
                      {feedback.status === 'pending' && (
                        <Clock className="w-3 h-3" />
                      )}
                      {feedback.status === 'rejected' && (
                        <XCircle className="w-3 h-3" />
                      )}
                      {(feedback.status === 'ready' ||
                        feedback.status === 'completed') && (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      {statusConfig.label}
                    </span>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-base leading-snug break-words">
                        {feedback.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm text-gray-500">
                          类型：{FeedbackTypeLabels[feedback.type]} · 提交人：
                          {feedback.created_by_name}
                        </span>
                        {feedback.comment_count !== undefined &&
                          feedback.comment_count > 0 && (
                            <span className="flex items-center gap-1 text-sm text-gray-400">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {feedback.comment_count}
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400 flex-shrink-0 ml-4">
                    {formatTime(feedback.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 提交反馈弹窗 */}
      <FeedbackSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
