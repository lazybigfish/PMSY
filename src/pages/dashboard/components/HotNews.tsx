import React from 'react';
import { MessageSquare, Flame } from 'lucide-react';

interface HotNews {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
}

interface HotNewsProps {
  news: HotNews[];
  commentCounts: Record<string, number>;
  onOpenNews: (news: HotNews) => void;
}

export function HotNews({ news, commentCounts, onOpenNews }: HotNewsProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          热门资讯
        </h2>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {news.map((item) => (
          <div
            key={item.id}
            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => onOpenNews(item)}
          >
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>{item.source}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {commentCounts[item.id] || 0}
                </span>
                <span>{new Date(item.published_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          </div>
        ))}

        {news.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>暂无热门资讯</p>
          </div>
        )}
      </div>
    </div>
  );
}
