import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, List, Calendar, User, Users, AlertCircle, CheckCircle, Sparkles, CheckSquare, Clock, Flame } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContextNew';
import { Task, Profile, Project } from '../../types';
import { TaskTable } from './components/TaskTable';
import TaskFilterBar, { TaskFilterState } from './components/TaskFilterBar';

interface TaskWithDetails extends Task {
  project?: Project;
  creator?: Profile;
  assignees?: { user_id: string; is_primary: boolean; user: Profile }[];
  assignee_profiles?: Profile[];
}

export default function TaskList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'created_at' | 'due_date' | 'priority' | 'completed_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [filters, setFilters] = useState<TaskFilterState>({
    keyword: '',
    projectId: '',
    dateRange: { type: 'created', start: '', end: '' },
    statuses: [],
    priorities: []
  });

  type ActiveStatCard =
    | 'all'
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
      
      const tasksData = await api.db
        .from('tasks')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' });

      const projectsData = await api.db
        .from('projects')
        .select('*');

      const profilesData = await api.db
        .from('profiles')
        .select('*');

      const assigneesData = await api.db
        .from('task_assignees')
        .select('*');

      const projectMap = new Map<string, Project>();
      projectsData?.forEach((p: Project) => projectMap.set(p.id, p));

      const profileMap = new Map<string, Profile>();
      profilesData?.forEach((p: Profile) => profileMap.set(p.id, p));

      const assigneesByTask: Record<string, { user_id: string; is_primary: boolean; user: Profile }[]> = {};
      assigneesData?.forEach((a: { task_id: string; user_id: string; is_primary: boolean }) => {
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

      const tasksWithProfiles = (tasksData || []).map((task: any) => ({
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
      const data = await api.db.from('profiles').select('*');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await api.db.from('projects').select('*');
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
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

    if (activeStatCard) {
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + 7);
      const monthEnd = new Date(now);
      monthEnd.setMonth(now.getMonth() + 1);

      switch (activeStatCard) {
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
    }

    return result;
  }, [tasks, filters, activeStatCard, user?.id]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);
    const monthEnd = new Date(now);
    monthEnd.setMonth(now.getMonth() + 1);

    return {
      total: tasks.length,
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

  const handleCreateTask = () => {
    navigate('/tasks/new');
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">任务中心</h1>
          <p className="page-subtitle">管理和跟踪所有任务进度</p>
        </div>
        <button onClick={handleCreateTask} className="btn-primary shadow-glow">
          <Plus className="w-5 h-5" />
          新建任务
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        <button
          onClick={() => setActiveStatCard(activeStatCard === 'all' ? null : 'all')}
          className={`stat-card card-hover text-left ${activeStatCard === 'all' ? 'ring-2 ring-primary-500' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-dark-900">{stats.total}</div>
              <div className="text-xs text-dark-500">总任务</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveStatCard(activeStatCard === 'my_primary' ? null : 'my_primary')}
          className={`stat-card card-hover text-left ${activeStatCard === 'my_primary' ? 'ring-2 ring-violet-500' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <User className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-dark-900">{stats.myPrimary}</div>
              <div className="text-xs text-dark-500">我负责</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveStatCard(activeStatCard === 'my_participate' ? null : 'my_participate')}
          className={`stat-card card-hover text-left ${activeStatCard === 'my_participate' ? 'ring-2 ring-mint-500' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mint-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-mint-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-dark-900">{stats.myParticipate}</div>
              <div className="text-xs text-dark-500">我参与</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveStatCard(activeStatCard === 'done' ? null : 'done')}
          className={`stat-card card-hover text-left ${activeStatCard === 'done' ? 'ring-2 ring-green-500' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-dark-900">{stats.done}</div>
              <div className="text-xs text-dark-500">已完成</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveStatCard(activeStatCard === 'due_this_week' ? null : 'due_this_week')}
          className={`stat-card card-hover text-left ${activeStatCard === 'due_this_week' ? 'ring-2 ring-sun-500' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sun-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-sun-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-dark-900">{stats.dueThisWeek}</div>
              <div className="text-xs text-dark-500">本周截止</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveStatCard(activeStatCard === 'due_this_month' ? null : 'due_this_month')}
          className={`stat-card card-hover text-left ${activeStatCard === 'due_this_month' ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-dark-900">{stats.dueThisMonth}</div>
              <div className="text-xs text-dark-500">本月截止</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveStatCard(activeStatCard === 'overdue' ? null : 'overdue')}
          className={`stat-card card-hover text-left ${activeStatCard === 'overdue' ? 'ring-2 ring-red-500' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Flame className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-dark-900">{stats.overdue}</div>
              <div className="text-xs text-dark-500">超期</div>
            </div>
          </div>
        </button>
      </div>

      <TaskFilterBar
        filters={filters}
        onFilterChange={setFilters}
        projects={projects}
        users={users}
      />

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-dark-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-dark-400 hover:bg-dark-100'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg ${viewMode === 'kanban' ? 'bg-primary-100 text-primary-600' : 'text-dark-400 hover:bg-dark-100'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
          <div className="text-sm text-dark-500">
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
          onSelectionChange={setSelectedTasks}
          onRefresh={fetchTasks}
        />
      </div>
    </div>
  );
}
