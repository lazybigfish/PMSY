import { useState, useEffect } from 'react';
import { Search, ExternalLink, MessageCircle, Calendar, Filter, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { HotNews, NewsComment } from '../../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function HotNewsTab() {
  const { user } = useAuth();
  const [news, setNews] = useState<HotNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNews, setSelectedNews] = useState<HotNews | null>(null);
  const [comments, setComments] = useState<NewsComment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  // 加载热点资讯
  const loadNews = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 0 : page;
      
      let query = supabase
        .from('hot_news')
        .select('*')
        .order('published_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,summary.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 获取评论数
      if (data && data.length > 0) {
        const newsIds = data.map(n => n.id);
        const { data: commentData } = await supabase
          .from('news_comments')
          .select('news_id')
          .in('news_id', newsIds);

        const commentCounts = commentData?.reduce((acc, curr) => {
          acc[curr.news_id] = (acc[curr.news_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const newsWithCounts = data.map(n => ({
          ...n,
          comments_count: commentCounts[n.id] || 0
        }));

        if (reset) {
          setNews(newsWithCounts);
        } else {
          setNews(prev => [...prev, ...newsWithCounts]);
        }
        
        setHasMore(data.length === PAGE_SIZE);
        if (!reset) {
          setPage(currentPage + 1);
        }
      } else {
        if (reset) setNews([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载评论
  const loadComments = async (newsId: string) => {
    try {
      const { data, error } = await supabase
        .from('news_comments')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url)
        `)
        .eq('news_id', newsId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  // 提交评论
  const submitComment = async () => {
    if (!commentContent.trim() || !selectedNews || !user) return;

    try {
      setSubmittingComment(true);
      const { error } = await supabase
        .from('news_comments')
        .insert({
          news_id: selectedNews.id,
          user_id: user.id,
          content: commentContent.trim()
        });

      if (error) throw error;

      setCommentContent('');
      await loadComments(selectedNews.id);
      
      // 更新评论数显示
      setNews(prev => prev.map(n => 
        n.id === selectedNews.id 
          ? { ...n, comments_count: (n.comments_count || 0) + 1 }
          : n
      ));
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  // 打开详情弹窗
  const openDetail = async (news: HotNews) => {
    setSelectedNews(news);
    await loadComments(news.id);
  };

  // 关闭详情弹窗
  const closeDetail = () => {
    setSelectedNews(null);
    setComments([]);
    setCommentContent('');
  };

  // 初始加载
  useEffect(() => {
    loadNews(true);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="搜索热点资讯..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Filter className="w-4 h-4" />
          筛选
        </button>
      </div>

      {/* 资讯列表 */}
      {loading && news.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500">暂无热点资讯</p>
        </div>
      ) : (
        <div className="space-y-4">
          {news.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openDetail(item)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                    {item.summary}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {item.keywords && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                        #{item.keywords}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(item.published_at), 'MM-dd HH:mm', { locale: zhCN })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {item.comments_count || 0}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
              </div>
            </div>
          ))}

          {/* 加载更多 */}
          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={() => loadNews()}
                disabled={loading}
                className="px-6 py-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
              >
                {loading ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 详情弹窗 */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedNews.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedNews.source} · {format(new Date(selectedNews.published_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                </p>
              </div>
              <button
                onClick={closeDetail}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose max-w-none mb-6">
                <p className="text-gray-700 whitespace-pre-wrap">{selectedNews.summary}</p>
              </div>
              
              <a
                href={selectedNews.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                阅读原文
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* 评论区 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  评论 ({comments.length})
                </h3>

                {/* 评论列表 */}
                <div className="space-y-4 mb-6">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-blue-600">
                          {comment.user?.full_name?.[0] || 'U'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {comment.user?.full_name || '未知用户'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(comment.created_at), 'MM-dd HH:mm')}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 评论输入 */}
                {user && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <textarea
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        placeholder="写下你的评论..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                    <button
                      onClick={submitComment}
                      disabled={!commentContent.trim() || submittingComment}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submittingComment ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      发布
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
