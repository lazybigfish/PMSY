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
    <div className="bg-white rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          热门帖子
        </h2>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {posts.map((post) => (
          <div
            key={post.id}
            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => onOpenPost(post)}
          >
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{post.title}</h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.content}</p>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>{post.author?.full_name || '未知用户'}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {post.view_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {post.like_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {post.reply_count || 0}
                </span>
                <span>{new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>暂无热门帖子</p>
          </div>
        )}
      </div>
    </div>
  );
}
