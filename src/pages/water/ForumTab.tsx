import { useState, useEffect } from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ForumPost, ForumReply, ForumCategory } from '../../types';
import { ForumPostList } from './components/ForumPostList';
import { ForumPostDetail } from './components/ForumPostDetail';

const categories: { key: ForumCategory; label: string; color: string }[] = [
  { key: 'tech', label: '技术分享', color: 'bg-blue-100 text-blue-700' },
  { key: 'experience', label: '项目经验', color: 'bg-green-100 text-green-700' },
  { key: 'help', label: '问题求助', color: 'bg-orange-100 text-orange-700' },
  { key: 'chat', label: '闲聊', color: 'bg-purple-100 text-purple-700' },
  { key: 'other', label: '其他', color: 'bg-gray-100 text-gray-700' },
];

export default function ForumTab() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | 'all'>('all');
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);

  // Create post modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<ForumCategory>('tech');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    loadPosts();
  }, [selectedCategory, searchQuery]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('forum_posts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('last_reply_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content->>text.ilike.%${searchQuery}%`);
      }

      const { data: postsData, error } = await query;
      if (error) throw error;

      // Fetch user info
      const userIds = new Set<string>();
      postsData?.forEach(post => {
        if (post.author_id) userIds.add(post.author_id);
        if (post.last_reply_by) userIds.add(post.last_reply_by);
      });

      const userMap = new Map<string, { id: string; full_name: string; avatar_url?: string }>();
      if (userIds.size > 0) {
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(userIds));
        usersData?.forEach(u => userMap.set(u.id, u));
      }

      const postsWithUsers = (postsData || []).map(post => ({
        ...post,
        author: userMap.get(post.author_id),
        last_reply_user: post.last_reply_by ? userMap.get(post.last_reply_by) : null
      }));

      setPosts(postsWithUsers);
    } catch (error) {
      console.error('Error loading posts:', error);
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
        author: authorMap.get(reply.author_id)
      }));

      setReplies(repliesWithAuthors);
    } catch (error) {
      console.error('Error loading replies:', error);
    }
  };

  const createPost = async () => {
    if (!formTitle.trim() || !formContent.trim() || !user) {
      alert('请填写标题和内容');
      return;
    }

    try {
      setSubmitting(true);
      const now = new Date().toISOString();

      const { error } = await supabase.from('forum_posts').insert({
        title: formTitle.trim(),
        content: { text: formContent.trim() },
        author_id: user.id,
        category: formCategory,
        is_pinned: false,
        is_essence: false,
        view_count: 0,
        reply_count: 0,
        last_reply_at: now,
        last_reply_by: user.id,
      });

      if (error) throw error;

      setShowCreateModal(false);
      setFormTitle('');
      setFormContent('');
      loadPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async (content: string) => {
    if (!selectedPost || !user) return;

    await supabase.from('forum_replies').insert({
      post_id: selectedPost.id,
      author_id: user.id,
      content: { text: content }
    });

    const now = new Date().toISOString();
    await supabase
      .from('forum_posts')
      .update({
        reply_count: selectedPost.reply_count + 1,
        last_reply_at: now,
        last_reply_by: user.id
      })
      .eq('id', selectedPost.id);

    loadReplies(selectedPost.id);
    loadPosts();
  };

  const togglePin = async (post: ForumPost, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = !post.is_pinned;
    await supabase.from('forum_posts').update({ is_pinned: newPinned }).eq('id', post.id);
    loadPosts();
  };

  const toggleEssence = async (post: ForumPost, e: React.MouseEvent) => {
    e.stopPropagation();
    const newEssence = !post.is_essence;
    await supabase.from('forum_posts').update({ is_essence: newEssence }).eq('id', post.id);
    loadPosts();
  };

  const deletePost = async (post: ForumPost, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定要删除帖子「${post.title}」吗？`)) return;

    await supabase.from('forum_replies').delete().eq('post_id', post.id);
    await supabase.from('forum_posts').delete().eq('id', post.id);
    loadPosts();
  };

  const deleteReply = async (reply: ForumReply) => {
    if (!selectedPost) return;
    if (!confirm('确定要删除这条回复吗？')) return;

    await supabase.from('forum_replies').delete().eq('id', reply.id);
    await supabase
      .from('forum_posts')
      .update({ reply_count: selectedPost.reply_count - 1 })
      .eq('id', selectedPost.id);

    loadReplies(selectedPost.id);
    loadPosts();
  };

  const openPostDetail = async (post: ForumPost) => {
    setSelectedPost(post);
    await loadReplies(post.id);
    await supabase
      .from('forum_posts')
      .update({ view_count: post.view_count + 1 })
      .eq('id', post.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Create */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="搜索帖子..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          发布帖子
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            selectedCategory === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              selectedCategory === cat.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Post List */}
      <ForumPostList
        posts={posts}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        onSelectPost={openPostDetail}
        onEditPost={() => {}}
        onDeletePost={deletePost}
        onTogglePin={togglePin}
        onToggleEssence={toggleEssence}
      />

      {/* Post Detail Modal */}
      {selectedPost && (
        <ForumPostDetail
          post={selectedPost}
          replies={replies}
          isAdmin={isAdmin}
          currentUserId={user?.id}
          onClose={() => setSelectedPost(null)}
          onSubmitReply={submitReply}
          onDeleteReply={deleteReply}
        />
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">发布新帖子</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ForumCategory)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {categories.map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="请输入标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={6}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="请输入内容"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={createPost}
                disabled={!formTitle.trim() || !formContent.trim() || submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
