
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Task } from '../types';
import { 
  Loader2, 
  CheckSquare, 
  Plus, 
  Calendar,
  ExternalLink,
  X,
  Send,
  Sparkles,
  TrendingUp,
  Clock,
  AlertCircle,
  FolderOpen,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatsCards } from './dashboard/components/StatsCards';
import { MyTasks } from './dashboard/components/MyTasks';
import { HotNews } from './dashboard/components/HotNews';
 
const HOT_NEWS_DISPLAY_LIMIT = 20;

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  taskTotal: number;
  overdueTasks: number;
  highPriorityTasks: number;
  pendingRisks: number;
  totalBudget: number;
}

interface HotNewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
}

interface NewsComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user?: {
    id: string;
    full_name?: string;
    username?: string;
  } | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    taskTotal: 0,
    overdueTasks: 0,
    highPriorityTasks: 0,
    pendingRisks: 0,
    totalBudget: 0
  });
  
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [hotNews, setHotNews] = useState<HotNewsItem[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [activeNews, setActiveNews] = useState<HotNewsItem | null>(null);
  const [comments, setComments] = useState<NewsComment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // 获取当前问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早安';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchCommentCounts = async (newsIds: string[]) => {
    if (newsIds.length === 0) return {} as Record<string, number>;
    const { data, error } = await supabase
      .from('news_comments')
      .select('news_id')
      .in('news_id', newsIds);

    if (error) {
      console.error('Error fetching comment counts:', error);
      return {} as Record<string, number>;
    }

    const counts: Record<string, number> = {};
    for (const row of (data || []) as { news_id: string }[]) {
      const id = row.news_id;
      counts[id] = (counts[id] || 0) + 1;
    }
    return counts;
  };

  const fetchCommentsForNews = async (newsId: string) => {
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('news_comments')
        .select('id, content, created_at, user_id, user:profiles(id, full_name, username)')
        .eq('news_id', newsId)
        .order('created_at', { ascending: true });

      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('news_comments')
          .select('id, content, created_at, user_id')
          .eq('news_id', newsId)
          .order('created_at', { ascending: true });

        if (fallbackError) throw fallbackError;
        setComments((fallbackData || []) as unknown as NewsComment[]);
        return;
      }

      setComments((data || []) as unknown as NewsComment[]);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const openNews = async (news: HotNewsItem) => {
    setActiveNews(news);
    setCommentDraft('');
    await fetchCommentsForNews(news.id);
  };

  const closeNews = () => {
    setActiveNews(null);
    setComments([]);
    setCommentDraft('');
  };

  const submitComment = async () => {
    if (!user || !activeNews) return;
    const content = commentDraft.trim();
    if (!content) return;

    setCommentSubmitting(true);
    try {
      const { error } = await supabase.from('news_comments').insert({
        news_id: activeNews.id,
        user_id: user.id,
        content
      });
      if (error) throw error;

      setCommentDraft('');
      setCommentCounts((prev) => ({
        ...prev,
        [activeNews.id]: (prev[activeNews.id] || 0) + 1
      }));
      await fetchCommentsForNews(activeNews.id);
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('评论发布失败');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Projects & Calculate Stats
      const { data: projects } = await supabase.from('projects').select('*');
      
      const totalProjects = projects?.length || 0;
      const activeProjects = projects?.filter(p => p.status === 'in_progress').length || 0;
      const completedProjects = projects?.filter(p => p.status === 'completed').length || 0;
      void projects;
      
      // Calculate total budget
      const totalBudget = projects
        ?.filter((p) => p.manager_id === user?.id)
        .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // 2. Fetch My Tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', user?.id)
        .neq('status', 'done')
        .order('due_date', { ascending: true });
        
      const myTaskList = tasks || [];
      setMyTasks(myTaskList.slice(0, 6));
      
      // Calculate Stats from tasks
      const highPriorityCount = myTaskList.filter(t => t.priority === 'high').length;
      
      // Task Center aligned stats
      const { data: tasksForStats } = await supabase
        .from('tasks')
        .select('id, status, due_date');
        
      const taskTotal = tasksForStats?.length || 0;
      const overdueCount = (tasksForStats || []).filter((t: { due_date?: string; status?: string }) => {
        if (!t.due_date || t.status === 'done' || t.status === 'canceled') return false;
        const due = new Date(t.due_date);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return due < now;
      }).length;

      // 3. Fetch Risks
      const { count: riskCount } = await supabase
        .from('risks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // 4. Fetch Hot News
      const { data: newsData } = await supabase
        .from('hot_news')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(HOT_NEWS_DISPLAY_LIMIT);
        
      if (newsData) {
        setHotNews(newsData);
        const counts = await fetchCommentCounts(newsData.map((n) => n.id));
        setCommentCounts(counts);
      } else {
        setHotNews([]);
        setCommentCounts({});
      }

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        taskTotal,
        overdueTasks: overdueCount,
        highPriorityTasks: highPriorityCount,
        pendingRisks: riskCount || 0,
        totalBudget
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 w-16 h-16 rounded-2xl gradient-primary blur-xl opacity-50 animate-pulse"></div>
        </div>
        <p className="text-dark-500 mt-4 font-medium">正在加载数据...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-dark-900 flex items-center gap-3">
            {getGreeting()}，{user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            <span className="text-3xl">👋</span>
          </h1>
          <p className="mt-2 text-dark-500 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            今天是 {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/tasks" className="btn-secondary">
            <CheckSquare className="w-4 h-4" />
            我的任务
          </Link>
          <Link to="/projects/new" className="btn-primary shadow-glow">
            <Plus className="w-4 h-4" />
            新建项目
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2/3): Hot News */}
        <div className="lg:col-span-2">
          <HotNews 
            news={hotNews} 
            commentCounts={commentCounts} 
            onOpenNews={openNews} 
          />
        </div>

        {/* Right Column (1/3): My Tasks */}
        <div>
          <MyTasks tasks={myTasks} />
        </div>
      </div>

      {/* News Detail Modal */}
      {activeNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm" onClick={closeNews} />
          <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-dark-100 overflow-hidden max-h-[90vh] flex flex-col animate-scale-in">
            <div className="px-6 py-5 border-b border-dark-100 flex items-start justify-between gap-4 bg-gradient-to-r from-primary-50/50 to-transparent">
              <div className="min-w-0">
                <h3 className="text-xl font-display font-bold text-dark-900">{activeNews.title}</h3>
                <div className="mt-2 flex items-center gap-3 text-sm text-dark-500">
                  <span className="badge badge-primary">{activeNews.source}</span>
                  <span>{new Date(activeNews.published_at).toLocaleString()}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeNews}
                className="p-2 rounded-xl text-dark-400 hover:text-dark-700 hover:bg-dark-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="text-dark-700 leading-relaxed whitespace-pre-wrap text-base">
                {activeNews.summary}
              </div>
              <div>
                <a
                  href={activeNews.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-2 font-semibold"
                >
                  阅读原文 <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Comments Section */}
              <div className="border-t border-dark-100 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-display font-semibold text-dark-900 flex items-center gap-2">
                    评论 
                    <span className="badge badge-dark">{comments.length}</span>
                  </h4>
                </div>
                
                {commentsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="animate-spin h-6 w-6 text-primary-500 mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-4 max-h-60 overflow-y-auto scrollbar-thin">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
                          <span className="text-white text-sm font-bold">
                            {comment.user?.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-dark-900">{comment.user?.full_name || '未知用户'}</span>
                            <span className="text-xs text-dark-400">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-dark-700 mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <div className="text-center py-8 bg-dark-50 rounded-xl">
                        <p className="text-dark-400">暂无评论，来发表第一条评论吧！</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Add Comment */}
                <div className="mt-5 flex gap-3">
                  <input
                    type="text"
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                    placeholder="写下你的评论..."
                    className="input flex-1"
                  />
                  <button
                    onClick={submitComment}
                    disabled={commentSubmitting || !commentDraft.trim()}
                    className="btn-primary px-4"
                  >
                    {commentSubmitting ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
