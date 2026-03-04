// 水区模块类型定义

// 论坛分类
export type ForumCategory = 'tech' | 'experience' | 'help' | 'chat' | 'other';

// 论坛帖子内容（支持纯文本和 JSON 格式）
export type ForumPostContent = string | {
  text?: string;
  content?: string;
  images?: string[];
};

// 论坛帖子
export interface ForumPost {
  id: string;
  title: string;
  content: ForumPostContent;
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

// 论坛回复内容（支持纯文本和 JSON 格式）
export type ForumReplyContent = string | {
  text?: string;
  content?: string;
  images?: string[];
};

// 论坛回复
export interface ForumReply {
  id: string;
  post_id: string;
  content: ForumReplyContent;
  author_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  floor_number?: string;
  children?: ForumReply[];
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  parent_author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}


