
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Task } from '../types';
import { getUserAccessibleTasks } from '../services/taskService';
import { 
  CheckSquare, 
  Plus, 
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContextNew';
import { useTheme } from '../context/ThemeContext';
import { StatsCards } from './dashboard/components/StatsCards';
import { MyTasks } from './dashboard/components/MyTasks';
import { HotNews } from './dashboard/components/HotNews';
import { ThemedButton } from '../components/theme/ThemedButton';
import { ThemedSpinner } from '../components/theme/ThemedLoading';

// 辅助函数：解析帖子内容
const parseContent = (content: any): string => {
  if (!content) return '';
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      return parsed.text || parsed.content || content;
    } catch {
      return content;
    }
  }
  if (typeof content === 'object') {
    return content.text || content.content || '';
  }
  return String(content);
};
 
const HOT_POSTS_DISPLAY_LIMIT = 5;

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

interface HotPostItem {
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

const Dashboard = () => {
  const { user } = useAuth();
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';
  const navigate = useNavigate();
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
  const [hotPosts, setHotPosts] = useState<HotPostItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const openPost = (post: HotPostItem) => {
    navigate(`/water/forum/${post.id}`);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. 获取用户可访问的项目列表
      const { data: userMemberships } = await api.db
        .from('project_members')
        .select('project_id')
        .eq('user_id', user?.id);

      const memberProjectIds = (userMemberships || []).map((m: { project_id: string }) => m.project_id);

      const { data: managedProjects } = await api.db
        .from('projects')
        .select('id')
        .eq('manager_id', user?.id);

      const managedProjectIds = (managedProjects || []).map((p: { id: string }) => p.id);
      const accessibleProjectIds = [...new Set([...memberProjectIds, ...managedProjectIds])];

      // 获取用户有权限的项目详情
      let accessibleProjects: any[] = [];
      if (accessibleProjectIds.length > 0) {
        const { data: projectsData } = await api.db
          .from('projects')
          .select('*')
          .in('id', accessibleProjectIds);
        accessibleProjects = projectsData || [];
      }

      const totalProjects = accessibleProjects.length;
      const activeProjects = accessibleProjects.filter((p: any) => p.status === 'in_progress').length;
      const completedProjects = accessibleProjects.filter((p: any) => p.status === 'completed').length;

      // Calculate total budget (only for projects where user is manager)
      const totalBudget = accessibleProjects
        .filter((p: any) => p.manager_id === user?.id)
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0;

      // 2. 获取用户可访问的任务列表（使用统一的服务函数）
      const myTaskList = await getUserAccessibleTasks(user?.id || '', {
        excludeStatus: ['done'],
        orderBy: 'due_date',
        orderDirection: 'asc'
      });
      setMyTasks(myTaskList.slice(0, 6));

      // Calculate Stats from tasks
      const highPriorityCount = myTaskList.filter((t: any) => t.priority === 'high').length;

      // Task Center aligned stats - 只统计用户可访问的任务
      const taskTotal = myTaskList.length;
      const overdueCount = myTaskList.filter((t: any) => {
        if (!t.due_date || t.status === 'done' || t.status === 'canceled') return false;
        const due = new Date(t.due_date);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return due < now;
      }).length;

      // 3. Fetch Risks - 只统计用户有权限的项目中的风险
      let riskCount = 0;
      try {
        if (accessibleProjectIds.length > 0) {
          const { data: risks } = await api.db
            .from('risks')
            .select('id')
            .in('project_id', accessibleProjectIds)
            .eq('status', 'open');
          riskCount = risks?.length || 0;
        }
      } catch (e) {
        console.warn('Could not fetch risks:', e);
      }

      // 4. Fetch Hot Posts from forum_posts (按当日浏览量+点赞量排序)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const { data: postsData } = await api.db
        .from('forum_posts')
        .select('id, title, content, view_count, like_count, reply_count, created_at, author_id')
        .gte('created_at', todayStr)
        .order('view_count', { ascending: false })
        .limit(HOT_POSTS_DISPLAY_LIMIT);

      if (postsData && postsData.length > 0) {
        // 获取作者信息
        const authorIds = new Set<string>();
        postsData.forEach((post: any) => {
          if (post.author_id) authorIds.add(post.author_id);
        });

        const authorMap = new Map<string, { full_name?: string }>();
        if (authorIds.size > 0) {
          const { data: authorsData } = await api.db
            .from('profiles')
            .select('id, full_name')
            .in('id', Array.from(authorIds));
          authorsData?.forEach((a: any) => authorMap.set(a.id, a));
        }

        const postsWithAuthors = postsData.map((post: any) => ({
          ...post,
          content: parseContent(post.content),
          author: authorMap.get(post.author_id) || null
        }));

        setHotPosts(postsWithAuthors);
      } else {
        // 如果当日没有帖子，获取最近的5条帖子
        const { data: recentPosts } = await api.db
          .from('forum_posts')
          .select('id, title, content, view_count, like_count, reply_count, created_at, author_id')
          .order('created_at', { ascending: false })
          .limit(HOT_POSTS_DISPLAY_LIMIT);

        if (recentPosts) {
          const authorIds = new Set<string>();
          recentPosts.forEach((post: any) => {
            if (post.author_id) authorIds.add(post.author_id);
          });

          const authorMap = new Map<string, { full_name?: string }>();
          if (authorIds.size > 0) {
            const { data: authorsData } = await api.db
              .from('profiles')
              .select('id, full_name')
              .in('id', Array.from(authorIds));
            authorsData?.forEach((a: any) => authorMap.set(a.id, a));
          }

          const postsWithAuthors = recentPosts.map((post: any) => ({
            ...post,
            content: parseContent(post.content),
            author: authorMap.get(post.author_id) || null
          }));

          setHotPosts(postsWithAuthors);
        } else {
          setHotPosts([]);
        }
      }

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        taskTotal,
        overdueTasks: overdueCount,
        highPriorityTasks: highPriorityCount,
        pendingRisks: riskCount,
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
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse"
            style={{
              background: `linear-gradient(135deg, ${colors.primary[400]}, ${colors.primary[600]})`,
              boxShadow: `0 0 30px ${colors.primary[500]}40`,
            }}
          >
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div
            className="absolute inset-0 w-16 h-16 rounded-2xl blur-xl opacity-50 animate-pulse"
            style={{
              background: `linear-gradient(135deg, ${colors.primary[400]}, ${colors.primary[600]})`,
            }}
          />
        </div>
        <p className={`mt-4 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          正在加载数据...
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {getGreeting()}，{user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            <span className="text-xl sm:text-2xl lg:text-3xl">👋</span>
          </h1>
          <p className={`mt-1 sm:mt-2 flex items-center gap-2 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">
              今天是 {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
            <span className="sm:hidden">
              {new Date().toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}
            </span>
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Link to="/tasks">
            <ThemedButton variant="secondary" size="sm" className="text-xs sm:text-sm">
              <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">我的任务</span>
              <span className="sm:hidden">任务</span>
            </ThemedButton>
          </Link>
          <Link to="/projects/new">
            <ThemedButton variant="primary" size="sm" className="text-xs sm:text-sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">新建项目</span>
              <span className="sm:hidden">新建</span>
            </ThemedButton>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

        {/* Left Column (2/3): Hot Posts */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <HotNews
            posts={hotPosts}
            onOpenPost={openPost}
          />
        </div>

        {/* Right Column (1/3): My Tasks */}
        <div className="order-1 lg:order-2">
          <MyTasks tasks={myTasks} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
