import { MessageSquare, Eye, Clock, Pin, Star, Edit2, Trash2 } from 'lucide-react';
import { ForumPost, ForumCategory } from '../../../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ForumPostListProps {
  posts: ForumPost[];
  isAdmin: boolean;
  currentUserId?: string;
  onSelectPost: (post: ForumPost) => void;
  onEditPost: (post: ForumPost, e: React.MouseEvent) => void;
  onDeletePost: (post: ForumPost, e: React.MouseEvent) => void;
  onTogglePin: (post: ForumPost, e: React.MouseEvent) => void;
  onToggleEssence: (post: ForumPost, e: React.MouseEvent) => void;
}

const categories: { key: ForumCategory; label: string; color: string }[] = [
  { key: 'tech', label: '技术分享', color: 'bg-blue-100 text-blue-700' },
  { key: 'experience', label: '项目经验', color: 'bg-green-100 text-green-700' },
  { key: 'help', label: '问题求助', color: 'bg-orange-100 text-orange-700' },
  { key: 'chat', label: '闲聊', color: 'bg-purple-100 text-purple-700' },
  { key: 'other', label: '其他', color: 'bg-gray-100 text-gray-700' },
];

export function ForumPostList({
  posts,
  isAdmin,
  currentUserId,
  onSelectPost,
  onEditPost,
  onDeletePost,
  onTogglePin,
  onToggleEssence
}: ForumPostListProps) {
  const getCategoryLabel = (key: ForumCategory) => {
    return categories.find(c => c.key === key) || { label: '其他', color: 'bg-gray-100 text-gray-700' };
  };

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>暂无帖子</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const category = getCategoryLabel(post.category);
        const isAuthor = post.author_id === currentUserId;

        return (
          <div
            key={post.id}
            onClick={() => onSelectPost(post)}
            className={`bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${
              post.is_pinned ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Author Avatar */}
              <div className="flex-shrink-0">
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
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
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
                  <h3 className="font-medium text-gray-900 truncate">{post.title}</h3>
                </div>

                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {typeof post.content === 'string' ? post.content : post.content?.text}
                </p>

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>{post.author?.full_name || '未知用户'}</span>
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {format(new Date(post.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                  </span>
                  <span className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                    {post.view_count || 0}
                  </span>
                  <span className="flex items-center">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {post.reply_count || 0}
                  </span>
                  {post.last_reply_at && (
                    <span className="text-gray-400">
                      最后回复: {format(new Date(post.last_reply_at), 'MM-dd HH:mm', { locale: zhCN })}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {isAdmin && (
                  <>
                    <button
                      onClick={(e) => onTogglePin(post, e)}
                      className={`p-1.5 rounded transition-colors ${
                        post.is_pinned ? 'text-yellow-600 bg-yellow-100' : 'text-gray-400 hover:text-yellow-600'
                      }`}
                      title={post.is_pinned ? '取消置顶' : '置顶'}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => onToggleEssence(post, e)}
                      className={`p-1.5 rounded transition-colors ${
                        post.is_essence ? 'text-orange-600 bg-orange-100' : 'text-gray-400 hover:text-orange-600'
                      }`}
                      title={post.is_essence ? '取消精华' : '设为精华'}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  </>
                )}
                {(isAuthor || isAdmin) && (
                  <>
                    <button
                      onClick={(e) => onEditPost(post, e)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => onDeletePost(post, e)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
