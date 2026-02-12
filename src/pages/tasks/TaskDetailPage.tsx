import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Task, Profile, Project, TaskComment, TaskProgressLog, ProjectModule, TaskModule } from '../../types';
import { ArrowLeft, FileText, MessageSquare, History, Sparkles, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TaskInfo } from './components/TaskInfo';
import { TaskComments } from './components/TaskComments';
import { TaskProgressUpdateModal } from './components/TaskProgressUpdateModal';

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

  // 权限判断
  const isOwner = user?.id === task?.created_by;  // 责任人（创建者）
  const isAssignee = task?.assignees?.some(a => a.user_id === user?.id);  // 处理人
  const isTaskActive = task?.status !== 'done' && task?.status !== 'canceled';
  
  // 编辑权限：只有责任人可以编辑任务属性
  const canEdit = isOwner && isTaskActive;
  
  // 状态更新权限：责任人或处理人都可以更新状态
  const canUpdateStatus = (isOwner || isAssignee) && isTaskActive;

  useEffect(() => {
    if (id) {
      fetchTaskDetails();
    }
  }, [id]);

  const fetchTaskDetails = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const { data: taskData, error: taskError } = await supabase.from('tasks').select(`
          *,
          project:projects(*),
          assignees:task_assignees(user_id, is_primary, user:profiles(*)),
          creator:created_by(*),
          task_modules:task_modules(module_id, created_at, module:project_modules(*))
      `).eq('id', id).single();

      if (taskError) throw taskError;
      
      let ownerData = null;
      if (taskData.owner_id) {
          const { data } = await supabase.from('profiles').select('*').eq('id', taskData.owner_id).single();
          ownerData = data;
      }
      
      const fullTaskData = { ...taskData, owner: ownerData };
      setTask(fullTaskData);

      const [
          { data: commentsData },
          { data: logsData }
      ] = await Promise.all([
        supabase.from('task_comments').select(`*, creator:created_by(*)`).eq('task_id', id).order('created_at', { ascending: true }),
        supabase.from('task_progress_logs').select(`*, creator:created_by(*), attachments:task_progress_attachments(*)`).eq('task_id', id).order('created_at', { ascending: false })
      ]);

      setComments(commentsData || []);
      setLogs(logsData || []);

      // 设置当前进度
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
          const [{ data: modules }, { data: usersData }] = await Promise.all([
              supabase.from('project_modules').select('*').eq('project_id', taskData.project_id),
              supabase.from('profiles').select('*')
          ]);
          setAvailableModules(modules || []);
          setAllUsers(usersData || []);
      }
    } catch (error) {
      console.error('Error fetching task details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignee = async (userId: string) => {
    if (!task) return;
    try {
        const { error } = await supabase.from('task_assignees').insert({
            task_id: task.id,
            user_id: userId,
            is_primary: false
        });
        if (error) throw error;
        fetchTaskDetails(true);
    } catch (error) {
        console.error('Error adding assignee:', error);
        alert('添加处理人失败');
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    if (!task || !task.assignees) return;
    if (task.assignees.length <= 1) {
        alert('必须保留至少一个处理人');
        return;
    }
    if (!confirm('确定要移除该处理人吗？')) return;

    try {
        const { error } = await supabase
            .from('task_assignees')
            .delete()
            .eq('task_id', task.id)
            .eq('user_id', userId);
        if (error) throw error;
        fetchTaskDetails(true);
    } catch (error) {
        console.error('Error removing assignee:', error);
        alert('移除处理人失败');
    }
  };

  const handleUpdateModules = async (moduleIds: string[]) => {
      if (!task) return;
      try {
          await supabase.from('task_modules').delete().eq('task_id', task.id);
          
          if (moduleIds.length > 0) {
              const toInsert = moduleIds.map(mid => ({
                  task_id: task.id,
                  module_id: mid,
                  created_by: user?.id
              }));
              const { error } = await supabase.from('task_modules').insert(toInsert);
              if (error) throw error;
          }
          fetchTaskDetails(true);
      } catch (error) {
          console.error('Error updating modules:', error);
          alert('更新关联模块失败');
      }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    
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
        .eq('id', task.id);

      if (error) throw error;
      
      await supabase.from('task_progress_logs').insert({
        task_id: task.id,
        progress: newStatus === 'done' ? 100 : task.status === 'done' ? 0 : undefined,
        description: `状态变更为: ${newStatus}`,
        created_by: user?.id
      });

      fetchTaskDetails(true);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('状态更新失败');
    }
  };

  const handleAddComment = async (content: string) => {
    if (!task || !user) return;
    try {
      const { error } = await supabase.from('task_comments').insert({
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

  // 处理进度更新提交
  const handleProgressUpdate = async (progress: number, content: string, attachments: any[]) => {
    if (!task || !user) return;

    try {
      // 1. 创建进度更新记录
      const { data: progressLog, error: logError } = await supabase
        .from('task_progress_logs')
        .insert({
          task_id: task.id,
          progress,
          description: content,
          created_by: user.id
        })
        .select()
        .single();

      if (logError) throw logError;

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
          const { error: attError } = await supabase
            .from('task_progress_attachments')
            .insert(attachmentsToInsert);

          if (attError) throw attError;
        }
      }

      // 3. 如果进度为100%，自动完成任务
      if (progress === 100 && task.status !== 'done') {
        await supabase
          .from('tasks')
          .update({
            status: 'done',
            completed_at: new Date().toISOString()
          })
          .eq('id', task.id);
      }

      // 4. 发送通知给责任人和其他处理人
      const notifications = [];

      // 通知责任人（如果不是自己）
      if (task.created_by !== user.id) {
        notifications.push({
          user_id: task.created_by,
          title: '任务进度更新',
          content: `任务 "${task.title}" 进度更新为 ${progress}%`,
          type: 'info',
          is_read: false
        });
      }

      // 通知其他处理人
      task.assignees?.forEach(assignee => {
        if (assignee.user_id !== user.id) {
          notifications.push({
            user_id: assignee.user_id,
            title: '任务进度更新',
            content: `任务 "${task.title}" 进度更新为 ${progress}%`,
            type: 'info',
            is_read: false
          });
        }
      });

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      // 刷新数据
      fetchTaskDetails(true);

      // 更新当前进度状态
      setCurrentProgress(progress);

    } catch (error) {
      console.error('Error submitting progress update:', error);
      alert('提交进度更新失败');
      throw error;
    }
  };

  // 获取最新的进度值
  const getLatestProgress = () => {
    if (logs.length > 0 && logs[0].progress !== undefined && logs[0].progress !== null) {
      return logs[0].progress;
    }
    // 根据状态返回默认进度
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
      case 'high':
        return <span className="badge bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />高优先级</span>;
      case 'medium':
        return <span className="badge bg-sun-100 text-sun-700">中优先级</span>;
      case 'low':
        return <span className="badge bg-mint-100 text-mint-700">低优先级</span>;
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
          return 'border-primary-500 text-primary-600';
        case 'violet':
          return 'border-violet-500 text-violet-600';
        case 'mint':
          return 'border-mint-500 text-mint-600';
        default:
          return 'border-dark-500 text-dark-700';
      }
    }
    return 'border-transparent text-dark-500 hover:text-dark-700 hover:border-dark-300';
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

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/tasks')}
          className="p-2.5 hover:bg-dark-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-dark-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-display font-bold text-dark-900">{task.title}</h1>
            {getStatusBadge(task.status)}
            {getPriorityBadge(task.priority)}
          </div>
          <p className="text-sm text-dark-500 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold">
              {task.creator?.full_name?.charAt(0) || '?'}
            </span>
            <span className="font-medium text-dark-700">{task.creator?.full_name}</span>
            <span>·</span>
            <span>{new Date(task.created_at).toLocaleDateString('zh-CN')}</span>
          </p>
        </div>
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
      <div className="card p-6">
        {activeTab === 'details' && (
          <TaskInfo
            task={task}
            availableModules={availableModules}
            allUsers={allUsers}
            canEdit={canEdit}
            canUpdateStatus={canUpdateStatus}
            onStatusChange={handleStatusChange}
            onAddAssignee={handleAddAssignee}
            onRemoveAssignee={handleRemoveAssignee}
            onUpdateModules={handleUpdateModules}
          />
        )}

        {activeTab === 'comments' && (
          <TaskComments
            comments={comments}
            onAddComment={handleAddComment}
          />
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* 更新进度按钮 */}
            {(isOwner || isAssignee) && isTaskActive && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowProgressModal(true)}
                  className="btn-primary"
                >
                  <TrendingUp className="w-4 h-4" />
                  更新进度
                </button>
              </div>
            )}

            {/* 进度更新列表 */}
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4 p-4 bg-dark-50 rounded-xl">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0 shadow-glow">
                  {log.creator?.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-dark-900">{log.creator?.full_name}</span>
                    <span className="text-xs text-dark-400">
                      {new Date(log.created_at).toLocaleString('zh-CN')}
                    </span>
                  </div>

                  {/* 进度条（如果有进度值） */}
                  {log.progress !== undefined && log.progress !== null && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-dark-500">进度更新</span>
                        <span className="text-sm font-bold text-primary-600">{log.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-dark-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all"
                          style={{ width: `${log.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 更新内容 */}
                  <p className="text-dark-700 whitespace-pre-wrap">{log.description}</p>

                  {/* 附件列表 */}
                  {log.attachments && log.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-dark-500">附件:</p>
                      <div className="flex flex-wrap gap-2">
                        {log.attachments.map((att: any) => (
                          <a
                            key={att.id}
                            href={att.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-sm text-dark-700 hover:bg-primary-50 hover:text-primary-600 transition-colors border border-dark-100"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="max-w-[150px] truncate">{att.file_name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-dark-100 flex items-center justify-center mx-auto mb-4">
                  <History className="h-8 w-8 text-dark-400" />
                </div>
                <p className="text-dark-500">暂无历史记录</p>
                {(isOwner || isAssignee) && isTaskActive && (
                  <button
                    onClick={() => setShowProgressModal(true)}
                    className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    添加第一条进度更新
                  </button>
                )}
              </div>
            )}
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
