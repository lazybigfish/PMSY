import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, List, Calendar, User, Users, AlertCircle, CheckCircle, Sparkles, CheckSquare, Clock, Flame } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Task, Profile, Project } from '../../types';
import { TaskTable } from './components/TaskTable';
import { TaskCreateModal, TaskFormData } from './components/TaskCreateModal';

interface TaskWithDetails extends Task {
  project?: Project;
  creator?: Profile;  // 责任人（创建者）
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'created_at' | 'due_date' | 'priority' | 'completed_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchTasks();
    fetchUsers();
    fetchProjects();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(*),
          creator:created_by(*),
          assignees:task_assignees(user_id, is_primary, user:profiles(*))
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) throw error;

      const tasksWithProfiles = (tasksData || []).map(task => ({
        ...task,
        assignee_profiles: task.assignees?.map((a: { user: Profile }) => a.user) || []
      }));

      setTasks(tasksWithProfiles);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*');
    setUsers(data || []);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*');
    setProjects(data || []);
  };

  const handleCreateTask = async (formData: TaskFormData) => {
    if (!user) return;

    try {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          title: formData.title,
          description: formData.description,
          project_id: formData.project_id,
          module_id: formData.module_id || null,
          priority: formData.priority,
          is_public: formData.is_public,
          due_date: formData.due_date || null,
          created_by: user.id,
          owner_id: user.id,
          status: 'todo'
        })
        .select()
        .single();

      if (error) throw error;

      if (formData.assignee_ids.length > 0) {
        const assigneesToInsert = formData.assignee_ids.map((userId, index) => ({
          task_id: task.id,
          user_id: userId,
          is_primary: index === 0
        }));
        await supabase.from('task_assignees').insert(assigneesToInsert);
      }

      setShowCreateModal(false);
      fetchTasks();
      navigate(`/tasks/${task.id}`);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('创建任务失败');
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const updates: { status: string; completed_at?: string | null } = { status: newStatus };
      if (newStatus === 'done') {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = null;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('更新失败');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await supabase.from('task_assignees').delete().eq('task_id', taskId);
      await supabase.from('tasks').delete().eq('id', taskId);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('删除失败');
    }
  };

  const handleSort = (field: 'created_at' | 'due_date' | 'priority' | 'completed_at') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSelectTask = (taskId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (isSelected) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 w-16 h-16 rounded-2xl gradient-primary blur-xl opacity-50 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">任务中心</h1>
          <p className="page-subtitle">管理任务分配、跟踪进度、协作完成</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-dark-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'list' 
                  ? 'bg-white shadow-sm text-dark-900' 
                  : 'text-dark-600 hover:text-dark-900'
              }`}
            >
              <List className="w-4 h-4" />
              列表
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'kanban' 
                  ? 'bg-white shadow-sm text-dark-900' 
                  : 'text-dark-600 hover:text-dark-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              看板
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary shadow-glow"
          >
            <Plus className="w-4 h-4" />
            新建任务
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        {/* Total Tasks */}
        <div className="stat-card card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">总任务</span>
            <div className="w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center">
              <CheckSquare className="h-4 w-4 text-dark-600" />
            </div>
          </div>
          <div className="stat-value">{tasks.length}</div>
        </div>

        {/* My Tasks */}
        <div className="stat-card card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">我负责的</span>
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <User className="h-4 w-4 text-primary-600" />
            </div>
          </div>
          <div className="stat-value text-primary-600">
            {tasks.filter(t => t.assignees?.some(a => a.user_id === user?.id && a.is_primary)).length}
          </div>
        </div>

        {/* Participating Tasks */}
        <div className="stat-card card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">我参与的</span>
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
          </div>
          <div className="stat-value text-violet-600">
            {tasks.filter(t => t.assignees?.some(a => a.user_id === user?.id && !a.is_primary)).length}
          </div>
        </div>

        {/* Done */}
        <div className="stat-card card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">已完成</span>
            <div className="w-8 h-8 rounded-lg bg-mint-100 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-mint-600" />
            </div>
          </div>
          <div className="stat-value text-mint-600">
            {tasks.filter(t => t.status === 'done').length}
          </div>
        </div>

        {/* Due This Week */}
        <div className="stat-card card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">截止本周</span>
            <div className="w-8 h-8 rounded-lg bg-sun-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-sun-600" />
            </div>
          </div>
          <div className="stat-value text-sun-600">
            {tasks.filter(t => {
              if (!t.due_date || t.status === 'done') return false;
              const due = new Date(t.due_date);
              const now = new Date();
              const endOfWeek = new Date(now);
              endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
              endOfWeek.setHours(23, 59, 59, 999);
              return due <= endOfWeek;
            }).length}
          </div>
        </div>

        {/* Due This Month */}
        <div className="stat-card card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">截止本月</span>
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-violet-600" />
            </div>
          </div>
          <div className="stat-value text-violet-600">
            {tasks.filter(t => {
              if (!t.due_date || t.status === 'done') return false;
              const due = new Date(t.due_date);
              const now = new Date();
              const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              endOfMonth.setHours(23, 59, 59, 999);
              return due <= endOfMonth;
            }).length}
          </div>
        </div>

        {/* Overdue */}
        <div className="stat-card card-hover">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">超期未完成</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Flame className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <div className="stat-value text-red-600">
            {tasks.filter(t => {
              if (!t.due_date || t.status === 'done') return false;
              const due = new Date(t.due_date);
              const now = new Date();
              return due < now;
            }).length}
          </div>
        </div>
      </div>

      {/* Task List */}
      <TaskTable
        tasks={tasks}
        selectedTasks={selectedTasks}
        onSelectTask={handleSelectTask}
        onSelectAll={handleSelectAll}
        onUpdateStatus={updateTaskStatus}
        onDeleteTask={handleDeleteTask}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {/* Create Modal */}
      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTask}
        projects={projects}
        users={users}
        currentUserId={user?.id}
      />
    </div>
  );
}
