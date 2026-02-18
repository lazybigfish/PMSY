import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, List, Calendar, User, Users, AlertCircle, CheckCircle, Sparkles, CheckSquare, Clock, Flame, Play } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContextNew';
import { useTheme } from '../../context/ThemeContext';
import { Task, Profile, Project, TaskStatus } from '../../types';
import { TaskTable, TaskWithDetails } from './components/TaskTable';
import TaskFilterBar, { TaskFilterState } from './components/TaskFilterBar';
import { BatchActionBar } from './components/BatchActionBar';
import { BatchDeleteModal } from './components/BatchDeleteModal';
import { BatchStatusModal } from './components/BatchStatusModal';
import { BatchAssignModal } from './components/BatchAssignModal';
import { batchDeleteTasks, batchUpdateTaskStatus, batchAssignTasks } from '../../services/taskService';
import { ThemedButton } from '../../components/theme/ThemedButton';
import { ThemedCard } from '../../components/theme/ThemedCard';

export default function TaskList() {
  const { user } = useAuth();
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'created_at' | 'due_date' | 'priority' | 'completed_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 批量操作弹窗状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [filters, setFilters] = useState<TaskFilterState>({
    keyword: '',
    projectId: '',
    dateRange: { type: 'created', start: '', end: '' },
    // 默认筛除已完成的任务，只展示未开始、进行中、已暂停的任务
    statuses: ['todo', 'in_progress', 'paused'],
    priorities: []
  });

  type ActiveStatCard =
    | 'all'
    | 'in_progress'
    | 'my_primary'
    | 'my_participate'
    | 'done'
    | 'due_this_week'
    | 'due_this_month'
    | 'overdue'
    | null;
  const [activeStatCard, setActiveStatCard] = useState<ActiveStatCard>(null);

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'system_admin';

  useEffect(() => {
    fetchTasks();
    fetchUsers();
    fetchProjects();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      // 1. 获取用户是成员的项目ID列表
      const { data: userMemberships } = await api.db
        .from('project_members')
        .select('project_id')
        .eq('user_id', user?.id);

      const memberProjectIds = (userMemberships || []).map((m: { project_id: string }) => m.project_id);

      // 2. 获取用户作为项目经理的项目ID列表
      const { data: managedProjects } = await api.db
        .from('projects')
        .select('id')
        .eq('manager_id', user?.id);

      const managedProjectIds = (managedProjects || []).map((p: { id: string }) => p.id);

      // 3. 合并用户有权限的项目ID列表（去重）
      const accessibleProjectIds = [...new Set([...memberProjectIds, ...managedProjectIds])];

      // 4. 获取用户创建的任务
      const { data: createdTasks } = await api.db
        .from('tasks')
        .select('*')
        .eq('created_by', user?.id);

      // 5. 获取用户作为处理人的任务
      const { data: userAssignments } = await api.db
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', user?.id);

      const assignedTaskIds = (userAssignments || []).map((a: { task_id: string }) => a.task_id);

      // 6. 获取用户是成员的项目中的公开任务
      let publicTasks: any[] = [];
      if (accessibleProjectIds.length > 0) {
        const { data: publicTasksData } = await api.db
          .from('tasks')
          .select('*')
          .in('project_id', accessibleProjectIds)
          .eq('is_public', true);
        publicTasks = publicTasksData || [];
      }

      // 7. 合并所有可访问的任务（去重）
      const allAccessibleTasks = new Map<string, any>();

      // 添加自己创建的任务
      (createdTasks || []).forEach((task: any) => {
        allAccessibleTasks.set(task.id, task);
      });

      // 添加自己是处理人的任务
      if (assignedTaskIds.length > 0) {
        const { data: assignedTasksData } = await api.db
          .from('tasks')
          .select('*')
          .in('id', assignedTaskIds);
        (assignedTasksData || []).forEach((task: any) => {
          allAccessibleTasks.set(task.id, task);
        });
      }

      // 添加公开任务
      publicTasks.forEach((task: any) => {
        allAccessibleTasks.set(task.id, task);
      });

      const accessibleTaskList = Array.from(allAccessibleTasks.values());

      // 如果没有可访问的任务，直接返回空数组
      if (accessibleTaskList.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // 8. 获取关联数据
      const projectIds = [...new Set(accessibleTaskList.map(t => t.project_id))];
      const taskIds = accessibleTaskList.map(t => t.id);

      const [projectsData, profilesData, assigneesData] = await Promise.all([
        api.db.from('projects').select('*').in('id', projectIds),
        api.db.from('profiles').select('*'),
        api.db.from('task_assignees').select('*').in('task_id', taskIds)
      ]);

      const projectMap = new Map<string, Project>();
      (projectsData?.data || []).forEach((p: Project) => projectMap.set(p.id, p));

      const profileMap = new Map<string, Profile>();
      (profilesData?.data || []).forEach((p: Profile) => profileMap.set(p.id, p));

      const assigneesByTask: Record<string, { user_id: string; is_primary: boolean; user: Profile }[]> = {};
      (assigneesData?.data || []).forEach((a: { task_id: string; user_id: string; is_primary: boolean }) => {
        if (!assigneesByTask[a.task_id]) assigneesByTask[a.task_id] = [];
        const userProfile = profileMap.get(a.user_id);
        if (userProfile) {
          assigneesByTask[a.task_id].push({
            user_id: a.user_id,
            is_primary: a.is_primary,
            user: userProfile
          });
        }
      });

      const tasksWithProfiles = accessibleTaskList.map((task: any) => ({
        ...task,
        project: projectMap.get(task.project_id),
        creator: profileMap.get(task.created_by),
        assignees: assigneesByTask[task.id] || [],
        assignee_profiles: (assigneesByTask[task.id] || []).map(a => a.user)
      }));

      setTasks(tasksWithProfiles);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.db.from('profiles').select('*');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data } = await api.db.from('projects').select('*');
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  // 优先级权重映射
  const priorityWeight: Record<string, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(kw) ||
        t.description?.toLowerCase().includes(kw)
      );
    }

    if (filters.projectId) {
      result = result.filter(t => t.project_id === filters.projectId);
    }

    if (activeStatCard) {
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + 7);
      const monthEnd = new Date(now);
      monthEnd.setMonth(now.getMonth() + 1);

      switch (activeStatCard) {
        case 'all':
          // 总任务不添加任何筛选，展示全部
          break;
        case 'in_progress':
          result = result.filter(t => t.status === 'in_progress');
          break;
        case 'my_primary':
          result = result.filter(t => t.assignees?.some(a => a.user_id === user?.id && a.is_primary));
          break;
        case 'my_participate':
          result = result.filter(t => t.assignees?.some(a => a.user_id === user?.id));
          break;
        case 'done':
          result = result.filter(t => t.status === 'done');
          break;
        case 'due_this_week':
          result = result.filter(t => {
            if (!t.due_date || t.status === 'done') return false;
            const due = new Date(t.due_date);
            return due >= now && due <= weekEnd;
          });
          break;
        case 'due_this_month':
          result = result.filter(t => {
            if (!t.due_date || t.status === 'done') return false;
            const due = new Date(t.due_date);
            return due >= now && due <= monthEnd;
          });
          break;
        case 'overdue':
          result = result.filter(t => {
            if (!t.due_date || t.status === 'done' || t.status === 'canceled') return false;
            return new Date(t.due_date) < now;
          });
          break;
      }
    } else {
      // 只在未激活统计卡片时应用过滤器筛选
      if (filters.statuses.length > 0) {
        result = result.filter(t => filters.statuses.includes(t.status));
      }

      if (filters.priorities.length > 0) {
        result = result.filter(t => filters.priorities.includes(t.priority));
      }

      if (filters.dateRange.start || filters.dateRange.end) {
        const dateField = filters.dateRange.type === 'created' ? 'created_at' : 'due_date';
        result = result.filter(t => {
          const taskDate = t[dateField];
          if (!taskDate) return false;
          const start = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
          const end = filters.dateRange.end ? new Date(filters.dateRange.end) : null;
          const task = new Date(taskDate);
          if (start && task < start) return false;
          if (end && task > end) return false;
          return true;
        });
      }
    }

    // 默认排序：按优先级降序，然后按截止日期升序（快到期的在前）
    // 只有当用户没有手动选择排序时才应用默认排序
    if (sortBy === 'created_at' && sortOrder === 'desc') {
      result.sort((a, b) => {
        // 第一优先级：按优先级权重降序
        const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // 第二优先级：按截止日期升序（快到期的在前）
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;  // a 无日期，排后面
        if (!b.due_date) return -1; // b 无日期，排后面

        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
    }

    return result;
  }, [tasks, filters, activeStatCard, user?.id, sortBy, sortOrder, priorityWeight]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);
    const monthEnd = new Date(now);
    monthEnd.setMonth(now.getMonth() + 1);

    return {
      total: tasks.length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      myPrimary: tasks.filter(t => t.assignees?.some(a => a.user_id === user?.id && a.is_primary)).length,
      myParticipate: tasks.filter(t => t.assignees?.some(a => a.user_id === user?.id)).length,
      done: tasks.filter(t => t.status === 'done').length,
      dueThisWeek: tasks.filter(t => {
        if (!t.due_date || t.status === 'done') return false;
        const due = new Date(t.due_date);
        return due >= now && due <= weekEnd;
      }).length,
      dueThisMonth: tasks.filter(t => {
        if (!t.due_date || t.status === 'done') return false;
        const due = new Date(t.due_date);
        return due >= now && due <= monthEnd;
      }).length,
      overdue: tasks.filter(t => {
        if (!t.due_date || t.status === 'done' || t.status === 'canceled') return false;
        return new Date(t.due_date) < now;
      }).length
    };
  }, [tasks, user?.id]);

  // 任务完成趋势图数据
  const dateRange = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 14; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date);
    }
    return dates;
  }, []);

  const dailyCompletedData = useMemo(() => {
    return dateRange.map(date => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      return tasks.filter(task => {
        if (task.status !== 'done' || !task.completed_at) return false;
        const completedAt = new Date(task.completed_at);
        return completedAt >= date && completedAt < nextDay;
      }).length;
    });
  }, [tasks, dateRange]);

  const trendDataPoints = useMemo(() => {
    const maxValue = Math.max(...dailyCompletedData, 1);
    const minValue = Math.min(...dailyCompletedData);
    const range = maxValue - minValue || 1;

    return dailyCompletedData.map((value, index) => {
      const x = (index / 14) * 100;
      const y = 20 + ((value - minValue) / range) * 60;
      return { x, y, value, date: dateRange[index] };
    });
  }, [dailyCompletedData, dateRange]);

  const smoothPath = useMemo(() => {
    if (trendDataPoints.length < 2) return '';

    const points = trendDataPoints.map(p => ({
      x: (p.x / 100) * 1000,
      y: 100 - p.y
    }));

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) / 2;
      const cpy1 = prev.y;
      const cpx2 = prev.x + (curr.x - prev.x) / 2;
      const cpy2 = curr.y;
      path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
    }

    return path;
  }, [trendDataPoints]);

  const areaPath = useMemo(() => {
    if (trendDataPoints.length < 2) return '';
    const points = trendDataPoints.map(p => ({
      x: (p.x / 100) * 1000,
      y: 100 - p.y
    }));
    return `${smoothPath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;
  }, [trendDataPoints, smoothPath]);

  const formatDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const handleCreateTask = () => {
    navigate('/tasks/create');
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // 处理统计卡片点击
  const handleStatCardClick = (cardType: ActiveStatCard) => {
    if (activeStatCard === cardType) {
      // 取消激活，恢复默认筛选
      setActiveStatCard(null);
      setFilters({
        keyword: '',
        projectId: '',
        dateRange: { type: 'created', start: '', end: '' },
        statuses: ['todo', 'in_progress', 'paused'],
        priorities: []
      });
    } else {
      // 激活卡片，根据卡片类型设置筛选
      setActiveStatCard(cardType);

      switch (cardType) {
        case 'all':
          // 总任务：清除所有筛选，展示全部
          setFilters({
            keyword: '',
            projectId: '',
            dateRange: { type: 'created', start: '', end: '' },
            statuses: [],
            priorities: []
          });
          break;
        case 'in_progress':
          // 进行中：只筛选状态
          setFilters({
            ...filters,
            statuses: ['in_progress']
          });
          break;
        case 'done':
          // 已完成：只筛选状态
          setFilters({
            ...filters,
            statuses: ['done']
          });
          break;
        case 'my_primary':
        case 'my_participate':
        case 'due_this_week':
        case 'due_this_month':
        case 'overdue':
          // 这些卡片保持默认筛选（筛除已完成）
          setFilters({
            keyword: '',
            projectId: '',
            dateRange: { type: 'created', start: '', end: '' },
            statuses: ['todo', 'in_progress', 'paused'],
            priorities: []
          });
          break;
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
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
            正在加载任务数据...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>任务中心</h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>管理和跟踪所有任务进度</p>
        </div>
        <ThemedButton variant="primary" size="md" onClick={handleCreateTask}>
          <Plus className="w-5 h-5" />
          新建任务
        </ThemedButton>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        <ThemedCard
          variant={activeStatCard === 'all' ? 'elevated' : 'default'}
          className={`cursor-pointer transition-all duration-200 ${activeStatCard === 'all' ? 'ring-2' : ''}`}
          style={activeStatCard === 'all' ? { outline: `2px solid ${colors.primary[500]}`, outlineOffset: '2px' } : {}}
          onClick={() => handleStatCardClick('all')}
        >
          <div className="flex items-center gap-2 xl:gap-3">
            <div 
              className="w-8 h-8 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: isDark ? `${colors.primary[500]}20` : `${colors.primary[100]}`, color: colors.primary[600] }}
            >
              <CheckSquare className="w-4 h-4 xl:w-5 xl:h-5" />
            </div>
            <div>
              <div className={`text-xl xl:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>总任务</div>
            </div>
          </div>
        </ThemedCard>

        <ThemedCard
          variant={activeStatCard === 'in_progress' ? 'elevated' : 'default'}
          className={`cursor-pointer transition-all duration-200 ${activeStatCard === 'in_progress' ? 'ring-2' : ''}`}
          style={activeStatCard === 'in_progress' ? { outline: `2px solid #3b82f6`, outlineOffset: '2px' } : {}}
          onClick={() => handleStatCardClick('in_progress')}
        >
          <div className="flex items-center gap-2 xl:gap-3">
            <div 
              className="w-8 h-8 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe', color: '#2563eb' }}
            >
              <Play className="w-4 h-4 xl:w-5 xl:h-5" />
            </div>
            <div>
              <div className={`text-xl xl:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.inProgress}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>进行中</div>
            </div>
          </div>
        </ThemedCard>

        <ThemedCard
          variant={activeStatCard === 'my_primary' ? 'elevated' : 'default'}
          className={`cursor-pointer transition-all duration-200 ${activeStatCard === 'my_primary' ? 'ring-2' : ''}`}
          style={activeStatCard === 'my_primary' ? { outline: `2px solid #8b5cf6`, outlineOffset: '2px' } : {}}
          onClick={() => handleStatCardClick('my_primary')}
        >
          <div className="flex items-center gap-2 xl:gap-3">
            <div 
              className="w-8 h-8 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: isDark ? 'rgba(139,92,246,0.2)' : '#ede9fe', color: '#7c3aed' }}
            >
              <User className="w-4 h-4 xl:w-5 xl:h-5" />
            </div>
            <div>
              <div className={`text-xl xl:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.myPrimary}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>我负责</div>
            </div>
          </div>
        </ThemedCard>

        <ThemedCard
          variant={activeStatCard === 'my_participate' ? 'elevated' : 'default'}
          className={`cursor-pointer transition-all duration-200 ${activeStatCard === 'my_participate' ? 'ring-2' : ''}`}
          style={activeStatCard === 'my_participate' ? { outline: `2px solid #10b981`, outlineOffset: '2px' } : {}}
          onClick={() => handleStatCardClick('my_participate')}
        >
          <div className="flex items-center gap-2 xl:gap-3">
            <div 
              className="w-8 h-8 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5', color: '#059669' }}
            >
              <Users className="w-4 h-4 xl:w-5 xl:h-5" />
            </div>
            <div>
              <div className={`text-xl xl:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.myParticipate}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>我参与</div>
            </div>
          </div>
        </ThemedCard>

        <ThemedCard
          variant={activeStatCard === 'due_this_week' ? 'elevated' : 'default'}
          className={`cursor-pointer transition-all duration-200 ${activeStatCard === 'due_this_week' ? 'ring-2' : ''}`}
          style={activeStatCard === 'due_this_week' ? { outline: `2px solid #f59e0b`, outlineOffset: '2px' } : {}}
          onClick={() => handleStatCardClick('due_this_week')}
        >
          <div className="flex items-center gap-2 xl:gap-3">
            <div 
              className="w-8 h-8 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7', color: '#d97706' }}
            >
              <Clock className="w-4 h-4 xl:w-5 xl:h-5" />
            </div>
            <div>
              <div className={`text-xl xl:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.dueThisWeek}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>本周截止</div>
            </div>
          </div>
        </ThemedCard>

        <ThemedCard
          variant={activeStatCard === 'due_this_month' ? 'elevated' : 'default'}
          className={`cursor-pointer transition-all duration-200 ${activeStatCard === 'due_this_month' ? 'ring-2' : ''}`}
          style={activeStatCard === 'due_this_month' ? { outline: `2px solid #f97316`, outlineOffset: '2px' } : {}}
          onClick={() => handleStatCardClick('due_this_month')}
        >
          <div className="flex items-center gap-2 xl:gap-3">
            <div 
              className="w-8 h-8 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: isDark ? 'rgba(249,115,22,0.2)' : '#ffedd5', color: '#ea580c' }}
            >
              <Calendar className="w-4 h-4 xl:w-5 xl:h-5" />
            </div>
            <div>
              <div className={`text-xl xl:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.dueThisMonth}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>本月截止</div>
            </div>
          </div>
        </ThemedCard>

        <ThemedCard
          variant={activeStatCard === 'done' ? 'elevated' : 'default'}
          className={`cursor-pointer transition-all duration-200 ${activeStatCard === 'done' ? 'ring-2' : ''}`}
          style={activeStatCard === 'done' ? { outline: `2px solid #22c55e`, outlineOffset: '2px' } : {}}
          onClick={() => handleStatCardClick('done')}
        >
          <div className="flex items-center gap-2 xl:gap-3">
            <div 
              className="w-8 h-8 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: isDark ? 'rgba(34,197,94,0.2)' : '#dcfce7', color: '#16a34a' }}
            >
              <CheckCircle className="w-4 h-4 xl:w-5 xl:h-5" />
            </div>
            <div>
              <div className={`text-xl xl:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.done}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>已完成</div>
            </div>
          </div>
        </ThemedCard>

        <ThemedCard
          variant={activeStatCard === 'overdue' ? 'elevated' : 'default'}
          className={`cursor-pointer transition-all duration-200 ${activeStatCard === 'overdue' ? 'ring-2' : ''}`}
          style={activeStatCard === 'overdue' ? { outline: `2px solid #ef4444`, outlineOffset: '2px' } : {}}
          onClick={() => handleStatCardClick('overdue')}
        >
          <div className="flex items-center gap-2 xl:gap-3">
            <div 
              className="w-8 h-8 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2', color: '#dc2626' }}
            >
              <Flame className="w-4 h-4 xl:w-5 xl:h-5" />
            </div>
            <div>
              <div className={`text-xl xl:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.overdue}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>超期</div>
            </div>
          </div>
        </ThemedCard>
      </div>

      {/* 任务完成趋势图 */}
      <ThemedCard variant="default">
        <h3 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>近15天任务完成趋势</h3>
        <div className="relative h-30">
          {/* SVG 曲线图 */}
          <svg className="w-full h-full" viewBox="0 0 1000 100" preserveAspectRatio="none">
            {/* 渐变定义 */}
            <defs>
              <linearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.primary[500]} />
                <stop offset="100%" stopColor={colors.secondary[500]} />
              </linearGradient>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={colors.primary[500]} stopOpacity="0.3" />
                <stop offset="100%" stopColor={colors.secondary[500]} stopOpacity="0.05" />
              </linearGradient>
            </defs>
            {/* 填充区域 */}
            {areaPath && (
              <path d={areaPath} fill="url(#areaGradient)" />
            )}
            {/* 曲线 */}
            {smoothPath && (
              <path d={smoothPath} fill="none" stroke="url(#trendGradient)" strokeWidth="3" />
            )}
          </svg>

          {/* 节点和数值 */}
          {trendDataPoints.map((point, index) => (
            <div
              key={index}
              className="absolute flex flex-col items-center"
              style={{ left: `${point.x}%`, bottom: `${point.y}%`, transform: 'translateX(-50%)' }}
            >
              {/* 数值 */}
              <span className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {point.value}
              </span>
              {/* 节点 */}
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: index === 14 ? colors.primary[500] : (isDark ? '#4b5563' : '#d1d5db') }}
              />
            </div>
          ))}

          {/* 横线 */}
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }} />

          {/* 日期标签 */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-between px-2">
            {dateRange.map((date, index) => (
              <span
                key={index}
                className="text-xs"
                style={{ color: index === 14 ? colors.primary[600] : (isDark ? '#9ca3af' : '#9ca3af'), fontWeight: index === 14 ? 500 : 400 }}
              >
                {index === 14 ? '今天' : formatDate(date)}
              </span>
            ))}
          </div>
        </div>
      </ThemedCard>

      <TaskFilterBar
        filters={filters}
        onFilterChange={setFilters}
        projects={projects}
        isAdmin={isAdmin}
        currentUserId={user?.id}
      />

      <ThemedCard variant="default" className="overflow-hidden p-0">
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}` }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: viewMode === 'list' ? (isDark ? `${colors.primary[500]}20` : colors.primary[100]) : 'transparent',
                color: viewMode === 'list' ? colors.primary[600] : (isDark ? '#9ca3af' : '#6b7280')
              }}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: viewMode === 'kanban' ? (isDark ? `${colors.primary[500]}20` : colors.primary[100]) : 'transparent',
                color: viewMode === 'kanban' ? colors.primary[600] : (isDark ? '#9ca3af' : '#6b7280')
              }}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            共 {filteredTasks.length} 条任务
          </div>
        </div>

        <TaskTable
          tasks={filteredTasks}
          loading={loading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          selectedTasks={selectedTasks}
          onSelectTask={(taskId, isSelected) => {
            const newSelected = new Set(selectedTasks);
            if (isSelected) {
              newSelected.add(taskId);
            } else {
              newSelected.delete(taskId);
            }
            setSelectedTasks(newSelected);
          }}
          onSelectAll={(isSelected) => {
            if (isSelected) {
              setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
            } else {
              setSelectedTasks(new Set());
            }
          }}
          onUpdateStatus={async (taskId, status) => {
            try {
              const updates: any = { status };
              // 当状态变为已完成时，设置 completed_at 时间戳
              if (status === 'done') {
                updates.completed_at = new Date().toISOString();
              } else {
                updates.completed_at = null;
              }
              await api.db.from('tasks').update(updates).eq('id', taskId);
              fetchTasks();
            } catch (error) {
              console.error('Error updating task status:', error);
            }
          }}
          onDeleteTask={async (taskId) => {
            if (confirm('确定要删除这个任务吗？')) {
              try {
                await api.db.from('tasks').delete().eq('id', taskId);
                fetchTasks();
              } catch (error) {
                console.error('Error deleting task:', error);
              }
            }
          }}
        />
      </ThemedCard>

      {/* 批量操作工具栏 */}
      <BatchActionBar
        selectedCount={selectedTasks.size}
        onClearSelection={() => setSelectedTasks(new Set())}
        onDelete={() => setShowDeleteModal(true)}
        onChangeStatus={() => setShowStatusModal(true)}
        onAssign={() => setShowAssignModal(true)}
      />

      {/* 批量删除弹窗 */}
      <BatchDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        taskCount={selectedTasks.size}
        onConfirm={async () => {
          const result = await batchDeleteTasks(Array.from(selectedTasks));
          setSelectedTasks(new Set());
          fetchTasks();
          // 显示提示
          if (result.failed && result.failed.length > 0) {
            alert(`成功删除 ${result.deleted} 个任务，${result.failed.length} 个任务无权限删除`);
          }
        }}
      />

      {/* 批量修改状态弹窗 */}
      <BatchStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        taskCount={selectedTasks.size}
        onConfirm={async (status: TaskStatus) => {
          await batchUpdateTaskStatus(Array.from(selectedTasks), status);
          setSelectedTasks(new Set());
          fetchTasks();
        }}
      />

      {/* 批量分配处理人弹窗 */}
      <BatchAssignModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        taskCount={selectedTasks.size}
        projectId={filters.projectId || projects[0]?.id || ''}
        onConfirm={async (userIds: string[]) => {
          await batchAssignTasks(Array.from(selectedTasks), userIds, 'append');
          setSelectedTasks(new Set());
          fetchTasks();
        }}
      />
    </div>
  );
}
