import React from 'react';
import { MessageSquare, Eye, ThumbsUp, Flame } from 'lucide-react';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  view_count: number;
  like_count: number;
  reply_count: number;
  created_at: string;
  author?: {
    full_name?: string;
  } | null;
}

interface HotNewsProps {
  posts: ForumPost[];
  onOpenPost: (post: ForumPost) => void;
}

export function HotNews({ posts, onOpenPost }: HotNewsProps) {
  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow border border-dark-100 dark:border-dark-700">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-dark-100 dark:border-dark-700">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-dark-100 flex items-center gap-2">
          <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          热门帖子
        </h2>
      </div>

      <div className="divide-y divide-dark-100 dark:divide-dark-700 max-h-96 overflow-y-auto scrollbar-hide">
        {posts.map((post) => (
          <div
            key={post.id}
            className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors cursor-pointer min-h-touch"
            onClick={() => onOpenPost(post)}
          >
            <h3 className="text-sm font-medium text-gray-900 dark:text-dark-100 line-clamp-2">{post.title}</h3>
            <p className="text-xs text-gray-500 dark:text-dark-400 mt-1 line-clamp-2">{post.content}</p>
            <div className="flex flex-wrap items-center justify-between mt-2 text-xs text-gray-400 dark:text-dark-500 gap-2">
              <span className="truncate max-w-[100px]">{post.author?.full_name || '未知用户'}</span>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {post.view_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {post.like_count || 0}
                </span>
                <span className="hidden sm:flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {post.reply_count || 0}
                </span>
                <span className="hidden sm:inline">{new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="p-6 sm:p-8 text-center text-gray-500 dark:text-dark-400">
            <p className="text-sm">暂无热门帖子</p>
          </div>
        )}
      </div>
    </div>
  );
}
