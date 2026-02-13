import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, Trash2, Pin, Star, MessageSquare, Eye, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ForumPost, ForumReply, ForumCategory } from '../../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { LikeButton } from '../../components/LikeButton';

const categories: { key: ForumCategory; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: 'tech', label: '技术分享', color: 'text-primary-700', bgColor: 'bg-primary-50', borderColor: 'border-primary-200' },
  { key: 'experience', label: '项目经验', color: 'text-mint-700', bgColor: 'bg-mint-50', borderColor: 'border-mint-200' },
  { key: 'help', label: '问题求助', color: 'text-sun-700', bgColor: 'bg-sun-50', borderColor: 'border-sun-200' },
  { key: 'chat', label: '闲聊', color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
  { key: 'other', label: '其他', color: 'text-dark-700', bgColor: 'bg-dark-50', borderColor: 'border-dark-200' },
];

export default function ForumPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
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
      const { data: postData, error: postError } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (postError) throw postError;
      
      // 加载作者信息
      let postWithAuthor = postData;
      if (postData?.author_id) {
        const { data: authorData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', postData.author_id)
          .single();
        
        postWithAuthor = { ...postData, author: authorData };
      }
      
      // 检查当前用户是否点赞
      if (user) {
        const { data: likeData } = await supabase
          .from('forum_post_likes')
          .select('*')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .single();
        
        postWithAuthor.is_liked = !!likeData;
      }
      
      postWithAuthor.like_count = postWithAuthor.like_count || 0;
      setPost(postWithAuthor);
      
      // 增加浏览量
      await supabase
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

  const loadReplies = async (postId: string) => {
    try {
      const { data: repliesData, error } = await supabase
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
        const { data: authorsData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(authorIds));
        authorsData?.forEach(a => authorMap.set(a.id, a));
      }

      const repliesWithAuthors = (repliesData || []).map(reply => ({
        ...reply,
        author: authorMap.get(reply.author_id),
        content: reply.content || { text: '' }
      }));

      setReplies(repliesWithAuthors);
    } catch (error) {
      console.error('Error loading replies:', error);
    }
  };

  const submitReply = async () => {
    if (!post || !user || !replyContent.trim()) return;

    try {
      setSubmitting(true);
      
      await supabase.from('forum_replies').insert({
        post_id: post.id,
        author_id: user.id,
        content: { text: replyContent.trim() }
      });

      const now = new Date().toISOString();
      await supabase
        .from('forum_posts')
        .update({
          reply_count: post.reply_count + 1,
          last_reply_at: now,
          last_reply_by: user.id
        })
        .eq('id', post.id);

      setReplyContent('');
      // 更新本地帖子数据
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
      await supabase.from('forum_replies').delete().eq('id', reply.id);
      await supabase
        .from('forum_posts')
        .update({ reply_count: Math.max(0, post.reply_count - 1) })
        .eq('id', post.id);

      setPost(prev => prev ? { ...prev, reply_count: Math.max(0, prev.reply_count - 1) } : null);
      await loadReplies(post.id);
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
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
        // Unlike - 只需删除点赞记录，触发器会自动更新 like_count
        const { error: deleteError } = await supabase
          .from('forum_post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        
        if (deleteError) {
          console.error('Error deleting like:', deleteError);
          return;
        }
        
        // 乐观更新本地状态
        setPost(prev => prev ? { 
          ...prev, 
          is_liked: false, 
          like_count: Math.max(0, currentLikeCount - 1)
        } : null);
      } else {
        // Like - 只需插入点赞记录，触发器会自动更新 like_count
        const { error: insertError } = await supabase
          .from('forum_post_likes')
          .insert({ post_id: post.id, user_id: user.id });
        
        if (insertError) {
          console.error('Error inserting like:', insertError);
          return;
        }
        
        // 乐观更新本地状态
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
          {post.author?.avatar_url ? (
            <img
              src={post.author.avatar_url}
              alt={post.author.full_name}
              className="w-14 h-14 rounded-xl object-cover ring-2 ring-white shadow-md"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-xl">
                {post.author?.full_name?.charAt(0) || '?'}
              </span>
            </div>
          )}
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
                {post.reply_count || 0} 回复
              </span>
            </div>
          </div>
        </div>

        {/* 正文内容 */}
        <div className="prose prose-sm max-w-none text-dark-700 leading-relaxed whitespace-pre-wrap text-base mb-6">
          {typeof post.content === 'string' ? post.content : post.content?.text || ''}
        </div>

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
            回复 ({replies.length})
          </h2>
        </div>

        {/* 回复列表 */}
        <div className="p-6 space-y-4">
          {replies.map((reply) => {
            const isReplyAuthor = reply.author_id === user?.id;
            return (
              <div
                key={reply.id}
                className="flex gap-4 p-4 bg-dark-50 rounded-xl hover:bg-dark-100/50 hover:shadow-sm transition-all duration-200 ease-out"
              >
                {reply.author?.avatar_url ? (
                  <img
                    src={reply.author.avatar_url}
                    alt={reply.author.full_name}
                    className="w-11 h-11 rounded-lg object-cover ring-2 ring-white flex-shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-dark-200 to-dark-300 flex items-center justify-center flex-shrink-0">
                    <span className="text-dark-600 font-semibold">
                      {reply.author?.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm text-dark-900">
                      {reply.author?.full_name || '未知用户'}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-dark-400">
                        {format(new Date(reply.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                      </span>
                      {(isReplyAuthor || isAdmin) && (
                        <button
                          onClick={() => deleteReply(reply)}
                          className="p-1.5 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除回复"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-dark-700 leading-relaxed whitespace-pre-wrap">
                    {typeof reply.content === 'string' ? reply.content : reply.content?.text || ''}
                  </p>
                </div>
              </div>
            );
          })}
          
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
          <div className="px-6 py-4 bg-dark-50/30 border-t border-dark-100">
            <div className="flex gap-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="写下你的回复..."
                rows={3}
                className="flex-1 input resize-none"
              />
              <button
                onClick={submitReply}
                disabled={!replyContent.trim() || submitting}
                className="btn-primary px-6 self-end"
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
        )}
      </div>
    </div>
  );
}
