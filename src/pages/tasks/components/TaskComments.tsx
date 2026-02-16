import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { TaskComment } from '../../../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Avatar } from '../../../components/Avatar';

interface TaskCommentsProps {
  comments: TaskComment[];
  onAddComment: (content: string) => Promise<void>;
}

export function TaskComments({ comments, onAddComment }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setSubmitting(true);
    await onAddComment(newComment);
    setNewComment('');
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Comment List */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="flex-shrink-0">
              <Avatar
                userId={comment.user?.id}
                avatarUrl={comment.user?.avatar_url}
                name={comment.user?.full_name}
                size="sm"
              />
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{comment.user?.full_name || '未知用户'}</span>
                <span className="text-xs text-gray-500">
                  {format(new Date(comment.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                </span>
              </div>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}
        
        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>暂无评论</p>
          </div>
        )}
      </div>

      {/* Add Comment */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="添加评论..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
