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

const categories: { key: ForumCategory; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: 'tech', label: '技术', color: 'text-primary-700', bgColor: 'bg-primary-50', borderColor: 'border-primary-200' },
  { key: 'experience', label: '经验', color: 'text-mint-700', bgColor: 'bg-mint-50', borderColor: 'border-mint-200' },
  { key: 'help', label: '求助', color: 'text-sun-700', bgColor: 'bg-sun-50', borderColor: 'border-sun-200' },
  { key: 'chat', label: '闲聊', color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
  { key: 'other', label: '其他', color: 'text-dark-700', bgColor: 'bg-dark-50', borderColor: 'border-dark-200' },
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
  const getCategoryStyle = (key: ForumCategory) => {
    return categories.find(c => c.key === key) || categories[4];
  };

  if (posts.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-20 h-20 rounded-2xl bg-dark-100 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="h-10 w-10 text-dark-400" />
        </div>
        <p className="text-dark-600 font-medium text-lg">暂无帖子</p>
        <p className="text-dark-400 text-sm mt-2">快来发布第一个帖子吧！</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const category = getCategoryStyle(post.category);
        const isAuthor = post.author_id === currentUserId;

        return (
          <div
            key={post.id}
            onClick={() => onSelectPost(post)}
            className={`card p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
              post.is_pinned ? 'border-l-4 border-l-yellow-400 bg-gradient-to-r from-yellow-50/50 to-transparent' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Author Avatar */}
              <div className="flex-shrink-0">
                {post.author?.avatar_url ? (
                  <img
                    src={post.author.avatar_url}
                    alt={post.author.full_name}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-dark-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                    <span className="text-white font-bold text-lg">
                      {post.author?.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title Row */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${category.bgColor} ${category.color} ${category.borderColor}`}>
                    {category.label}
                  </span>
                  {post.is_pinned && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-md">
                      <Pin className="w-3 h-3" />
                      置顶
                    </span>
                  )}
                  {post.is_essence && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-md">
                      <Star className="w-3 h-3" />
                      精华
                    </span>
                  )}
                  <h3 className="font-semibold text-dark-900 text-base truncate">{post.title}</h3>
                </div>

                {/* Content Preview */}
                <p className="text-sm text-dark-600 mt-2 line-clamp-2 leading-relaxed">
                  {typeof post.content === 'string' ? post.content : post.content?.text || ''}
                </p>

                {/* Meta Info */}
                <div className="flex items-center gap-4 mt-3 text-xs text-dark-500">
                  <span className="font-medium text-dark-700">{post.author?.full_name || '未知用户'}</span>
                  <span className="w-1 h-1 rounded-full bg-dark-300"></span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(post.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {post.view_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {post.reply_count || 0}
                  </span>
                  {post.last_reply_at && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-dark-300"></span>
                      <span className="text-dark-400">
                        最后回复 {format(new Date(post.last_reply_at), 'MM-dd HH:mm', { locale: zhCN })}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {isAdmin && (
                  <>
                    <button
                      onClick={(e) => onTogglePin(post, e)}
                      className={`p-2 rounded-lg transition-all ${
                        post.is_pinned 
                          ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200' 
                          : 'text-dark-400 hover:text-yellow-600 hover:bg-yellow-50'
                      }`}
                      title={post.is_pinned ? '取消置顶' : '置顶'}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => onToggleEssence(post, e)}
                      className={`p-2 rounded-lg transition-all ${
                        post.is_essence 
                          ? 'text-orange-600 bg-orange-100 hover:bg-orange-200' 
                          : 'text-dark-400 hover:text-orange-600 hover:bg-orange-50'
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
                      className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => onDeletePost(post, e)}
                      className="p-2 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
