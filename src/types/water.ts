// 水区模块类型定义

// 论坛分类
export type ForumCategory = 'tech' | 'experience' | 'help' | 'chat' | 'other';

// 论坛帖子
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  category_id: string;
  category?: ForumCategory;
  author_id: string;
  view_count: number;
  reply_count: number;
  like_count?: number;
  is_pinned: boolean;
  is_essential?: boolean;
  is_essence?: boolean;
  is_liked?: boolean;
  last_reply_at?: string;
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
  text?: string;
  author_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// 热点新闻
export interface HotNews {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  source: string | null;
  source_url: string | null;
  url?: string;
  image_url: string | null;
  view_count: number;
  comment_count: number;
  comments_count?: number;
  keywords?: string;
  is_pinned: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

// 新闻评论
export interface NewsComment {
  id: string;
  news_id: string;
  content: string;
  author_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}
