
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader2, Globe, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function HotNewsConfig() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [keywords, setKeywords] = useState('');
  const [fetchLimit, setFetchLimit] = useState<number>(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingNews, setFetchingNews] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await supabase
        .from('system_configs')
        .select('key, value')
        .in('key', ['hot_topic_keywords', 'hot_news_fetch_limit']);

      const keywordValue = data?.find((row) => row.key === 'hot_topic_keywords')?.value || '';
      setKeywords(keywordValue);

      const limitRaw = data?.find((row) => row.key === 'hot_news_fetch_limit')?.value;
      const parsedLimit = Number(limitRaw);
      if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
        setFetchLimit(parsedLimit);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalizedLimit = Math.max(5, Math.floor(fetchLimit || 0));

      const { error } = await supabase
        .from('system_configs')
        .upsert([
          {
            key: 'hot_topic_keywords',
            value: keywords,
            description: '首页热点新闻抓取关键词，用逗号分隔'
          },
          {
            key: 'hot_news_fetch_limit',
            value: String(normalizedLimit),
            description: '每日热点抓取条数（最少 5）'
          }
        ]);

      if (error) throw error;
      alert('配置已保存');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleManualFetch = async () => {
    setFetchingNews(true);
    try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const token = sessionData.session?.access_token;
        if (!token) throw new Error('未登录或登录状态已失效');

        const resp = await fetch('/api/news/fetch-hot', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const result = await resp.json();
        if (!result?.success) {
          throw new Error(result?.error || '抓取失败');
        }

        alert(`抓取完成：新增 ${result.inserted} 条（本次获取 ${result.fetched} 条，配置上限 ${result.limit}）。`);
    } catch (error) {
        console.error('Fetch error:', error);
        alert('抓取任务触发失败');
    } finally {
        setFetchingNews(false);
    }
  };

  if (loading) return <div>加载中...</div>;
  if (!isAdmin) return <div className="text-sm text-gray-500">仅系统管理员可配置热点抓取规则。</div>;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-600" />
          热点新闻配置
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          配置系统自动抓取互联网热点新闻的关注方向。系统将根据这些关键词，定期搜索并生成摘要展示在首页。
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            关注关键词 (用逗号分隔)
          </label>
          <div className="relative">
            <textarea
              rows={4}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
              placeholder="例如：人工智能, SaaS, 数字化转型, 项目管理, 远程办公"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400">
              当前关键词数: {keywords.split(/[,，]/).filter(k => k.trim()).length}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            建议设置 3-5 个核心领域关键词，以便 AI 能够更精准地为您推荐相关资讯。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              每日抓取数量（最少 5）
            </label>
            <input
              type="number"
              min={5}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
              value={fetchLimit}
              onChange={(e) => setFetchLimit(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
                onClick={handleManualFetch}
                disabled={fetchingNews || !keywords}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
                {fetchingNews ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {fetchingNews ? '正在抓取分析...' : '立即手动抓取一次'}
            </button>

            <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                保存配置
            </button>
        </div>
      </div>
    </div>
  );
}
