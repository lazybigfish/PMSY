/**
 * 优化与反馈 - 反馈详情页
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContextNew';
import { useFeedbackDetail, useFeedbackStatusHistory } from '../../hooks/useFeedback';
import { FeedbackCommentSection } from './components/FeedbackComment';
import { ModalForm } from '../../components/Modal';
import {
  FeedbackStatus,
  FeedbackStatusConfig,
  FeedbackTypeLabels,
  HandleFeedbackRequest,
  UpdateFeedbackStatusRequest,
} from '../../types/feedback';

export function FeedbackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const {
    feedback,
    loading,
    handleFeedback,
    updateStatus,
    deleteFeedback,
  } = useFeedbackDetail(id);

  const { history: statusHistory, refresh: refreshHistory } = useFeedbackStatusHistory(id);

  const [isHandleModalOpen, setIsHandleModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [handleForm, setHandleForm] = useState<HandleFeedbackRequest>({
    result: 'accepted',
    remark: '',
  });
  const [statusForm, setStatusForm] = useState<UpdateFeedbackStatusRequest>({
    status: 'developing',
    remark: '',
  });
  const [submitting, setSubmitting] = useState(false);

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

  const handleHandleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSubmitting(true);
    try {
      await handleFeedback(handleForm);
      setIsHandleModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSubmitting(true);
    try {
      await updateStatus(statusForm);
      await refreshHistory();
      setIsStatusModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('确定要删除这条反馈吗？')) return;
    try {
      await deleteFeedback();
      navigate('/water?tab=feedback');
    } catch (err) {
      // 错误已在 hook 中处理
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500 mb-4">反馈不存在或已被删除</p>
        <button
          onClick={() => navigate('/water?tab=feedback')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          返回列表
        </button>
      </div>
    );
  }

  const statusConfig = FeedbackStatusConfig[feedback.status];

  // 判断是否显示"处理反馈"按钮
  const canHandle = isAdmin && feedback.status === 'pending';
  // 判断是否显示"更新状态"按钮
  // 已接受、开发中、测试中、待发版状态都可以更新状态
  const canUpdateStatus =
    isAdmin &&
    (feedback.status === 'accepted' ||
      feedback.status === 'developing' ||
      feedback.status === 'testing' ||
      feedback.status === 'ready');

  return (
    <div className="bg-white min-h-screen">
      {/* 头部 */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/water?tab=feedback')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            返回列表
          </button>

          {isAdmin && (
            <div className="flex items-center gap-2">
              {canHandle && (
                <button
                  onClick={() => setIsHandleModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                  处理反馈
                </button>
              )}
              {canUpdateStatus && (
                <button
                  onClick={() => setIsStatusModalOpen(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition"
                >
                  更新状态
                </button>
              )}
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
              >
                删除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 内容 */}
      <div className="p-6 max-w-3xl mx-auto">
        {/* 标题和状态 */}
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">{feedback.title}</h1>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
          >
            {feedback.status === 'pending' && <Clock className="w-3 h-3" />}
            {feedback.status === 'rejected' && <XCircle className="w-3 h-3" />}
            {(feedback.status === 'ready' || feedback.status === 'completed') && (
              <CheckCircle2 className="w-3 h-3" />
            )}
            {statusConfig.label}
          </span>
        </div>

        {/* 元信息 */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-200">
          <span>类型：{FeedbackTypeLabels[feedback.type]}</span>
          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
          <span>提交人：{feedback.created_by_name}</span>
          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
          <span>{formatTime(feedback.created_at)}</span>
        </div>

        {/* 问题描述 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-2">问题描述</h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {feedback.content}
          </p>
        </div>

        {/* 图片 */}
        {feedback.images && feedback.images.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">相关截图</h3>
            <div className="flex gap-3 flex-wrap">
              {feedback.images.map((image, index) => (
                <div
                  key={index}
                  className="w-24 h-24 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:opacity-80 transition"
                  onClick={() => window.open(image, '_blank')}
                >
                  <img
                    src={image}
                    alt={`截图 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 处理记录 */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">处理记录</h3>
          <div className="space-y-4">
            {/* 接受/拒绝记录 */}
            {feedback.handle_result && (
              <div className="border-l-2 border-blue-500 pl-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">处理结果：</span>
                  <span
                    className={`font-medium ${
                      feedback.handle_result === 'accepted'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {feedback.handle_result === 'accepted' ? '已接受' : '已拒绝'}
                  </span>
                </div>
                {feedback.handle_remark && (
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="text-gray-500">备注：</span>
                    {feedback.handle_remark}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {feedback.handled_by_name} · {formatTime(feedback.handled_at || '')}
                </div>
              </div>
            )}

            {/* 状态历史记录 */}
            {statusHistory.map((record) => {
              const fromConfig = FeedbackStatusConfig[record.from_status as FeedbackStatus];
              const toConfig = FeedbackStatusConfig[record.to_status];
              
              return (
                <div key={record.id} className="border-l-2 border-orange-500 pl-3">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="text-gray-500">状态变更：</span>
                    {record.from_status && (
                      <>
                        <span className={`font-medium ${fromConfig?.text || 'text-gray-600'}`}>
                          {fromConfig?.label || record.from_status}
                        </span>
                        <span className="text-gray-400">→</span>
                      </>
                    )}
                    <span className={`font-medium ${toConfig?.text || 'text-gray-600'}`}>
                      {toConfig?.label || record.to_status}
                    </span>
                  </div>
                  {record.remark && (
                    <div className="text-sm text-gray-600 mt-1">
                      <span className="text-gray-500">备注：</span>
                      {record.remark}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {record.created_by_name} · {formatTime(record.created_at)}
                  </div>
                </div>
              );
            })}

            {/* 无记录时显示 */}
            {!feedback.handle_result && statusHistory.length === 0 && (
              <p className="text-sm text-gray-500">暂无处理记录</p>
            )}
          </div>
        </div>

        {/* 评论区 */}
        <FeedbackCommentSection feedbackId={feedback.id} isAdmin={isAdmin} />
      </div>

      {/* 处理反馈弹窗 */}
      <ModalForm
        isOpen={isHandleModalOpen}
        onClose={() => setIsHandleModalOpen(false)}
        title="处理反馈"
        onSubmit={handleHandleSubmit}
        submitText={handleForm.result === 'rejected' ? '确认拒绝' : '确认接受'}
        isSubmitting={submitting}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              处理结果
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                <input
                  type="radio"
                  name="result"
                  value="accepted"
                  checked={handleForm.result === 'accepted'}
                  onChange={(e) =>
                    setHandleForm({ ...handleForm, result: e.target.value as 'accepted' | 'rejected' })
                  }
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-900">接受</div>
                  <div className="text-sm text-gray-500">该反馈将进入开发流程</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                <input
                  type="radio"
                  name="result"
                  value="rejected"
                  checked={handleForm.result === 'rejected'}
                  onChange={(e) =>
                    setHandleForm({ ...handleForm, result: e.target.value as 'accepted' | 'rejected' })
                  }
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-900">拒绝</div>
                  <div className="text-sm text-gray-500">该反馈不会被采纳</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {handleForm.result === 'rejected' ? '拒绝原因' : '备注'}
              <span className="text-gray-400 font-normal">（可选）</span>
            </label>
            <textarea
              value={handleForm.remark}
              onChange={(e) =>
                setHandleForm({ ...handleForm, remark: e.target.value })
              }
              rows={3}
              placeholder={
                handleForm.result === 'rejected'
                  ? '请说明拒绝的原因，方便用户理解...'
                  : '添加备注...'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
      </ModalForm>

      {/* 更新状态弹窗 */}
      <ModalForm
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="更新状态"
        onSubmit={handleStatusSubmit}
        submitText="确认更新"
        isSubmitting={submitting}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">当前状态：</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
            >
              {statusConfig.label}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              更新为
            </label>
            <div className="space-y-2">
              {[
                { value: 'developing', label: '开发中' },
                { value: 'testing', label: '测试中' },
                { value: 'ready', label: '待发版' },
                { value: 'completed', label: '已完成' },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={statusForm.status === option.value}
                    onChange={(e) =>
                      setStatusForm({
                        ...statusForm,
                        status: e.target.value as FeedbackStatus,
                      })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="font-medium text-gray-900">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注 <span className="text-gray-400 font-normal">（可选）</span>
            </label>
            <textarea
              value={statusForm.remark}
              onChange={(e) =>
                setStatusForm({ ...statusForm, remark: e.target.value })
              }
              rows={2}
              placeholder="添加状态更新备注..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
