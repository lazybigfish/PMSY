/**
 * 水区/论坛服务
 * 替代原有的 Supabase 论坛相关调用
 */

import { api } from '../lib/api';

// 论坛帖子
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author_id: string;
  category: string;
  views: number;
  likes: number;
  is_pinned: boolean;
  is_hot: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// 论坛回复
export interface ForumReply {
  id: string;
  post_id: string;
  content: string;
  author_id: string;
  parent_id: string | null;
  likes: number;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// 帖子详情（包含回复）
export interface ForumPostDetail extends ForumPost {
  replies: ForumReply[];
}

/**
 * 获取帖子列表
 */
export async function getPosts(options: {
  category?: string;
  isHot?: boolean;
  isPinned?: boolean;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ posts: ForumPost[]; total: number }> {
  const { category, isHot, isPinned, page = 0, pageSize = 20 } = options;

  let query = api.db.from('forum_posts')
    .select('*');

  if (category) {
    query = query.eq('category', category);
  }

  if (isHot !== undefined) {
    query = query.eq('is_hot', isHot);
  }

  if (isPinned !== undefined) {
    query = query.eq('is_pinned', isPinned);
  }

  const { data } = await query.range(page * pageSize, (page + 1) * pageSize - 1);

  // 获取总数
  const { data: countData } = await api.db.from('forum_posts').select('id');

  return {
    posts: data || [],
    total: countData?.length || 0,
  };
}

/**
 * 获取热门帖子
 */
export async function getHotPosts(limit: number = 10): Promise<ForumPost[]> {
  const { data } = await api.db.from('forum_posts')
    .select('*')
    .eq('is_hot', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * 获取帖子详情（包含回复）
 */
export async function getPostById(postId: string): Promise<ForumPostDetail | null> {
  // 1. 获取帖子
  const { data: post } = await api.db.from('forum_posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (!post?.data) return null;

  // 2. 增加浏览量
  await api.db.from('forum_posts').update({
    views: (post.data.views || 0) + 1,
  }).eq('id', postId);

  // 3. 获取回复
  const { data: replies } = await api.db.from('forum_replies')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  return {
    ...post.data,
    views: (post.data.views || 0) + 1,
    replies: replies || [],
  };
}

/**
 * 创建帖子
 */
export async function createPost(data: {
  title: string;
  content: string;
  category: string;
}): Promise<ForumPost> {
  const result = await api.db.from('forum_posts').insert({
    title: data.title,
    content: data.content,
    category: data.category,
    views: 0,
    likes: 0,
    is_pinned: false,
    is_hot: false,
  });

  return result?.[0];
}

/**
 * 更新帖子
 */
export async function updatePost(
  postId: string,
  data: { title?: string; content?: string; category?: string }
): Promise<ForumPost> {
  const result = await api.db.from('forum_posts').update({
    title: data.title,
    content: data.content,
    category: data.category,
  }).eq('id', postId);

  return result?.[0];
}

/**
 * 删除帖子
 */
export async function deletePost(postId: string): Promise<void> {
  await api.db.from('forum_posts').delete().eq('id', postId);
}

/**
 * 点赞帖子
 */
export async function likePost(postId: string): Promise<void> {
  const { data: post } = await api.db.from('forum_posts')
    .select('likes')
    .eq('id', postId)
    .single();

  if (post?.data) {
    await api.db.from('forum_posts').update({
      likes: (post.data.likes || 0) + 1,
    }).eq('id', postId);
  }
}

/**
 * 获取回复列表
 */
export async function getReplies(postId: string): Promise<ForumReply[]> {
  const { data } = await api.db.from('forum_replies')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  return data || [];
}

/**
 * 添加回复
 */
export async function addReply(data: {
  post_id: string;
  content: string;
  parent_id?: string | null;
}): Promise<ForumReply> {
  const result = await api.db.from('forum_replies').insert({
    post_id: data.post_id,
    content: data.content,
    parent_id: data.parent_id || null,
    likes: 0,
  });

  return result?.[0];
}

/**
 * 更新回复
 */
export async function updateReply(
  replyId: string,
  data: { content: string }
): Promise<ForumReply> {
  const result = await api.db.from('forum_replies').update({
    content: data.content,
  }).eq('id', replyId);

  return result?.[0];
}

/**
 * 删除回复
 */
export async function deleteReply(replyId: string): Promise<void> {
  await api.db.from('forum_replies').delete().eq('id', replyId);
}

/**
 * 点赞回复
 */
export async function likeReply(replyId: string): Promise<void> {
  const { data: reply } = await api.db.from('forum_replies')
    .select('likes')
    .eq('id', replyId)
    .single();

  if (reply?.data) {
    await api.db.from('forum_replies').update({
      likes: (reply.data.likes || 0) + 1,
    }).eq('id', replyId);
  }
}

// 导出服务对象
export const forumService = {
  getPosts,
  getHotPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  likePost,
  getReplies,
  addReply,
  updateReply,
  deleteReply,
  likeReply,
};
