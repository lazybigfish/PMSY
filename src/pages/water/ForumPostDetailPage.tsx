import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, Trash2, Pin, Star, MessageSquare, Eye, Clock, ChevronDown, ChevronUp, Reply, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContextNew';
import { ForumPost, ForumReply, ForumCategory } from '../../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { LikeButton } from '../../components/LikeButton';
import { Avatar } from '../../components/Avatar';
import { ImagePreview } from '../../components/ImagePreview';
import { PostImageUploader, PostImage } from './components/PostImageUploader';

// 辅助函数：解析帖子内容
const parseContent = (content: any): { text: string; images: string[] } => {
  if (!content) return { text: '', images: [] };
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      return {
        text: parsed.text || parsed.content || '',
        images: parsed.images || []
      };
    } catch {
      return { text: content, images: [] };
    }
  }
  if (typeof content === 'object') {
    return {
      text: content.text || content.content || '',
      images: content.images || []
    };
  }
  return { text: String(content), images: [] };
};

const categories: { key: ForumCategory; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: 'tech', label: '技术分享', color: 'text-primary-700', bgColor: 'bg-primary-50', borderColor: 'border-primary-200' },
  { key: 'experience', label: '项目经验', color: 'text-mint-700', bgColor: 'bg-mint-50', borderColor: 'border-mint-200' },
  { key: 'help', label: '问题求助', color: 'text-sun-700', bgColor: 'bg-sun-50', borderColor: 'border-sun-200' },
  { key: 'chat', label: '闲聊', color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
  { key: 'other', label: '其他', color: 'text-dark-700', bgColor: 'bg-dark-50', borderColor: 'border-dark-200' },
];

// 递归回复组件
interface ReplyItemProps {
  reply: ForumReply;
  user: any;
  profile: any;
  onDelete: (reply: ForumReply) => void;
  onReply: (reply: ForumReply) => void;
  level?: number;
}

