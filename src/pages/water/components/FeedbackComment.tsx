/**
 * 反馈评论组件
 */

import React, { useState, useMemo } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContextNew';
import { useFeedbackComments } from '../../../hooks/useFeedback';
import type { FeedbackComment as FeedbackCommentType } from '../../../types/feedback';

interface FeedbackCommentProps {
  feedbackId: string;
  isAdmin?: boolean;
}

// 评论节点类型，包含回复列表
interface CommentNode extends FeedbackCommentType {
  replies: CommentNode[];
}

export function FeedbackCommentSection({
  feedbackId,
  isAdmin = false,
}: FeedbackCommentProps) {
  const { comments, loading, createComment, deleteComment } =
    useFeedbackComments(feedbackId);
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<FeedbackCommentType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 将评论列表组织成树形结构
  const commentTree = useMemo(() => {
    const commentMap = new Map<string, CommentNode>();
    const rootComments: CommentNode[] = [];

    // 首先创建所有评论的节点
    comments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // 然后组织成树形结构
    comments.forEach((comment) => {
      const node = commentMap.get(comment.id)!;
      if (comment.reply_to && commentMap.has(comment.reply_to)) {
        // 这是一个回复，添加到父评论的 replies 中
        const parent = commentMap.get(comment.reply_to)!;
        parent.replies.push(node);
      } else {
        // 这是一个根评论
        rootComments.push(node);
      }
    });

    return rootComments;
  }, [comments]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await createComment({
        content: newComment,
        reply_to: replyTo?.id,
      });
      setNewComment('');
      setReplyTo(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (comment: FeedbackCommentType) => {
    setReplyTo(comment);
    // 滚动到输入框
    const inputElement = document.getElementById('comment-input');
    inputElement?.scrollIntoView({ behavior: 'smooth' });
    inputElement?.focus();
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    try {
      await deleteComment(commentId);
    } catch (err) {
      // 错误已在 hook 中处理
    }
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

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-green-100 text-green-600',
      'bg-purple-100 text-purple-600',
      'bg-orange-100 text-orange-600',
      'bg-pink-100 text-pink-600',
      'bg-indigo-100 text-indigo-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // 渲染单个评论
  const renderComment = (comment: CommentNode, depth: number = 0) => {
    const isReply = depth > 0;

    return (
      <div key={comment.id} className={isReply ? 'mt-3' : 'pb-4 border-b border-gray-100 last:border-b-0'}>
        <div className={`flex items-start gap-3 ${isReply ? 'pl-11' : ''}`}>
          {/* 头像 */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
              comment.created_by_avatar
                ? ''
                : getAvatarColor(comment.created_by_name)
            }`}
          >
            {comment.created_by_avatar ? (
              <img
                src={comment.created_by_avatar}
                alt={comment.created_by_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              comment.created_by_name.charAt(0)
            )}
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 text-sm">
                {comment.created_by_name}
              </span>
              <span className="text-xs text-gray-400">
                {formatTime(comment.created_at)}
              </span>
            </div>

            {/* 回复引用 */}
            {isReply && comment.reply_to_name && (
              <div className="text-sm text-blue-600 mb-1">
                @{comment.reply_to_name}
              </div>
            )}

            <p className="text-gray-700 text-sm whitespace-pre-wrap">
              {comment.content}
            </p>

            {/* 操作按钮 */}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => handleReply(comment)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                回复
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  删除
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 递归渲染回复 */}
        {comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        评论
        <span className="text-gray-400 font-normal">({comments.length})</span>
      </h3>

      {/* 评论列表 */}
      <div className="space-y-4 mb-6">
        {loading ? (
          <div className="text-center py-4 text-gray-500">加载中...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-gray-400">暂无评论，来发表第一条评论吧</div>
        ) : (
          commentTree.map((comment) => renderComment(comment, 0))
        )}
      </div>

      {/* 发表评论 */}
      <div className="bg-gray-50 rounded-xl p-4">
        {/* 回复提示 */}
        {replyTo && (
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-blue-600">
              回复 @{replyTo.created_by_name}
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              取消
            </button>
          </div>
        )}

        <textarea
          id="comment-input"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          placeholder="发表你的评论..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? '发表中...' : '发表评论'}
          </button>
        </div>
      </div>
    </div>
  );
}
