import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskService, userService, projectService, notificationService } from '../../services';
import { recordTaskAssigneeChange, recordTaskModuleChange } from '../../services/taskService';
import { api, apiClient } from '../../lib/api';
import { Task, Profile, Project, TaskComment, TaskProgressLog, ProjectModule, TaskModule } from '../../types';
import { ArrowLeft, FileText, MessageSquare, History, Sparkles, CheckCircle, AlertCircle, TrendingUp, Edit2, Trash2, Calendar, Folder, User, Users, Tag, Clock, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContextNew';
import { TaskComments } from './components/TaskComments';
import { TaskProgressUpdateModal } from './components/TaskProgressUpdateModal';
import { TaskHistory } from './components/TaskHistory';
import { Avatar } from '../../components/Avatar';

interface TaskWithRelations extends Task {
  project?: Project;
  assignees?: { user_id: string; is_primary: boolean; user: Profile }[];
  creator?: Profile;
  owner?: Profile;
  task_modules?: TaskModule[];
}

const TaskDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [logs, setLogs] = useState<TaskProgressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');
  const [availableModules, setAvailableModules] = useState<ProjectModule[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');

  // 将模块列表转换为层级结构
  const buildModuleHierarchy = (modules: ProjectModule[]): ProjectModule[] => {
    const moduleMap = new Map<string, ProjectModule>();
    const rootModules: ProjectModule[] = [];
    
    // 首先将所有模块放入 map
    modules.forEach(m => {
      moduleMap.set(m.id, { ...m, children: [] });
    });
    
    // 构建层级关系
    modules.forEach(m => {
      const module = moduleMap.get(m.id)!;
      if (m.parent_id && moduleMap.has(m.parent_id)) {
        const parent = moduleMap.get(m.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(module);
      } else {
        rootModules.push(module);
      }
    });
    
    return rootModules;
  };

  // 递归渲染层级选项
  const renderModuleOptions = (modules: ProjectModule[], level: number = 0, excludedIds: string[] = []): JSX.Element[] => {
    const options: JSX.Element[] = [];
    
    modules.forEach(m => {
      if (!excludedIds.includes(m.id)) {
        const indent = '  '.repeat(level);
        const prefix = level > 0 ? '└─ ' : '';
        options.push(
          <option key={m.id} value={m.id}>
            {indent}{prefix}{m.name}
          </option>
        );
        
        if (m.children && m.children.length > 0) {
          options.push(...renderModuleOptions(m.children, level + 1, excludedIds));
        }
      }
    });
    
    return options;
  };

  // 项目权限级别
  const [projectPermissionLevel, setProjectPermissionLevel] = useState<'none' | 'viewer' | 'member' | 'manager' | 'admin'>('none');

  // 权限判断
  const isOwner = user?.id === task?.created_by;
  const isAssignee = task?.assignees?.some(a => a.user_id === user?.id);
  const isTaskActive = task?.status !== 'done' && task?.status !== 'canceled';
  const isProjectManager = projectPermissionLevel === 'manager' || projectPermissionLevel === 'admin';
  const isProjectMember = projectPermissionLevel === 'member' || isProjectManager;

  // 编辑权限：任务创建者 或 项目管理员
  const canEdit = (isOwner || isProjectManager) && isTaskActive;
  // 更新状态权限：任务创建者 或 任务处理人 或 项目管理员 或 项目成员
  const canUpdateStatus = (isOwner || isAssignee || isProjectManager || isProjectMember) && isTaskActive;

  // 获取用户在项目中的权限级别
  const getProjectPermissionLevel = async (projectId: string, userId: string): Promise<'none' | 'viewer' | 'member' | 'manager' | 'admin'> => {
    // 1. 检查是否是系统管理员
    const { data: userData } = await api.db.from('profiles').select('role').eq('id', userId).single();
    if (userData?.role === 'admin') {
      return 'admin';
    }

    // 2. 检查是否是项目经理（manager_id）
    const { data: projectData } = await api.db.from('projects').select('manager_id').eq('id', projectId).single();
    if (projectData?.manager_id === userId) {
      return 'manager';
    }

    // 3. 检查是否是项目成员
    const { data: memberData } = await api.db
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (memberData) {
      return memberData.role === 'manager' ? 'manager' : 'member';
    }

    // 4. 检查项目是否公开
    const { data: publicProject } = await api.db.from('projects').select('is_public').eq('id', projectId).single();
    if (publicProject?.is_public) {
      return 'viewer';
    }

    return 'none';
  };

  useEffect(() => {
    if (id) {
      fetchTaskDetails();
    }
  }, [id]);

  const fetchTaskDetails = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      // 使用 taskService 获取任务详情
      const taskData = await taskService.getTaskById(id);

      if (!taskData) throw new Error('Task not found');

      // 获取用户在项目中的权限级别
      if (taskData.project_id && user?.id) {
        const level = await getProjectPermissionLevel(taskData.project_id, user.id);
        setProjectPermissionLevel(level);
      }

      // 获取关联数据
      let ownerData = null;
      if (taskData.owner_id) {
        ownerData = await userService.getUserById(taskData.owner_id);
      }

      // 获取项目信息
      let projectData = null;
      if (taskData.project_id) {
        projectData = await projectService.getProjectById(taskData.project_id);
      }
      
      // 获取处理人信息
      const { data: assigneesData } = await api.db
        .from('task_assignees')
        .select('user_id, is_primary')
        .eq('task_id', id);

      // 获取处理人详情
      let assigneesWithUser: any[] = [];
      if (assigneesData && assigneesData.length > 0) {
        const userIds = assigneesData.map(a => a.user_id);
        const { data: usersData } = await api.db.from('profiles').select('*').in('id', userIds);
        const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
        assigneesWithUser = assigneesData.map(a => ({
          ...a,
          user: usersMap.get(a.user_id)
        }));
      }

      // 获取创建者信息
      let creatorData = null;
      if (taskData.created_by) {
        creatorData = await userService.getUserById(taskData.created_by);
      }

      // 获取任务模块关联
      const { data: taskModulesData } = await api.db
        .from('task_modules')
        .select('module_id, created_at')
        .eq('task_id', id);

      // 获取模块详情
      let taskModulesWithModule: any[] = [];
      if (taskModulesData && taskModulesData.length > 0) {
        const moduleIds = taskModulesData.map(tm => tm.module_id);
        const { data: modulesData } = await api.db.from('project_modules').select('*').in('id', moduleIds);
        const modulesMap = new Map(modulesData?.map(m => [m.id, m]) || []);
        taskModulesWithModule = taskModulesData.map(tm => ({
          ...tm,
          module: modulesMap.get(tm.module_id)
        }));
      }

      const fullTaskData = {
        ...taskData,
        owner: ownerData,
        project: projectData,
        assignees: assigneesWithUser,
        creator: creatorData,
        task_modules: taskModulesWithModule
      };
      setTask(fullTaskData);

      // 获取评论和进度日志（不使用嵌入查询，后端不支持）
      const [
        { data: commentsData },
        { data: logsData }
      ] = await Promise.all([
        api.db.from('task_comments').select('*').eq('task_id', id).order('created_at', { ascending: true }),
        api.db.from('task_progress_logs').select('*').eq('task_id', id).order('created_at', { ascending: false })
      ]);

      // 获取评论和日志的用户信息
      const userIds = [...new Set([
        ...(commentsData || []).map((c: any) => c.user_id).filter(Boolean),
        ...(logsData || []).map((l: any) => l.user_id).filter(Boolean)
      ])];

      let usersMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: usersData } = await api.db.from('profiles').select('*').in('id', userIds);
        usersMap = (usersData || []).reduce((acc: Record<string, any>, user: any) => {
          acc[user.id] = user;
          return acc;
        }, {});
      }

      // 映射字段名
      const mappedComments = (commentsData || []).map((item: any) => ({ ...item, creator: usersMap[item.user_id] }));
      const mappedLogs = (logsData || []).map((item: any) => ({ ...item, creator: usersMap[item.user_id] }));

      // 单独获取附件数据
      let logsWithAttachments = mappedLogs || [];
      if (mappedLogs && mappedLogs.length > 0) {
        const logIds = mappedLogs.map(log => log.id);
        const { data: attachmentsData } = await api.db
          .from('task_progress_attachments')
          .select('*')
          .in('progress_log_id', logIds);

        if (attachmentsData) {
          logsWithAttachments = mappedLogs.map(log => ({
            ...log,
            attachments: attachmentsData.filter(att => att.progress_log_id === log.id)
          }));
        }
      }

      setComments(mappedComments);
      setLogs(logsWithAttachments);

      const latestLog = logsData?.[0];
      if (latestLog?.progress !== undefined && latestLog?.progress !== null) {
        setCurrentProgress(latestLog.progress);
      } else if (taskData.status === 'done') {
        setCurrentProgress(100);
      } else if (taskData.status === 'in_progress') {
        setCurrentProgress(50);
      } else {
        setCurrentProgress(0);
      }

      if (taskData.project_id) {
        const [modulesData, usersData] = await Promise.all([
          projectService.getProjectModules(taskData.project_id),
          userService.getUsers()
        ]);
        setAvailableModules(modulesData || []);
        setAllUsers(usersData || []);
      }
    } catch (error) {
      console.error('Error fetching task details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'done') {
        updates.completed_at = new Date().toISOString();
        setCurrentProgress(100);
      } else {
        updates.completed_at = null;
      }
      
      // 使用 taskService 更新任务
      await taskService.updateTask(task.id, updates);
      
      // 发送通知给处理人
      const notifications = task.assignees
        ?.filter(a => a.user_id !== user?.id)
        .map(a => ({
          user_id: a.user_id,
          title: '任务状态更新',
          content: `任务 "${task.title}" 状态已变更为 ${newStatus}`,
          type: 'task' as const
        })) || [];

      if (notifications.length > 0) {
        for (const notification of notifications) {
          await notificationService.createNotification(notification);
        }
      }
      
      fetchTaskDetails(true);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('状态更新失败');
    }
  };

  const handleAddAssignee = async (userId: string) => {
    if (!task) return;
    try {
      // 先获取用户姓名
      const { data: userData } = await api.db.from('profiles').select('full_name').eq('id', userId).single();
      const userName = userData?.full_name || '未知用户';

      const { error } = await api.db.from('task_assignees').insert({
        task_id: task.id,
        user_id: userId,
        is_primary: task.assignees?.length === 0
      });
      if (error) throw error;

      // 记录添加处理人的历史
      await recordTaskAssigneeChange(task.id, 'add', userName);

      fetchTaskDetails(true);
    } catch (error) {
      console.error('Error adding assignee:', error);
      alert('添加处理人失败');
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    if (!task) return;
    try {
      // 先获取用户姓名
      const { data: userData } = await api.db.from('profiles').select('full_name').eq('id', userId).single();
      const userName = userData?.full_name || '未知用户';

      // 删除指定处理人 - 使用 REST API 直接调用
      await apiClient.delete(`/rest/v1/task_assignees?eq.task_id=${task.id}&eq.user_id=${userId}`);

      // 记录移除处理人的历史
      await recordTaskAssigneeChange(task.id, 'remove', userName);

      fetchTaskDetails(true);
    } catch (error) {
      console.error('Error removing assignee:', error);
      alert('移除处理人失败');
    }
  };

  const handleUpdateModules = async (moduleIds: string[]) => {
    if (!task) return;
    try {
      // 获取当前已关联的模块ID
      const currentModuleIds = task.task_modules?.map(tm => tm.module_id) || [];
      
      // 计算新增的模块ID
      const addedModuleIds = moduleIds.filter(id => !currentModuleIds.includes(id));
      
      // 删除所有现有模块关联
      await apiClient.delete(`/rest/v1/task_modules?eq.task_id=${task.id}`);

      // 插入新模块关联
      if (moduleIds.length > 0) {
        await apiClient.post('/rest/v1/task_modules', 
          moduleIds.map(moduleId => ({
            task_id: task.id,
            module_id: moduleId
          }))
        );
      }
      
      // 记录新增模块的历史
      for (const moduleId of addedModuleIds) {
        const module = availableModules.find(m => m.id === moduleId);
        if (module) {
          await recordTaskModuleChange(task.id, 'add', module.name);
        }
      }
      
      fetchTaskDetails(true);
    } catch (error) {
      console.error('Error updating modules:', error);
      alert('更新模块失败');
    }
  };

  const handleRemoveModule = async (moduleId: string, moduleName: string) => {
    if (!task) return;
    try {
      // 删除指定的功能模块关联
      await apiClient.delete(`/rest/v1/task_modules?eq.task_id=${task.id}&eq.module_id=${moduleId}`);

      // 记录移除功能模块的历史
      await recordTaskModuleChange(task.id, 'remove', moduleName);

      fetchTaskDetails(true);
    } catch (error) {
      console.error('Error removing module:', error);
      alert('移除功能模块失败');
    }
  };

  const handleAddComment = async (content: string) => {
    if (!task || !user) return;
    try {
      const { error } = await api.db.from('task_comments').insert({
        task_id: task.id,
        content,
        created_by: user.id
      });
      if (error) throw error;
      fetchTaskDetails(true);
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('评论添加失败');
    }
  };

  const handleProgressUpdate = async (progress: number, content: string, attachments: any[]) => {
    if (!task || !user) {
      alert('任务或用户信息缺失');
      return;
    }

    try {
      // 1. 创建进度更新记录
      const { data: progressLogData, error: logError } = await api.db
        .from('task_progress_logs')
        .insert({
          task_id: task.id,
          user_id: user.id,
          progress,
          description: content
        });

      if (logError) {
        throw new Error(`创建进度记录失败: ${logError.message}`);
      }

      const progressLog = progressLogData?.[0];

      // 2. 保存附件记录
      if (attachments.length > 0 && progressLog) {
        const attachmentsToInsert = attachments
          .filter(att => att.file_url)
          .map(att => ({
            progress_log_id: progressLog.id,
            file_name: att.file_name,
            file_url: att.file_url,
            file_type: att.file_type,
            file_size: att.file_size
          }));

        if (attachmentsToInsert.length > 0) {
          await api.db
            .from('task_progress_attachments')
            .insert(attachmentsToInsert);
        }
      }

      // 3. 更新任务进度和状态
      const updateData: any = { progress };
      if (progress === 100 && task.status !== 'done') {
        updateData.status = 'done';
        updateData.completed_at = new Date().toISOString();
      }
      await taskService.updateTask(task.id, updateData);

      // 4. 刷新数据
      await fetchTaskDetails(true);
      setCurrentProgress(progress);

    } catch (error: any) {
      console.error('Error submitting progress update:', error);
      alert(`提交进度更新失败: ${error.message || '未知错误'}`);
      throw error;
    }
  };

  const getLatestProgress = () => {
    if (logs.length > 0 && logs[0].progress !== undefined && logs[0].progress !== null) {
      return logs[0].progress;
    }
    switch (task?.status) {
      case 'done': return 100;
      case 'in_progress': return 50;
      case 'todo': return 0;
      default: return 0;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return <span className="badge badge-mint"><CheckCircle className="w-3 h-3 mr-1" />已完成</span>;
      case 'in_progress':
        return <span className="badge badge-primary">进行中</span>;
      case 'todo':
        return <span className="badge badge-dark">待处理</span>;
      case 'canceled':
        return <span className="badge badge-dark">已取消</span>;
      default:
        return <span className="badge badge-dark">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="badge bg-red-500 text-white"><AlertCircle className="w-3 h-3 mr-1" />紧急</span>;
      case 'high':
        return <span className="badge bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />高</span>;
      case 'medium':
        return <span className="badge bg-sun-100 text-sun-700">中</span>;
      case 'low':
        return <span className="badge bg-mint-100 text-mint-700">低</span>;
      default:
        return null;
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

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-dark-100 flex items-center justify-center mb-6">
          <FileText className="h-10 w-10 text-dark-400" />
        </div>
        <p className="text-dark-600 font-medium text-lg">任务不存在或已被删除</p>
        <button
          onClick={() => navigate('/tasks')}
          className="mt-6 btn-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
          返回任务列表
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'details', label: '详情', icon: FileText, color: 'primary' },
    { id: 'comments', label: `评论 (${comments.length})`, icon: MessageSquare, color: 'violet' },
    { id: 'history', label: '历史', icon: History, color: 'mint' },
  ];

  const getTabColors = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'primary':
          return 'border-primary-500 text-primary-600 bg-primary-50/50';
        case 'violet':
          return 'border-violet-500 text-violet-600 bg-violet-50/50';
        case 'mint':
          return 'border-mint-500 text-mint-600 bg-mint-50/50';
        default:
          return 'border-dark-500 text-dark-700 bg-dark-50/50';
      }
    }
    return 'border-transparent text-dark-500 hover:text-dark-700 hover:border-dark-300 hover:bg-dark-50/30';
  };

  const getTabIconColors = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'primary':
          return 'text-primary-500';
        case 'violet':
          return 'text-violet-500';
        case 'mint':
          return 'text-mint-500';
        default:
          return 'text-dark-500';
      }
    }
    return 'text-dark-400 group-hover:text-dark-500';
  };

  // 获取最近一条进度更新
  const latestLog = logs[0];

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/tasks')}
            className="p-2.5 hover:bg-dark-100 rounded-xl transition-all duration-200 ease-out hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5 text-dark-600" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-display font-bold text-dark-900">{task.title}</h1>
              {getStatusBadge(task.status)}
              {getPriorityBadge(task.priority)}
            </div>
            <p className="text-sm text-dark-500 flex items-center gap-2">
              <Avatar
                userId={task.creator?.id}
                avatarUrl={task.creator?.avatar_url}
                name={task.creator?.full_name}
                size="xs"
                rounded="md"
              />
              <span className="font-medium text-dark-700">{task.creator?.full_name}</span>
              <span className="text-dark-400">·</span>
              <span>{new Date(task.created_at).toLocaleDateString('zh-CN')}</span>
            </p>
          </div>
        </div>
        
        {/* 删除按钮 - 右上角，仅任务创建者可删除 */}
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (confirm('确定要删除这个任务吗？')) {
                  try {
                    await taskService.deleteTask(task.id);
                    navigate('/tasks');
                  } catch (error) {
                    console.error('Error deleting task:', error);
                    alert('删除任务失败');
                  }
                }
              }}
              className="btn-secondary text-sm py-2 px-4 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-200 mb-6">
        <nav className="-mb-px flex space-x-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'details' | 'comments' | 'history')}
                className={`
                  group inline-flex items-center py-4 px-4 border-b-2 font-medium text-sm rounded-t-xl transition-all duration-200
                  ${getTabColors(tab.color, isActive)}
                `}
              >
                <tab.icon className={`-ml-0.5 mr-2 h-5 w-5 transition-colors ${getTabIconColors(tab.color, isActive)}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'details' && (
          <>
            {/* 任务描述 - 最上方 */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-dark-700 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-500" />
                  任务描述
                </h3>
                {canEdit && !isEditingDescription && (
                  <button
                    onClick={() => {
                      setEditedDescription(task.description || '');
                      setIsEditingDescription(true);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    编辑
                  </button>
                )}
                {isEditingDescription && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingDescription(false)}
                      className="text-sm text-dark-500 hover:text-dark-700 px-2 py-1"
                    >
                      取消
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await taskService.updateTask(task.id, { description: editedDescription });
                          setTask(prev => prev ? { ...prev, description: editedDescription } : null);
                          setIsEditingDescription(false);
                        } catch (error) {
                          console.error('Error updating description:', error);
                          alert('更新描述失败');
                        }
                      }}
                      className="text-sm bg-primary-600 text-white px-3 py-1 rounded-lg hover:bg-primary-700"
                    >
                      保存
                    </button>
                  </div>
                )}
              </div>
              {isEditingDescription ? (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={6}
                  className="input w-full resize-none"
                  placeholder="输入任务描述"
                />
              ) : task.description ? (
                <div className="prose prose-sm max-w-none text-dark-700 whitespace-pre-wrap">
                  {task.description}
                </div>
              ) : (
                <p className="text-dark-400 italic">暂无任务描述</p>
              )}
            </div>

            {/* 两栏布局：任务信息 + 进度与操作 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：任务信息 */}
              <div className="lg:col-span-2 space-y-6">
                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-dark-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-violet-500" />
                    任务信息
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 状态 */}
                    <div>
                      <label className="block text-sm font-medium text-dark-500 mb-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        状态
                      </label>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={!canUpdateStatus}
                        className="w-full"
                      >
                        <option value="todo">待办</option>
                        <option value="in_progress">进行中</option>
                        <option value="done">已完成</option>
                        <option value="canceled">已取消</option>
                      </select>
                    </div>

                    {/* 优先级 */}
                    <div>
                      <label className="block text-sm font-medium text-dark-500 mb-2">优先级</label>
                      {canEdit ? (
                        <select
                          value={task.priority || 'medium'}
                          onChange={async (e) => {
                            const newPriority = e.target.value as Task['priority'];
                            try {
                              await taskService.updateTask(task.id, { priority: newPriority });
                              setTask(prev => prev ? { ...prev, priority: newPriority } : null);
                            } catch (error) {
                              console.error('Error updating priority:', error);
                              alert('更新优先级失败');
                            }
                          }}
                          className="w-full"
                        >
                          <option value="low">低</option>
                          <option value="medium">中</option>
                          <option value="high">高</option>
                          <option value="urgent">紧急</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(task.priority || 'medium')}
                        </div>
                      )}
                    </div>

                    {/* 责任人 */}
                    <div>
                      <label className="block text-sm font-medium text-dark-500 mb-2 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        责任人
                      </label>
                      <div className="flex items-center gap-2">
                        <Avatar
                          userId={task.creator?.id}
                          avatarUrl={task.creator?.avatar_url}
                          name={task.creator?.full_name}
                          size="sm"
                          rounded="lg"
                        />
                        <span className="text-dark-700 font-medium">{task.creator?.full_name || '未知'}</span>
                        <span className="text-xs text-dark-400">(创建者)</span>
                      </div>
                    </div>

                    {/* 处理人 */}
                    <div>
                      <label className="block text-sm font-medium text-dark-500 mb-2 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        处理人
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {task.assignees?.map((assignee) => (
                          <div key={assignee.user_id} className="flex items-center gap-1.5 bg-violet-50 px-2 py-1 rounded-lg">
                            <Avatar
                              userId={assignee.user.id}
                              avatarUrl={assignee.user.avatar_url}
                              name={assignee.user.full_name}
                              size="xs"
                              rounded="md"
                            />
                            <span className="text-sm text-dark-700">{assignee.user.full_name}</span>
                            {assignee.is_primary && (
                              <span className="text-xs text-violet-600 font-medium">(主)</span>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => handleRemoveAssignee(assignee.user_id)}
                                className="ml-1 text-dark-400 hover:text-red-600"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        {canEdit && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddAssignee(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="text-sm py-1 px-2 w-32"
                            value=""
                          >
                            <option value="">+ 添加</option>
                            {allUsers
                              .filter(u => !task.assignees?.some(a => a.user_id === u.id) && u.id !== task.created_by)
                              .map(u => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                              ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* 所属项目 */}
                    <div>
                      <label className="block text-sm font-medium text-dark-500 mb-2 flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5" />
                        所属项目
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-dark-700 font-medium">{task.project?.name || '-'}</span>
                      </div>
                    </div>

                    {/* 截止日期 */}
                    <div>
                      <label className="block text-sm font-medium text-dark-500 mb-2 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        截止日期
                      </label>
                      {canEdit ? (
                        <input
                          type="date"
                          value={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''}
                          onChange={async (e) => {
                            const newDueDate = e.target.value || null;
                            try {
                              await taskService.updateTask(task.id, { due_date: newDueDate });
                              setTask(prev => prev ? { ...prev, due_date: newDueDate } : null);
                            } catch (error) {
                              console.error('Error updating due date:', error);
                              alert('更新截止日期失败');
                            }
                          }}
                          className="w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-dark-700">
                            {task.due_date
                              ? new Date(task.due_date).toLocaleDateString('zh-CN')
                              : '未设置'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 关联模块 */}
                  <div className="mt-6 pt-6 border-t border-dark-100">
                    <label className="block text-sm font-medium text-dark-500 mb-3">关联模块</label>
                    <div className="flex flex-wrap gap-2">
                      {task.task_modules?.map((tm) => (
                        <span
                          key={tm.module_id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-700"
                        >
                          {tm.module?.name}
                          {canEdit && (
                            <button
                              onClick={() => handleRemoveModule(tm.module_id, tm.module?.name || '未知模块')}
                              className="ml-1 hover:text-primary-900 focus:outline-none"
                              title="移除关联"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </span>
                      ))}
                      {canEdit && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              const currentIds = task.task_modules?.map(tm => tm.module_id) || [];
                              if (!currentIds.includes(e.target.value)) {
                                handleUpdateModules([...currentIds, e.target.value]);
                              }
                              e.target.value = '';
                            }
                          }}
                          className="text-sm py-1.5 px-2 pr-8 border border-dark-200 rounded-lg bg-white hover:border-primary-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none appearance-none cursor-pointer min-w-[160px]"
                          style={{ backgroundImage: 'none' }}
                          value=""
                        >
                          <option value="">+ 添加模块</option>
                          {renderModuleOptions(
                            buildModuleHierarchy(availableModules),
                            0,
                            task.task_modules?.map(tm => tm.module_id) || []
                          )}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧：进度与操作 */}
              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-dark-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-mint-500" />
                    进度与操作
                  </h3>

                  {/* 当前进度 */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-dark-600">当前进度</span>
                      <span className="text-lg font-bold text-primary-600">{currentProgress}%</span>
                    </div>
                    <div className="w-full h-3 bg-dark-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-500"
                        style={{ width: `${currentProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* 更新进度按钮 */}
                  {(isOwner || isAssignee) && isTaskActive && (
                    <button
                      onClick={() => setShowProgressModal(true)}
                      className="w-full btn-primary mb-6"
                    >
                      <TrendingUp className="w-4 h-4" />
                      更新进度
                    </button>
                  )}

                  {/* 最近更新 */}
                  {latestLog && (
                    <div className="pt-4 border-t border-dark-100">
                      <h4 className="text-sm font-medium text-dark-600 mb-3">最近更新</h4>
                      <div className="bg-dark-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar
                            userId={latestLog.creator?.id}
                            avatarUrl={latestLog.creator?.avatar_url}
                            name={latestLog.creator?.full_name}
                            size="xs"
                            rounded="md"
                          />
                          <span className="text-sm font-medium text-dark-700">{latestLog.creator?.full_name}</span>
                          <span className="text-xs text-dark-400">
                            {new Date(latestLog.created_at).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        
                        {latestLog.progress !== undefined && latestLog.progress !== null && (
                          <div className="mb-2">
                            <span className="text-sm font-bold text-primary-600">进度: {latestLog.progress}%</span>
                          </div>
                        )}
                        
                        <p className="text-sm text-dark-600 line-clamp-2">{latestLog.description}</p>
                        
                        {latestLog.attachments && latestLog.attachments.length > 0 && (
                          <div className="mt-2 text-xs text-dark-400">
                            📎 {latestLog.attachments.length} 个附件
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'comments' && (
          <TaskComments
            comments={comments}
            onAddComment={handleAddComment}
          />
        )}

        {activeTab === 'history' && (
          <div className="card p-6">
            <TaskHistory taskId={task.id} />
          </div>
        )}
      </div>

      {/* 进度更新弹窗 */}
      <TaskProgressUpdateModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        onSubmit={handleProgressUpdate}
        currentProgress={getLatestProgress()}
        taskTitle={task.title}
      />
    </div>
  );
};

export default TaskDetailPage;
