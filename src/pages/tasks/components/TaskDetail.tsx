import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Task, Profile, Project, TaskComment, TaskProgressLog, TaskAttachment, TaskModule, ProjectModule } from '../../../types';
import { X, Send, Clock, Calendar, Paperclip, Plus, Edit2, Link2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContextNew';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Avatar } from '../../../components/Avatar';
import { TaskDependencyModal } from '../../../components/task/TaskDependencyModal';

interface TaskDetailProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface TaskWithRelations extends Task {
  project?: Project;
  assignees?: { user_id: string; is_primary: boolean; user: Profile }[];
  creator?: Profile;
  owner?: Profile;
  owner_id?: string;
  task_modules?: TaskModule[];
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ taskId, open, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [logs, setLogs] = useState<TaskProgressLog[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [newProgress, setNewProgress] = useState<number | null>(null);
  const [progressDesc, setProgressDesc] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');

  // New State for Enhanced Features
  const [availableModules, setAvailableModules] = useState<ProjectModule[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [isEditingModules, setIsEditingModules] = useState(false);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [isAddingAssignee, setIsAddingAssignee] = useState(false);

  const isOwner = user?.id === task?.owner_id;
  const isTaskActive = task?.status !== 'done' && task?.status !== 'canceled';
  const canEdit = isOwner && isTaskActive;

  useEffect(() => {
    if (open && taskId) {
      fetchTaskDetails();
    } else {
      setTask(null);
      setComments([]);
      setLogs([]);
    }
  }, [open, taskId]);

  const fetchTaskDetails = async (silent = false) => {
    if (!taskId) return;
    if (!silent) setLoading(true);
    try {
      // Fetch Task Info First
      // Fallback: If FK relationship is not detected, we might need to fetch owner manually.
      // But let's try the most robust syntax first.
      // If 'owner_id' is just a column and the FK constraint name is not standard or not detected by PostgREST cache yet,
      // it might fail.
      // Let's revert to fetching owner separately to ensure stability if FK is tricky.
      // 由于后端不支持 Supabase 风格的嵌套关联查询，改为分步获取数据
      // 1. 先获取任务基本信息
      const { data: taskData, error: taskError } = await api.db.from('tasks').select('*').eq('id', taskId).single();
      if (taskError) throw taskError;

      // 2. 获取关联数据
      const [
        { data: projectData },
        { data: assigneesData },
        { data: creatorData },
        { data: taskModulesData }
      ] = await Promise.all([
        taskData.project_id ? api.db.from('projects').select('*').eq('id', taskData.project_id).single() : Promise.resolve({ data: null }),
        api.db.from('task_assignees').select('user_id, is_primary').eq('task_id', taskId),
        taskData.created_by ? api.db.from('profiles').select('*').eq('id', taskData.created_by).single() : Promise.resolve({ data: null }),
        api.db.from('task_modules').select('module_id, created_at').eq('task_id', taskId)
      ]);

      // 3. 获取处理人详情
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

      // 4. 获取模块详情
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

      // 5. 获取负责人信息
      let ownerData = null;
      if (taskData.owner_id) {
        const { data } = await api.db.from('profiles').select('*').eq('id', taskData.owner_id).single();
        ownerData = data;
      }

      // 6. 组装完整任务数据
      const fullTaskData = {
        ...taskData,
        owner: ownerData,
        project: projectData,
        assignees: assigneesWithUser,
        creator: creatorData,
        task_modules: taskModulesWithModule
      };
      setTask(fullTaskData);

      setSelectedModuleIds(taskModulesWithModule.map((tm: any) => tm.module_id) || []);
      setNewProgress(null);

      // Fetch Related Data in Parallel（不使用嵌入查询，后端不支持）
      const [
        { data: commentsData },
        { data: logsData },
        { data: attachmentsData }
      ] = await Promise.all([
        api.db.from('task_comments').select('*').eq('task_id', taskId).order('created_at', { ascending: true }),
        api.db.from('task_progress_logs').select('*').eq('task_id', taskId).order('created_at', { ascending: false }),
        api.db.from('task_attachments').select('*').eq('task_id', taskId).order('created_at', { ascending: false })
      ]);

      // 获取相关用户信息
      const userIds = [...new Set([
        ...(commentsData || []).map((c: any) => c.user_id).filter(Boolean),
        ...(logsData || []).map((l: any) => l.user_id).filter(Boolean),
        ...(attachmentsData || []).map((a: any) => a.uploaded_by).filter(Boolean)
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
      const mappedAttachments = (attachmentsData || []).map((item: any) => ({ ...item, uploader: usersMap[item.uploaded_by] }));

      setComments(mappedComments);
      setLogs(mappedLogs);
      setAttachments(mappedAttachments);

      // Fetch Metadata (Modules & Users) if needed
      if (taskData.project_id) {
          const [{ data: modules }, { data: usersData }] = await Promise.all([
              api.db.from('project_modules').select('*').eq('project_id', taskData.project_id),
              api.db.from('profiles').select('*')
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
        const { error } = await api.db.from('task_assignees').insert({
            task_id: task.id,
            user_id: userId,
            is_primary: false
        });
        if (error) throw error;
        setIsAddingAssignee(false);
        // Optimistic update or silent fetch
        fetchTaskDetails();
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
        const { data: assignees } = await api.db
            .from('task_assignees')
            .select('*')
            .eq('task_id', task.id)
            .eq('user_id', userId);
        
        if (assignees && assignees.length > 0) {
            for (const assignee of assignees) {
                await api.db
                    .from('task_assignees')
                    .delete()
                    .eq('id', assignee.id);
            }
        }
        fetchTaskDetails();
    } catch (error) {
        console.error('Error removing assignee:', error);
        alert('移除处理人失败');
    }
  };

  const handleUpdateModules = async () => {
      if (!task) return;
      try {
          // Delete existing
          await api.db.from('task_modules').delete().eq('task_id', task.id);
          
          // Insert new
          if (selectedModuleIds.length > 0) {
              const toInsert = selectedModuleIds.map(mid => ({
                  task_id: task.id,
                  module_id: mid,
                  created_by: user?.id
              }));
              const { error } = await api.db.from('task_modules').insert(toInsert);
              if (error) throw error;
          }

          // Log
          await api.db.from('task_progress_logs').insert({
              task_id: task.id,
              progress: task.status === 'done' ? 100 : 0, // Keep existing progress? ideally fetch it.
              // Simplification: just log text
              description: `关联模块已更新`,
              created_by: user?.id
          });

          setIsEditingModules(false);
          fetchTaskDetails();
      } catch (error) {
          console.error('Error updating modules:', error);
          alert('更新关联模块失败');
      }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    
    // Optimistic UI Update
    const prevStatus = task.status;
    setTask({ ...task, status: newStatus as any });

    try {
      const { error } = await api.db
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'done' ? new Date().toISOString() : null
        })
        .eq('id', task.id);

      if (error) throw error;

      // Auto log progress if done
      if (newStatus === 'done') {
        await api.db.from('task_progress_logs').insert({
          task_id: task.id,
          progress: 100,
          description: 'Task marked as completed',
          created_by: user?.id
        });
      }

      // Notify assignees
      if (task.assignees && task.assignees.length > 0) {
        const notifications = task.assignees
           .filter(a => a.user_id !== user?.id)
           .map(a => ({
             user_id: a.user_id,
             title: 'Task Status Updated',
             content: `Task "${task.title}" status changed to ${newStatus.replace('_', ' ')}`,
             type: 'info',
             is_read: false
           }));
        
        if (notifications.length > 0) {
            await api.db.from('notifications').insert(notifications);
        }
      }

      // Silent refresh
      fetchTaskDetails(true); 
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      // Revert on error
      setTask({ ...task, status: prevStatus });
      alert('状态更新失败');
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;
    try {
      const { error } = await api.db
        .from('task_comments')
        .insert({
          task_id: task.id,
          content: newComment,
          created_by: user?.id
        });

      if (error) throw error;
      setNewComment('');
      fetchTaskDetails();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleUpdateProgress = async () => {
    if (!task || newProgress === null) return;
    try {
      const { error } = await api.db
        .from('task_progress_logs')
        .insert({
          task_id: task.id,
          progress: newProgress,
          description: progressDesc || `Progress updated to ${newProgress}%`,
          created_by: user?.id
        });

      if (error) throw error;
      setNewProgress(null);
      setProgressDesc('');
      fetchTaskDetails();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleAddAttachment = async () => {
    // For MVP, we'll just simulate an attachment since we don't have storage configured yet
    // In a real app, this would handle file upload to Supabase Storage
    const fakeUrl = prompt("请输入文件链接 (模拟上传):");
    if (!fakeUrl || !task) return;
    
    try {
        const { error } = await api.db.from('task_attachments').insert({
            task_id: task.id,
            file_name: `Attachment-${Date.now()}.txt`,
            file_url: fakeUrl,
            file_type: 'text/plain',
            file_size: 1024,
            uploaded_by: user?.id
        });
        if (error) throw error;
        fetchTaskDetails();
    } catch (error) {
        console.error('Error adding attachment:', error);
    }
  };

  if (!open) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-40"
          style={{
            background: `radial-gradient(circle at center,
              rgba(0,0,0,0.5) 0%,
              rgba(0,0,0,0.35) 15%,
              rgba(0,0,0,0.2) 30%,
              rgba(0,0,0,0.05) 50%,
              transparent 70%
            )`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        />
        <DialogPrimitive.Content className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-[100] overflow-y-auto p-0 flex flex-col animate-in slide-in-from-right duration-300">
          <DialogPrimitive.Title className="sr-only">任务详情</DialogPrimitive.Title>
          
          {/* Header */}
          <div className="p-6 border-b flex items-start justify-between sticky top-0 bg-white z-10">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium border
                  ${task?.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' : 
                    task?.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                    'bg-green-50 text-green-700 border-green-200'}`}>
                  {task?.priority === 'high' ? '高优先级' : task?.priority === 'medium' ? '中优先级' : '低优先级'}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border
                  ${task?.status === 'done' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                  {task?.status === 'done' ? '已完成' :
                   task?.status === 'in_progress' ? '进行中' :
                   task?.status === 'canceled' ? '已取消' : '未开始'}
                </span>
                {task?.is_public && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    公开任务
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{task?.title}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : task ? (
            <div className="flex-1 flex flex-col">
              
              {/* Tabs */}
              <div className="flex border-b px-6">
                <button 
                  onClick={() => setActiveTab('details')}
                  className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  详情
                </button>
                <button 
                  onClick={() => setActiveTab('comments')}
                  className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'comments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  评论 ({comments.length})
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  动态
                </button>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 overflow-y-auto">
                
                {/* Details Tab */}
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    <div className="prose prose-sm max-w-none text-gray-600 bg-gray-50 p-4 rounded-lg">
                      {task.description || '暂无描述'}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">责任人</label>
                        <div className="flex items-center gap-2">
                            <Avatar
                                userId={task.owner?.id}
                                avatarUrl={task.owner?.avatar_url}
                                name={task.owner?.full_name}
                                size="xs"
                            />
                            <span className="text-sm font-medium text-gray-900">{task.owner?.full_name || 'Unknown'}</span>
                            <span className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">Owner</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">所属项目</label>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          {task.project?.name || '无项目'}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">截止日期</label>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <Calendar size={14} />
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : '无截止日期'}
                        </div>
                      </div>
                      
                      {/* Related Modules Section */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">关联模块</label>
                            {canEdit && !isEditingModules && (
                                <button onClick={() => setIsEditingModules(true)} className="text-indigo-600 hover:text-indigo-800 p-0.5">
                                    <Edit2 size={12} />
                                </button>
                            )}
                        </div>
                        
                        {isEditingModules ? (
                            <div className="space-y-2 bg-gray-50 p-2 rounded border">
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {availableModules.map(m => (
                                        <label key={m.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedModuleIds.includes(m.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedModuleIds([...selectedModuleIds, m.id]);
                                                    } else {
                                                        setSelectedModuleIds(selectedModuleIds.filter(id => id !== m.id));
                                                    }
                                                }}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span>{m.name}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="flex justify-end space-x-2 pt-2 border-t">
                                    <button onClick={() => setIsEditingModules(false)} className="text-xs text-gray-500 hover:text-gray-700">取消</button>
                                    <button onClick={handleUpdateModules} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">保存</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-1">
                                {task.task_modules && task.task_modules.length > 0 ? (
                                    task.task_modules.map((tm) => (
                                        <span key={tm.module_id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                            {tm.module?.name || 'Unknown Module'}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm text-gray-400 italic">无关联模块</span>
                                )}
                            </div>
                        )}
                      </div>

                      {/* Dependency Section */}
                      <div className="col-span-2 mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                            任务依赖
                          </label>
                          <button
                            onClick={() => setShowDependencyModal(true)}
                            className="text-indigo-600 hover:text-indigo-800 flex items-center text-xs"
                          >
                            <Plus size={12} className="mr-0.5" /> 管理依赖
                          </button>
                        </div>
                        <div className="text-sm text-gray-500 italic">
                          点击"管理依赖"添加任务的前置任务和后续任务
                        </div>
                      </div>

                      <div className="col-span-2">
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">处理人</label>
                            {canEdit && !isAddingAssignee && (
                                <button onClick={() => setIsAddingAssignee(true)} className="text-indigo-600 hover:text-indigo-800 flex items-center text-xs">
                                    <Plus size={12} className="mr-0.5"/> 添加
                                </button>
                            )}
                        </div>
                        
                        {isAddingAssignee && (
                            <div className="mb-2 flex items-center space-x-2">
                                <select 
                                    className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    onChange={(e) => {
                                        if (e.target.value) handleAddAssignee(e.target.value);
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>选择用户...</option>
                                    {allUsers.filter(u => !task.assignees?.some(a => a.user_id === u.id)).map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                    ))}
                                </select>
                                <button onClick={() => setIsAddingAssignee(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {task.assignees && task.assignees.length > 0 ? (
                            task.assignees.map((assignee) => (
                              <div key={assignee.user_id} className="group relative flex items-center gap-2 bg-white border rounded-full pl-1 pr-3 py-1 shadow-sm hover:shadow-md transition-shadow">
                                <Avatar
                                  userId={assignee.user.id}
                                  avatarUrl={assignee.user.avatar_url}
                                  name={assignee.user.full_name}
                                  size="xs"
                                />
                                <span className="text-sm text-gray-700">{assignee.user.full_name || '未知用户'}</span>
                                {assignee.is_primary && <span className="text-xs text-indigo-600 font-bold" title="主要负责人">★</span>}
                                
                                {canEdit && (
                                    <button 
                                        onClick={() => handleRemoveAssignee(assignee.user_id)}
                                        className="hidden group-hover:flex absolute -top-1 -right-1 bg-red-100 text-red-600 rounded-full p-0.5 shadow-sm hover:bg-red-200"
                                        title="移除"
                                    >
                                        <X size={10} />
                                    </button>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400 italic">未分配</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Attachments Section */}
                    <div className="border-t pt-6">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Paperclip size={16} /> 附件
                        </h3>
                        <div className="space-y-2">
                            {attachments.map(att => (
                                <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                    <div className="flex items-center gap-2">
                                        <Paperclip size={14} className="text-gray-400"/>
                                        <a href={att.file_url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
                                            {att.file_name}
                                        </a>
                                        <span className="text-xs text-gray-400">({att.file_size} bytes)</span>
                                    </div>
                                    <span className="text-xs text-gray-400">由 {att.uploader?.full_name || '未知用户'} 上传</span>
                                </div>
                            ))}
                            {attachments.length === 0 && <p className="text-sm text-gray-400 italic">暂无附件</p>}
                            <button 
                                onClick={handleAddAttachment}
                                className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                                <Plus size={14} /> 添加附件
                            </button>
                        </div>
                    </div>

                    {/* Progress Update Section */}
                    <div className="border-t pt-6">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock size={16} /> 更新进度
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                         <div className="flex items-center gap-4">
                            <label className="text-sm text-gray-600 w-24">状态:</label>
                            <select 
                              value={task.status}
                              onChange={(e) => handleStatusChange(e.target.value)}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            >
                              <option value="todo">未开始</option>
                              <option value="in_progress">进行中</option>
                              <option value="paused">已暂停</option>
                              <option value="done">已完成</option>
                              <option value="canceled">已取消</option>
                            </select>
                         </div>
                         <div className="flex items-center gap-4">
                            <label className="text-sm text-gray-600 w-24">进度 (%):</label>
                            <input 
                              type="number" 
                              min="0" 
                              max="100"
                              value={newProgress === null ? '' : newProgress}
                              onChange={(e) => setNewProgress(Number(e.target.value))}
                              className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                              placeholder="0-100"
                            />
                         </div>
                         <div>
                            <textarea
                              value={progressDesc}
                              onChange={(e) => setProgressDesc(e.target.value)}
                              placeholder="描述进度或已完成的工作..."
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border min-h-[80px]"
                            />
                         </div>
                         <div className="flex justify-end">
                           <button
                             onClick={handleUpdateProgress}
                             disabled={newProgress === null}
                             className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300"
                           >
                             更新进度
                           </button>
                         </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments Tab */}
                {activeTab === 'comments' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 space-y-4 mb-6">
                      {comments.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">暂无评论</div>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                             <div className="flex-shrink-0">
                                <Avatar
                                  userId={comment.user?.id}
                                  avatarUrl={comment.user?.avatar_url}
                                  name={comment.user?.full_name}
                                  size="sm"
                                />
                             </div>
                             <div className="flex-1 bg-gray-50 p-3 rounded-lg rounded-tl-none">
                               <div className="flex justify-between items-center mb-1">
                                 <span className="text-sm font-semibold text-gray-900">{comment.user?.full_name || '未知用户'}</span>
                                 <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
                               </div>
                               <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="sticky bottom-0 bg-white pt-4 border-t">
                      <div className="relative">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="写下评论..."
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 pr-12 border min-h-[80px]"
                        />
                        <button
                          onClick={handleAddComment}
                          disabled={!newComment.trim()}
                          className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-gray-300"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                  <div className="space-y-6">
                    {logs.map((log) => (
                      <div key={log.id} className="relative pl-6 pb-6 border-l border-gray-200 last:pb-0">
                        <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-indigo-400 border-2 border-white"></div>
                        <div className="text-xs text-gray-400 mb-1">{new Date(log.created_at).toLocaleString()}</div>
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {log.user?.full_name || 'System'} 更新进度至 <span className="text-indigo-600 font-bold">{log.progress}%</span>
                        </div>
                        {log.content && (
                          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {log.content}
                          </div>
                        )}
                      </div>
                    ))}
                    {logs.length === 0 && <div className="text-center text-gray-400 py-10">暂无动态</div>}
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-red-500">无法加载任务详情</div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      <TaskDependencyModal
        isOpen={showDependencyModal}
        onClose={() => setShowDependencyModal(false)}
        taskId={taskId || ''}
        taskTitle={task?.title || ''}
        onSuccess={() => {
          // 依赖添加成功后可以刷新任务数据
        }}
      />
    </DialogPrimitive.Root>
  );
};
