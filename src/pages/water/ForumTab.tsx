import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Loader2, MessageSquare, Filter, Pin, Star, Edit2, Trash2, Eye } from 'lucide-react';
import { api, apiClient } from '../../lib/api';
import { useAuth } from '../../context/AuthContextNew';
import { useTheme } from '../../context/ThemeContext';
import { ForumPost, ForumCategory } from '../../types';
import { ForumPostList } from './components/ForumPostList';
import { ModalForm, ConfirmModal } from '../../components/Modal';
import { ImagePreview } from '../../components/ImagePreview';
import { LikeButton } from '../../components/LikeButton';
import { Avatar } from '../../components/Avatar';
import { ThemedButton } from '../../components/theme/ThemedButton';
import { ThemedCard } from '../../components/theme/ThemedCard';
import { ImageUploader } from '../../components/upload';
import { Pagination } from '../../components/Pagination';

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

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Create post modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<ForumCategory>('tech');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 编辑相关状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<ForumCategory>('tech');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // 删除确认弹窗
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPost, setDeletingPost] = useState<ForumPost | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    loadPosts();
  }, [selectedCategory, searchQuery, currentPage]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      
      // 先获取总数
      let countQuery: any = api.db
        .from('forum_posts')
        .select('id');
      
      if (selectedCategory !== 'all') {
        countQuery = countQuery.eq('category', selectedCategory);
      }
      
      const countResult = await countQuery;
      const totalCount = countResult.data?.length || 0;
      setTotalItems(totalCount);

      // 获取分页数据
      let query: any = api.db
        .from('forum_posts')
        .select('*');

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      // 分页
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

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

      // 排序：置顶帖子优先，然后按创建时间倒序
      filteredPosts.sort((a: any, b: any) => {
        // 首先按 is_pinned 排序（true 在前）
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        // 然后按 created_at 倒序
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

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

    // 使用新架构上传的图片URL已经是可直接存储的URL
    const uploadedImages = formImages;

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

  // 打开删除确认弹窗
  const openDeleteConfirm = (post: ForumPost, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingPost(post);
    setShowDeleteConfirm(true);
  };

  // 执行删除
  const executeDelete = async () => {
    if (!deletingPost) return;

    try {
      setDeleteSubmitting(true);
      await apiClient.post('/rest/v1/delete', {
        table: 'forum_replies',
        conditions: { post_id: deletingPost.id }
      });
      await apiClient.post('/rest/v1/delete', {
        table: 'forum_posts',
        conditions: { id: deletingPost.id }
      });
      setShowDeleteConfirm(false);
      setDeletingPost(null);
      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('删除失败');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // 打开编辑弹窗
  const openEditModal = (post: ForumPost, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(parseContent(post.content).text);
    setEditCategory(post.category);
    setShowEditModal(true);
  };

  // 提交编辑
  const submitEdit = async () => {
    if (!editingPost || !editTitle.trim() || !editContent.trim()) return;

    try {
      setEditSubmitting(true);
      const currentImages = parseContent(editingPost.content).images;

      await api.db.from('forum_posts').update({
        title: editTitle.trim(),
        content: { text: editContent.trim(), images: currentImages },
        category: editCategory,
        updated_at: new Date().toISOString()
      }).eq('id', editingPost.id);

      setShowEditModal(false);
      setEditingPost(null);
      loadPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      alert('更新失败');
    } finally {
      setEditSubmitting(false);
    }
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
            await apiClient.post('/rest/v1/delete', {
              table: 'forum_likes',
              conditions: { id: like.id }
            });
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
              className={`card p-5 cursor-pointer transition-all duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5 hover:border-primary-300 group ${
                post.is_pinned ? 'border-l-4 border-l-yellow-400 bg-gradient-to-r from-yellow-50/50 to-transparent' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Author Avatar */}
                <div 
                  className="flex-shrink-0"
                  onClick={() => openPostDetail(post)}
                >
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
                <div 
                  className="flex-1 min-w-0"
                  onClick={() => openPostDetail(post)}
                >
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
                    {parseContent(post.content).text}
                  </p>

                  {/* 图片预览 */}
                  {parseContent(post.content).images.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {parseContent(post.content).images.slice(0, 4).map((imgUrl: string, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-dark-100 cursor-pointer group"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImages(parseContent(post.content).images);
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
                      {parseContent(post.content).images.length > 4 && (
                        <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-dark-200 flex items-center justify-center text-dark-500 text-sm">
                          +{parseContent(post.content).images.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meta Info - 包含阅读量、回复量、点赞量 */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4 text-xs text-dark-500">
                      <span className="font-medium text-dark-700">{post.author?.full_name || '未知用户'}</span>
                      <span className="w-1 h-1 rounded-full bg-dark-300"></span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      <span className="w-1 h-1 rounded-full bg-dark-300"></span>
                      {/* 阅读量 */}
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {post.view_count || 0}
                      </span>
                      {/* 回复量 */}
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {post.reply_count || 0}
                      </span>
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

                {/* Actions - 管理员和作者操作按钮（水平排列） */}
                <div 
                  className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                  onClick={(e) => e.stopPropagation()}
                >
                  {isAdmin && (
                    <>
                      <button
                        onClick={(e) => togglePin(post, e)}
                        className={`p-1.5 rounded-md transition-all ${
                          post.is_pinned 
                            ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200' 
                            : 'text-dark-400 hover:text-yellow-600 hover:bg-yellow-50'
                        }`}
                        title={post.is_pinned ? '取消置顶' : '置顶'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => toggleEssence(post, e)}
                        className={`p-1.5 rounded-md transition-all ${
                          post.is_essence 
                            ? 'text-orange-600 bg-orange-100 hover:bg-orange-200' 
                            : 'text-dark-400 hover:text-orange-600 hover:bg-orange-50'
                        }`}
                        title={post.is_essence ? '取消精华' : '设为精华'}
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {(isAuthor || isAdmin) && (
                    <>
                      <button
                        onClick={(e) => openEditModal(post, e)}
                        className="p-1.5 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-all"
                        title="编辑"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => openDeleteConfirm(post, e)}
                        className="p-1.5 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
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
            <ImageUploader
              value={formImages}
              onChange={setFormImages}
              maxCount={9}
              maxSize={5 * 1024 * 1024}
              compress="post"
              bucket="images"
              folder="forum"
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

      {/* 编辑帖子弹窗 */}
      <ModalForm
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPost(null);
        }}
        onSubmit={submitEdit}
        title="编辑帖子"
        maxWidth="2xl"
        submitText="保存"
        isSubmitting={editSubmitting}
        submitDisabled={!editTitle.trim() || !editContent.trim()}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">分类</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as ForumCategory)}
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
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
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
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              className="input w-full resize-none"
              placeholder="请输入内容"
              required
            />
          </div>
        </div>
      </ModalForm>

      {/* 删除确认弹窗 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingPost(null);
        }}
        onConfirm={executeDelete}
        title="删除帖子"
        message={`确定要删除帖子「${deletingPost?.title}」吗？此操作将同时删除该帖子下的所有回复，且无法恢复。`}
        confirmText="删除"
        cancelText="取消"
        isLoading={deleteSubmitting}
        type="danger"
      />

      {/* 分页组件 */}
      {!loading && posts.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / pageSize)}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}
    </div>
  );
}
