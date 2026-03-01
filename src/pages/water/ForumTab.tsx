import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Loader2, MessageSquare, Filter } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContextNew';
import { useTheme } from '../../context/ThemeContext';
import { ForumPost, ForumCategory } from '../../types';
import { ForumPostList } from './components/ForumPostList';
import { ModalForm } from '../../components/Modal';
import { ImagePreview } from '../../components/ImagePreview';
import { LikeButton } from '../../components/LikeButton';
import { Avatar } from '../../components/Avatar';
import { ThemedButton } from '../../components/theme/ThemedButton';
import { ThemedCard } from '../../components/theme/ThemedCard';
import { PostImageUploader, PostImage } from './components/PostImageUploader';

// 辅助函数：解析帖子内容
const parseContent = (content: any): { text: string; images: string[] } => {
  if (!content) return { text: '', images: [] };
  // 如果是字符串，尝试解析为 JSON
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
  // 如果是对象，取 text 或 content 字段
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

export default function ForumTab() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | 'all'>('all');

  // Create post modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<ForumCategory>('tech');
  const [formImages, setFormImages] = useState<PostImage[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    loadPosts();
  }, [selectedCategory, searchQuery]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      let query = api.db
        .from('forum_posts')
        .select('*');

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data: postsData, error } = await query;
      if (error) throw error;

      // 搜索过滤 - 在内存中进行
      let filteredPosts = postsData || [];
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        filteredPosts = filteredPosts.filter(
          (post: any) =>
            post.title?.toLowerCase().includes(searchLower) ||
            (post.content?.text || parseContent(post.content).text)?.toLowerCase().includes(searchLower)
        );
      }

      // Fetch user info
      const userIds = new Set<string>();
      filteredPosts?.forEach((post: any) => {
        if (post.author_id) userIds.add(post.author_id);
        if (post.last_reply_by) userIds.add(post.last_reply_by);
      });

      const userMap = new Map<string, { id: string; full_name: string; avatar_url?: string }>();
      if (userIds.size > 0) {
        const { data: usersData } = await api.db
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(userIds));
        usersData?.forEach(u => userMap.set(u.id, u));
      }

      // Fetch liked posts for current user
      let likedPostIds = new Set<string>();
      if (user) {
        const { data: likesData } = await api.db
          .from('forum_likes')
          .select('target_id')
          .eq('user_id', user.id)
          .eq('target_type', 'post');
        likesData?.forEach(like => likedPostIds.add(like.target_id));
      }

      const postsWithUsers = (filteredPosts || []).map((post: any) => {
        // 确保 like_count 是数字类型
        const likeCount = typeof post.like_count === 'number' ? post.like_count : 0;
        // 预解析内容，提取文字和图片
        const parsedContent = parseContent(post.content);
        return {
          ...post,
          author: userMap.get(post.author_id),
          last_reply_user: post.last_reply_by ? userMap.get(post.last_reply_by) : null,
          is_liked: likedPostIds.has(post.id),
          like_count: likeCount,
          content: parsedContent // 直接存储解析后的对象
        };
      });

      setPosts(postsWithUsers);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim() || !user) {
      alert('请填写标题和内容');
      return;
    }

    // 过滤出已上传成功的图片，转换 blob URL 为可存储的 MinIO URL
    const uploadedImages = formImages
      .filter(img => !img.uploading && !img.error)
      .map(img => {
        // 如果是 blob URL，从 id 中获取文件名，构造 MinIO URL
        // 如果已经是 http URL，直接使用
        let url = img.url;
        if (url.startsWith('blob:')) {
          const fileName = img.id.replace('forum/', '');
          url = `http://localhost:9000/files/forum/${fileName}`;
        }
        return url;
      });

    try {
      setSubmitting(true);
      const now = new Date().toISOString();

      const { data: newPostData } = await api.db.from('forum_posts').insert({
        title: formTitle.trim(),
        content: { text: formContent.trim(), images: uploadedImages },
        author_id: user.id,
        category: formCategory,
        is_pinned: false,
        is_essence: false,
        view_count: 0,
        reply_count: 0,
        last_reply_at: now,
        last_reply_by: user.id,
      });

      setShowCreateModal(false);
      setFormTitle('');
      setFormContent('');
      setFormImages([]);
      loadPosts();
      
      // 跳转到新创建的帖子详情页
      if (newPostData?.[0]?.id) {
        navigate(`/water/forum/${newPostData[0].id}`);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePin = async (post: ForumPost, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = !post.is_pinned;
    await api.db.from('forum_posts').update({ is_pinned: newPinned }).eq('id', post.id);
    loadPosts();
  };

  const toggleEssence = async (post: ForumPost, e: React.MouseEvent) => {
    e.stopPropagation();
    const newEssence = !post.is_essence;
    await api.db.from('forum_posts').update({ is_essence: newEssence }).eq('id', post.id);
    loadPosts();
  };

  const deletePost = async (post: ForumPost, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定要删除帖子「${post.title}」吗？`)) return;

    await api.db.from('forum_replies').delete().eq('post_id', post.id);
    await api.db.from('forum_posts').delete().eq('id', post.id);
    loadPosts();
  };

  const openPostDetail = (post: ForumPost) => {
    navigate(`/water/forum/${post.id}`);
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      alert('请先登录');
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) {
      console.log('Post not found:', postId);
      return;
    }

    const currentLikeCount = typeof post.like_count === 'number' ? post.like_count : 0;
    console.log('handleLike called:', { postId, currentLikeCount, is_liked: post.is_liked });

    try {
      if (post.is_liked) {
        // Unlike - 只需删除点赞记录，触发器会自动更新 like_count
        console.log('Unliking post:', postId);
        const { data: likes } = await api.db
          .from('forum_likes')
          .select('*')
          .eq('target_id', postId)
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

        console.log('Unlike successful, updating local state');
        // Update local state - 乐观更新
        setPosts(prev => {
          const newPosts = prev.map(p => 
            p.id === postId 
              ? { 
                  ...p, 
                  is_liked: false, 
                  like_count: Math.max(0, currentLikeCount - 1)
                }
              : p
          );
          console.log('Updated posts:', newPosts.find(p => p.id === postId));
          return newPosts;
        });
      } else {
        // Like - 只需插入点赞记录，触发器会自动更新 like_count
        console.log('Liking post:', postId);
        const { error: insertError } = await api.db
          .from('forum_likes')
          .insert({ target_id: postId, target_type: 'post', user_id: user.id });
        
        if (insertError) {
          console.error('Error inserting like:', insertError);
          return;
        }

        console.log('Like successful, updating local state');
        // Update local state - 乐观更新
        setPosts(prev => {
          const newPosts = prev.map(p => 
            p.id === postId 
              ? { 
                  ...p, 
                  is_liked: true, 
                  like_count: currentLikeCount + 1
                }
              : p
          );
          console.log('Updated posts:', newPosts.find(p => p.id === postId));
          return newPosts;
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse"
              style={{
                background: `linear-gradient(135deg, ${colors.primary[400]}, ${colors.primary[600]})`,
                boxShadow: `0 0 30px ${colors.primary[500]}40`,
              }}
            >
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <div
              className="absolute inset-0 w-16 h-16 rounded-2xl blur-xl opacity-50 animate-pulse"
              style={{
                background: `linear-gradient(135deg, ${colors.primary[400]}, ${colors.primary[600]})`,
              }}
            />
          </div>
          <p className={`mt-4 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            正在加载帖子...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-dark-900">水底探宝</h2>
          <p className="text-dark-500 mt-1 text-sm">分享经验、交流技术、互助答疑</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          发布帖子
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜索帖子标题或内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pl-10"
            />
          </div>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-dark-400" />
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out ${
                selectedCategory === 'all'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-dark-100 text-dark-700 hover:bg-dark-200 hover:scale-105'
              }`}
            >
              全部
            </button>
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out ${
                  selectedCategory === cat.key
                    ? `${cat.bgColor} ${cat.color} ${cat.borderColor} border shadow-md`
                    : 'bg-dark-100 text-dark-700 hover:bg-dark-200 hover:scale-105'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Post List */}
      <div className="space-y-4">
        {posts.map((post) => {
          const category = categories.find(c => c.key === post.category) || categories[4];
          const isAuthor = post.author_id === user?.id;

          return (
            <div
              key={post.id}
              onClick={() => openPostDetail(post)}
              className={`card p-5 cursor-pointer transition-all duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5 hover:border-primary-300 ${
                post.is_pinned ? 'border-l-4 border-l-yellow-400 bg-gradient-to-r from-yellow-50/50 to-transparent' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Author Avatar */}
                <div className="flex-shrink-0">
                  <Avatar
                    userId={post.author?.id}
                    avatarUrl={post.author?.avatar_url}
                    name={post.author?.full_name}
                    size="md"
                    rounded="xl"
                    className="ring-2 ring-dark-100"
                  />
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
                        置顶
                      </span>
                    )}
                    {post.is_essence && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-md">
                        精华
                      </span>
                    )}
                    <h3 className="font-semibold text-dark-900 text-base truncate">{post.title}</h3>
                  </div>

                  {/* Content Preview */}
                  <p className="text-sm text-dark-600 mt-2 line-clamp-2 leading-relaxed">
                    {post.content?.text || parseContent(post.content).text}
                  </p>

                  {/* 图片预览 */}
                  {(post.content?.images?.length || parseContent(post.content).images.length) > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {(post.content?.images || parseContent(post.content).images).slice(0, 4).map((imgUrl: string, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-dark-100 cursor-pointer group"
                          onClick={() => {
                            setPreviewImages(post.content?.images || parseContent(post.content).images);
                            setPreviewIndex(idx);
                            setShowPreview(true);
                          }}
                        >
                          <img 
                            src={imgUrl} 
                            alt={`预览图${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                      {(post.content?.images?.length || parseContent(post.content).images.length) > 4 && (
                        <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-dark-200 flex items-center justify-center text-dark-500 text-sm">
                          +{(post.content?.images?.length || parseContent(post.content).images.length) - 4}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-xs text-dark-500">
                      <span className="font-medium text-dark-700">{post.author?.full_name || '未知用户'}</span>
                      <span className="w-1 h-1 rounded-full bg-dark-300"></span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {/* Like Button */}
                    <LikeButton
                      isLiked={post.is_liked || false}
                      likeCount={post.like_count || 0}
                      onLike={() => handleLike(post.id)}
                      size="sm"
                      stopPropagation={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Post Modal */}
      <ModalForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createPost}
        title="发布新帖子"
        maxWidth="2xl"
        submitText="发布"
        isSubmitting={submitting}
        submitDisabled={!formTitle.trim() || !formContent.trim()}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">分类</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as ForumCategory)}
              className="input w-full"
            >
              {categories.map(cat => (
                <option key={cat.key} value={cat.key}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="input w-full"
              placeholder="请输入标题"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={6}
              className="input w-full resize-none"
              placeholder="请输入内容，支持 Ctrl+V 粘贴图片"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              图片
            </label>
            <PostImageUploader
              images={formImages}
              onChange={setFormImages}
              maxImages={9}
            />
          </div>
        </div>
      </ModalForm>

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