function ReplyItem({ reply, user, profile, onDelete, onReply, level = 0 }: ReplyItemProps) {
  const isReplyAuthor = reply.author_id === user?.id;
  const isAdmin = profile?.role === 'admin';
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = reply.children && reply.children.length > 0;
  const maxLevel = 3;

  return (
    <div className={`${level > 0 ? 'ml-4 pl-4 border-l-2 border-dark-100' : ''}`}>
      <div className="flex gap-3 p-3 bg-dark-50 rounded-xl hover:bg-dark-100/50 transition-all duration-200">
        <Avatar
          userId={reply.author?.id}
          avatarUrl={reply.author?.avatar_url}
          name={reply.author?.full_name}
          size="sm"
          rounded="lg"
          className="ring-2 ring-white flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-dark-900">
                {reply.author?.full_name || '未知用户'}
              </span>
              {reply.floor_number && (
                <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-medium">
                  {reply.floor_number}楼
                </span>
              )}
              {reply.parent_author && level > 0 && (
                <span className="text-xs text-dark-500">
                  回复 <span className="text-primary-600">@{reply.parent_author.full_name}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-dark-400">
                {format(new Date(reply.created_at), 'MM-dd HH:mm', { locale: zhCN })}
              </span>
              {(isReplyAuthor || isAdmin) && (
                <button
                  onClick={() => onDelete(reply)}
                  className="p-1.5 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除回复"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-dark-700 leading-relaxed whitespace-pre-wrap mb-2">
            {reply.content?.text || reply.content}
          </p>
          {/* 回复图片 */}
          {reply.content?.images?.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {reply.content.images.map((imgUrl: string, idx: number) => (
                <div 
                  key={idx} 
                  className="w-20 h-20 rounded-lg overflow-hidden bg-dark-100 flex-shrink-0"
                >
                  <img
                    src={imgUrl}
                    alt={`回复图片 ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            {level < maxLevel && (
              <button
                onClick={() => onReply(reply)}
                className="flex items-center gap-1 text-xs text-dark-500 hover:text-primary-600 hover:bg-primary-50 px-2 py-1 rounded-lg transition-colors"
              >
                <Reply className="w-3 h-3" />
                回复
              </button>
            )}
            {hasChildren && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs text-dark-500 hover:text-primary-600 hover:bg-primary-50 px-2 py-1 rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    收起 ({reply.children?.length})
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    展开 ({reply.children?.length})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 递归渲染子回复 */}
      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">
          {reply.children?.map((child) => (
            <ReplyItem
              key={child.id}
              reply={child}
              user={user}
              profile={profile}
              onDelete={onDelete}
              onReply={onReply}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ForumPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [replyImages, setReplyImages] = useState<PostImage[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ForumReply | null>(null);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (id) {
      loadPostDetail();
    }
  }, [id]);

  const loadPostDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);

      // 加载帖子详情
      const { data: postData, error: postError } = await api.db
        .from('forum_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (postError) throw postError;

      // 加载作者信息
      let postWithAuthor = postData;
      if (postData?.author_id) {
        const { data: authorData } = await api.db
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', postData.author_id)
          .single();

        postWithAuthor = { ...postData, author: authorData };
      }

      // 检查当前用户是否点赞
      if (user) {
        const { data: likeData } = await api.db
          .from('forum_likes')
          .select('*')
          .eq('target_id', id)
          .eq('target_type', 'post')
          .eq('user_id', user.id)
          .single();

        postWithAuthor.is_liked = !!likeData;
      }

      postWithAuthor.like_count = postWithAuthor.like_count || 0;
      postWithAuthor.content = parseContent(postData?.content);
      setPost(postWithAuthor);

      // 增加浏览量
      await api.db
        .from('forum_posts')
        .update({ view_count: (postData?.view_count || 0) + 1 })
        .eq('id', id);

      // 加载回复
      await loadReplies(id);
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  };

  // 构建嵌套回复结构并计算楼层号
  const buildReplyTree = useCallback((flatReplies: ForumReply[]): ForumReply[] => {
    const replyMap = new Map<string, ForumReply>();
    const rootReplies: ForumReply[] = [];

    // 倒序排序（最新的在上）
    const sortedReplies = [...flatReplies].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // 第一遍：创建映射
    sortedReplies.forEach(reply => {
      replyMap.set(reply.id, { ...reply, children: [] });
    });

    // 第二遍：构建树结构
    sortedReplies.forEach(reply => {
      const replyWithChildren = replyMap.get(reply.id)!;
      if (reply.parent_id && replyMap.has(reply.parent_id)) {
        const parent = replyMap.get(reply.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(replyWithChildren);
      } else {
        rootReplies.push(replyWithChildren);
      }
    });

    // 第三遍：计算楼层号（正序显示，所以重新排序）
    const calculateFloorNumbers = (replies: ForumReply[], prefix: string = '') => {
      // 按时间正序排列楼层号
      const sorted = [...replies].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      sorted.forEach((reply, index) => {
        const floorNumber = prefix ? `${prefix}-${index + 1}` : String(index + 1);
        reply.floor_number = floorNumber;

        // 设置 parent_author
        if (reply.parent_id && replyMap.has(reply.parent_id)) {
          const parent = replyMap.get(reply.parent_id)!;
          reply.parent_author = parent.author;
        }

        if (reply.children && reply.children.length > 0) {
          calculateFloorNumbers(reply.children, floorNumber);
        }
      });

      return sorted;
    };

    return calculateFloorNumbers(rootReplies);
  }, []);

  const loadReplies = async (postId: string) => {
    try {
      const { data: repliesData, error } = await api.db
        .from('forum_replies')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const authorIds = new Set<string>();
      repliesData?.forEach(reply => {
        if (reply.author_id) authorIds.add(reply.author_id);
      });

      const authorMap = new Map<string, { id: string; full_name: string; avatar_url?: string }>();
      if (authorIds.size > 0) {
        const { data: authorsData } = await api.db
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(authorIds));
        authorsData?.forEach(a => authorMap.set(a.id, a));
      }

      const repliesWithAuthors = (repliesData || []).map(reply => {
        const parsed = parseContent(reply.content);
        return {
          ...reply,
          author: authorMap.get(reply.author_id),
          content: parsed
        };
      });

      // 构建嵌套结构
      const nestedReplies = buildReplyTree(repliesWithAuthors);
      setReplies(nestedReplies);
    } catch (error) {
      console.error('Error loading replies:', error);
    }
  };

  const submitReply = async () => {
    if (!post || !user || !replyContent.trim()) return;

    // 过滤出已上传成功的图片
    const uploadedImages = replyImages
      .filter(img => !img.uploading && !img.error)
      .map(img => img.url);

    try {
      setSubmitting(true);

      const replyData: any = {
        post_id: post.id,
        author_id: user.id,
        content: { text: replyContent.trim(), images: uploadedImages }
      };

      // 如果是回复某条回复
      if (replyingTo) {
        replyData.parent_id = replyingTo.id;
      }

      await api.db.from('forum_replies').insert(replyData);

      const now = new Date().toISOString();
      await api.db
        .from('forum_posts')
        .update({
          reply_count: post.reply_count + 1,
          last_reply_at: now,
          last_reply_by: user.id
        })
        .eq('id', post.id);

      setReplyContent('');
      setReplyImages([]);
      setReplyingTo(null);
      setPost(prev => prev ? { ...prev, reply_count: prev.reply_count + 1 } : null);
      await loadReplies(post.id);
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('回复失败');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReply = async (reply: ForumReply) => {
    if (!post) return;
    if (!confirm('确定要删除这条回复吗？')) return;

    try {
      await api.db.from('forum_replies').delete().eq('id', reply.id);
      await api.db
        .from('forum_posts')
        .update({ reply_count: Math.max(0, post.reply_count - 1) })
        .eq('id', post.id);

      setPost(prev => prev ? { ...prev, reply_count: Math.max(0, prev.reply_count - 1) } : null);
      await loadReplies(post.id);
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  const handleReplyClick = (reply: ForumReply) => {
    setReplyingTo(reply);
    // 滚动到底部输入框
    const inputArea = document.getElementById('reply-input-area');
    if (inputArea) {
      inputArea.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyContent('');
  };

  const getCategoryStyle = (key: ForumCategory) => {
    return categories.find(c => c.key === key) || categories[4];
  };

  const handleLike = async () => {
    if (!post || !user) {
      alert('请先登录');
      return;
    }

    const currentLikeCount = typeof post.like_count === 'number' ? post.like_count : 0;

    try {
      if (post.is_liked) {
        const { data: likes } = await api.db
          .from('forum_likes')
          .select('*')
          .eq('target_id', post.id)
          .eq('target_type', 'post')
          .eq('user_id', user.id);

        if (likes && likes.length > 0) {
          for (const like of likes) {
            await api.db
              .from('forum_likes')
              .delete()
              .eq('id', like.id);
          }
        }

        setPost(prev => prev ? {
          ...prev,
          is_liked: false,
          like_count: Math.max(0, currentLikeCount - 1)
        } : null);
      } else {
        const { error: insertError } = await api.db
          .from('forum_likes')
          .insert({ target_id: post.id, target_type: 'post', user_id: user.id });

        if (insertError) {
          console.error('Error inserting like:', insertError);
          return;
        }

        setPost(prev => prev ? {
          ...prev,
          is_liked: true,
          like_count: currentLikeCount + 1
        } : null);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // 计算总回复数（包括嵌套回复）
  const countTotalReplies = (replies: ForumReply[]): number => {
    let count = 0;
    replies.forEach(reply => {
      count++;
      if (reply.children) {
        count += countTotalReplies(reply.children);
      }
    });
    return count;
  };

  const totalReplyCount = countTotalReplies(replies);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-pulse">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 w-16 h-16 rounded-2xl gradient-primary blur-xl opacity-50 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="card p-12 text-center">
        <div className="w-20 h-20 rounded-2xl bg-dark-100 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="h-10 w-10 text-dark-400" />
        </div>
        <p className="text-dark-600 font-medium text-lg">帖子不存在或已被删除</p>
        <button onClick={() => navigate('/water?tab=forum')} className="btn-primary mt-6">
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
      </div>
    );
  }

  const category = getCategoryStyle(post.category);

  return (
    <div className="animate-fade-in">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/water?tab=forum')}
        className="flex items-center gap-2 text-dark-500 hover:text-dark-700 hover:bg-dark-100 rounded-lg px-3 py-2 mb-6 transition-all duration-200 ease-out"
      >
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </button>

      {/* 帖子内容卡片 */}
      <div className="card p-6 md:p-8 mb-6">
        {/* 分类标签 */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${category.bgColor} ${category.color} ${category.borderColor}`}>
            {category.label}
          </span>
          {post.is_pinned && (
            <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-lg border border-yellow-200">
              <Pin className="w-3 h-3" />
              置顶
            </span>
          )}
          {post.is_essence && (
            <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 rounded-lg border border-orange-200">
              <Star className="w-3 h-3" />
              精华
            </span>
          )}
        </div>

        {/* 标题 */}
        <h1 className="text-xl md:text-2xl font-display font-bold text-dark-900 mb-6">
          {post.title}
        </h1>

        {/* 作者信息 */}
        <div className="flex items-center gap-4 p-4 bg-dark-50 rounded-xl mb-6">
          <Avatar
            userId={post.author?.id}
            avatarUrl={post.author?.avatar_url}
            name={post.author?.full_name}
            size="lg"
            rounded="xl"
            className="ring-2 ring-white shadow-md"
          />
          <div className="flex-1">
            <p className="font-semibold text-dark-900 text-base">{post.author?.full_name || '未知用户'}</p>
            <div className="flex items-center gap-4 text-xs text-dark-500 mt-1.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(post.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {post.view_count || 0} 浏览
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {totalReplyCount} 回复
              </span>
            </div>
          </div>
        </div>

        {/* 帖子正文 */}
        <div className="prose prose-sm max-w-none text-dark-700 leading-relaxed whitespace-pre-wrap text-base mb-6">
          {post.content?.text || post.content}
        </div>

        {/* 帖子图片 */}
        {post.content?.images?.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {post.content.images.map((imgUrl: string, idx: number) => (
                <div 
                  key={idx} 
                  className="relative aspect-square rounded-lg overflow-hidden bg-dark-100 cursor-pointer group"
                  onClick={() => {
                    setPreviewImages(post.content.images);
                    setPreviewIndex(idx);
                    setShowPreview(true);
                  }}
                >
                  <img
                    src={imgUrl}
                    alt={`图片 ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 点赞按钮 */}
        <div className="flex justify-center pt-4 border-t border-dark-100">
          <LikeButton
            isLiked={post.is_liked || false}
            likeCount={post.like_count || 0}
            onLike={handleLike}
            size="lg"
          />
        </div>
      </div>

      {/* 回复区域 */}
      <div className="card">
        {/* 回复标题栏 */}
        <div className="px-6 py-4 bg-dark-50/50 border-b border-dark-100">
          <h2 className="font-semibold text-dark-800 flex items-center gap-2 text-base">
            <MessageSquare className="w-5 h-5 text-primary-500" />
            回复 ({totalReplyCount})
          </h2>
        </div>

        {/* 回复列表 */}
        <div className="p-6 space-y-3">
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              user={user}
              profile={profile}
              onDelete={deleteReply}
              onReply={handleReplyClick}
            />
          ))}

          {replies.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-dark-100 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-dark-400" />
              </div>
              <p className="text-dark-600 font-medium">暂无回复</p>
              <p className="text-dark-400 text-sm mt-1">快来抢沙发吧！</p>
            </div>
          )}
        </div>

        {/* 回复输入 */}
        {user && (
          <div id="reply-input-area" className="px-6 py-4 bg-dark-50/30 border-t border-dark-100">
            {replyingTo && (
              <div className="flex items-center justify-between mb-3 p-2 bg-primary-50 rounded-lg">
                <span className="text-sm text-primary-700">
                  回复 <span className="font-semibold">{replyingTo.floor_number}楼</span> 的{' '}
                  <span className="font-semibold">{replyingTo.author?.full_name}</span>
                </span>
                <button
                  onClick={cancelReply}
                  className="text-xs text-dark-500 hover:text-dark-700 px-2 py-1 rounded hover:bg-dark-100 transition-colors"
                >
                  取消
                </button>
              </div>
            )}
            <div className="space-y-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={replyingTo ? `回复 ${replyingTo.author?.full_name}...` : '写下你的回复，支持 Ctrl+V 粘贴图片'}
                rows={3}
                className="w-full input resize-none"
              />
              <PostImageUploader
                images={replyImages}
                onChange={setReplyImages}
                maxImages={4}
              />
              <div className="flex justify-end">
                <button
                  onClick={submitReply}
                  disabled={!replyContent.trim() || submitting}
                  className="btn-primary px-6"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      回复
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 图片预览 */}
      <ImagePreview
        images={previewImages}
        initialIndex={previewIndex}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}
