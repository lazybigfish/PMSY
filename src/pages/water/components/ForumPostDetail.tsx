import { useState } from 'react';
import { X, Send, Loader2, Trash2, Pin, Star } from 'lucide-react';
import { ForumPost, ForumReply, ForumCategory } from '../../../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ForumPostDetailProps {
  post: ForumPost;
  replies: ForumReply[];
  isAdmin: boolean;
  currentUserId?: string;
  onClose: () => void;
  onSubmitReply: (content: string) => Promise<void>;
  onDeleteReply: (reply: ForumReply) => void;
}

const categories: { key: ForumCategory; label: string; color: string }[] = [
  { key: 'tech', label: '技术分享', color: 'bg-blue-100 text-blue-700' },
  { key: 'experience', label: '项目经验', color: 'bg-green-100 text-green-700' },
  { key: 'help', label: '问题求助', color: 'bg-orange-100 text-orange-700' },
  { key: 'chat', label: '闲聊', color: 'bg-purple-100 text-purple-700' },
  { key: 'other', label: '其他', color: 'bg-gray-100 text-gray-700' },
];

export function ForumPostDetail({
  post,
  replies,
  isAdmin,
  currentUserId,
  onClose,
  onSubmitReply,
  onDeleteReply
}: ForumPostDetailProps) {
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getCategoryLabel = (key: ForumCategory) => {
    return categories.find(c => c.key === key) || { label: '其他', color: 'bg-gray-100 text-gray-700' };
  };

  const handleSubmit = async () => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    await onSubmitReply(replyContent);
    setReplyContent('');
    setSubmitting(false);
  };

  const category = getCategoryLabel(post.category);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs rounded-full ${category.color}`}>
              {category.label}
            </span>
            {post.is_pinned && (
              <span className="flex items-center text-xs text-yellow-600">
                <Pin className="w-3 h-3 mr-0.5" />
                置顶
              </span>
            )}
            {post.is_essence && (
              <span className="flex items-center text-xs text-orange-600">
                <Star className="w-3 h-3 mr-0.5" />
                精华
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Post */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{post.title}</h2>
            <div className="flex items-center gap-3 mb-4">
              {post.author?.avatar_url ? (
                <img
                  src={post.author.avatar_url}
                  alt={post.author.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-600 font-medium">
                    {post.author?.full_name?.charAt(0) || '?'}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{post.author?.full_name || '未知用户'}</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(post.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                </p>
              </div>
            </div>
            <div className="prose max-w-none text-gray-700">
              {typeof post.content === 'string' ? post.content : post.content?.text}
            </div>
          </div>

          {/* Replies */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-4">回复 ({replies.length})</h3>
            <div className="space-y-4">
              {replies.map((reply) => {
                const isReplyAuthor = reply.author_id === currentUserId;
                return (
                  <div key={reply.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    {reply.author?.avatar_url ? (
                      <img
                        src={reply.author.avatar_url}
                        alt={reply.author.full_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-600 text-sm">
                          {reply.author?.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{reply.author?.full_name || '未知用户'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {format(new Date(reply.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                          </span>
                          {(isReplyAuthor || isAdmin) && (
                            <button
                              onClick={() => onDeleteReply(reply)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{reply.content}</p>
                    </div>
                  </div>
                );
              })}
              {replies.length === 0 && (
                <p className="text-center text-gray-500 py-8">暂无回复，快来抢沙发吧！</p>
              )}
            </div>
          </div>
        </div>

        {/* Reply Input */}
        <div className="border-t p-4">
          <div className="flex gap-3">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="写下你的回复..."
              className="flex-1 border rounded-lg p-3 resize-none h-20"
            />
            <button
              onClick={handleSubmit}
              disabled={!replyContent.trim() || submitting}
              className="px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  回复
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
