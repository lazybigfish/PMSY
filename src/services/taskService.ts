/**
 * 任务管理服务
 * 替代原有的 Supabase 任务相关调用
 */

import { api, apiClient } from '../lib/api';
import type {
  Task,
  TaskDetail,
  TaskComment,
  TaskProgressLog,
  TaskAssignee,
  TaskModule,
  CreateTaskRequest,
  UpdateTaskRequest,
  UpdateTaskProgressRequest,
  AddTaskCommentRequest,
  TaskStatus,
  TaskPriority,
  TaskHistory,
  BatchDeleteRequest,
  BatchUpdateStatusRequest,
  BatchAssignRequest,
  BatchOperationResponse
} from '../types';

/**
 * 获取任务列表
 */
export async function getTasks(options: {
  projectId?: string;
  status?: TaskStatus;
  assigneeId?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ tasks: Task[]; total: number }> {
  const { projectId, status, assigneeId, page = 0, pageSize = 20 } = options;

  let query = api.db.from('tasks').select('*').order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  // 获取总数
  const { data: countData } = await api.db.from('tasks').select('id');
  let filteredCount = countData?.length || 0;

  // 如果有过滤条件，需要单独查询
  if (assigneeId) {
    // 先获取该用户的任务ID列表
    const { data: assigneeData } = await api.db.from('task_assignees')
      .select('task_id')
      .eq('user_id', assigneeId);
    const taskIds = (assigneeData || []).map((a: TaskAssignee) => a.task_id);

    if (taskIds.length > 0) {
      query = query.in('id', taskIds);
    } else {
      return { tasks: [], total: 0 };
    }
  }

  const { data } = await query.range(page * pageSize, (page + 1) * pageSize - 1);

  return {
    tasks: data || [],
    total: filteredCount,
  };
}

/**
 * 获取任务详情
 */
export async function getTaskById(taskId: string): Promise<TaskDetail | null> {
  // 1. 获取任务基本信息
  const response = await api.db.from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (!response?.data) return null;
  
  const taskData = response.data;

  // 2. 获取项目信息
  const { data: projectData } = await api.db.from('projects')
    .select('id, name')
    .eq('id', taskData.project_id)
    .single();

  // 3. 获取任务分配人
  const { data: assigneesData } = await api.db.from('task_assignees')
    .select('*')
    .eq('task_id', taskId);

  // 4. 获取任务模块
  const { data: modulesData } = await api.db.from('task_modules')
    .select('*')
    .eq('task_id', taskId);

  return {
    ...taskData,
    project: projectData?.data,
    assignees: assigneesData || [],
    modules: modulesData || [],
  };
}

/**
 * 创建任务
 */
export async function createTask(data: CreateTaskRequest): Promise<Task> {
  const response = await api.db.from('tasks').insert({
    title: data.title,
    description: data.description,
    project_id: data.project_id,
    status: data.status || 'todo',
    priority: data.priority || 'medium',
    start_date: data.start_date || null,
    due_date: data.due_date || null,
    created_by: data.created_by,
  });

  console.log('[taskService] Insert response:', JSON.stringify(response));
  
  const newTask = response?.data?.[0];
  
  console.log('[taskService] New task:', JSON.stringify(newTask));

  if (!newTask) {
    throw new Error('创建任务失败：未能获取新创建的任务');
  }

  // 如果有分配人，创建分配记录
  if (data.assignee_ids && data.assignee_ids.length > 0) {
    const assigneesToInsert = data.assignee_ids.map((userId, index) => ({
      task_id: newTask.id,
      user_id: userId,
      is_primary: index === 0,
    }));
    await api.db.from('task_assignees').insert(assigneesToInsert);
  }

  // 如果有模块，创建模块关联
  if (data.module_ids && data.module_ids.length > 0) {
    const modulesToInsert = data.module_ids.map(moduleId => ({
      task_id: newTask.id,
      module_id: moduleId,
    }));
    await api.db.from('task_modules').insert(modulesToInsert);
  }

  return newTask;
}

/**
 * 更新任务
 */
export async function updateTask(taskId: string, data: UpdateTaskRequest & { progress?: number; completed_at?: string }): Promise<Task> {
  const updateData: any = {};

  // 只包含传入的字段，避免发送 undefined 值
  if (data.title !== undefined) {
    updateData.title = data.title;
  }
  if (data.description !== undefined) {
    updateData.description = data.description;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
  }
  if (data.priority !== undefined) {
    updateData.priority = data.priority;
  }
  if (data.start_date !== undefined) {
    updateData.start_date = data.start_date;
  }
  if (data.due_date !== undefined) {
    updateData.due_date = data.due_date;
  }
  if (data.progress !== undefined) {
    updateData.progress = data.progress;
  }
  if (data.completed_at !== undefined) {
    updateData.completed_at = data.completed_at;
  }

  const result = await api.db.from('tasks').update(updateData).eq('id', taskId);

  return result?.[0];
}

/**
 * 更新任务状态
 */
export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
  const updates: any = { status };

  if (status === 'done') {
    updates.completed_at = new Date().toISOString();
  } else {
    updates.completed_at = null;
  }

  const result = await api.db.from('tasks').update(updates).eq('id', taskId);
  return result?.[0];
}

/**
 * 删除任务
 */
export async function deleteTask(taskId: string): Promise<void> {
  await api.db.from('tasks').delete().eq('id', taskId);
}

/**
 * 获取任务评论
 */
export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data } = await api.db.from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  return data || [];
}

/**
 * 添加任务评论
 */
export async function addTaskComment(taskId: string, data: AddTaskCommentRequest): Promise<TaskComment> {
  const result = await api.db.from('task_comments').insert({
    task_id: taskId,
    content: data.content,
  });

  return result?.[0];
}

/**
 * 获取任务进度日志
 */
export async function getTaskProgressLogs(taskId: string): Promise<TaskProgressLog[]> {
  const { data } = await api.db.from('task_progress_logs')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * 更新任务进度
 */
export async function updateTaskProgress(
  taskId: string,
  data: UpdateTaskProgressRequest,
  userId?: string
): Promise<TaskProgressLog> {
  // 1. 创建进度日志
  const logResult = await api.db.from('task_progress_logs').insert({
    task_id: taskId,
    user_id: userId,
    progress: data.progress,
    description: data.content,
  });

  // 2. 更新任务状态和进度
  let newStatus: TaskStatus = 'in_progress';
  if (data.progress === 0) {
    newStatus = 'todo';
  } else if (data.progress === 100) {
    newStatus = 'done';
  }

  await api.db.from('tasks').update({
    status: newStatus,
    progress: data.progress,
    completed_at: data.progress === 100 ? new Date().toISOString() : null,
  }).eq('id', taskId);

  return logResult?.[0];
}

/**
 * 分配任务
 */
export async function assignTask(taskId: string, userIds: string[]): Promise<void> {
  // 1. 删除现有分配
  await api.db.from('task_assignees').delete().eq('task_id', taskId);

  // 2. 插入新分配
  if (userIds.length > 0) {
    const assigneesToInsert = userIds.map((userId, index) => ({
      task_id: taskId,
      user_id: userId,
      is_primary: index === 0,
    }));

    await api.db.from('task_assignees').insert(assigneesToInsert);
  }
}

/**
 * 更新任务模块
 */
export async function updateTaskModules(taskId: string, moduleIds: string[]): Promise<void> {
  // 1. 删除现有模块关联
  await api.db.from('task_modules').delete().eq('task_id', taskId);

  // 2. 插入新模块关联
  if (moduleIds.length > 0) {
    const modulesToInsert = moduleIds.map(moduleId => ({
      task_id: taskId,
      module_id: moduleId,
    }));

    await api.db.from('task_modules').insert(modulesToInsert);
  }
}

/**
 * 根据项目ID获取任务列表
 */
export async function getTasksByProject(projectId: string): Promise<Task[]> {
  const { data } = await api.db
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  return data || [];
}

/**
 * 根据执行人获取任务列表
 */
export async function getTasksByAssignee(userId: string): Promise<Task[]> {
  // 1. 获取该用户的任务ID列表
  const { data: assigneeData } = await api.db
    .from('task_assignees')
    .select('task_id')
    .eq('user_id', userId);

  const taskIds = (assigneeData || []).map((a: TaskAssignee) => a.task_id);

  if (taskIds.length === 0) return [];

  // 2. 获取任务详情
  const { data } = await api.db
    .from('tasks')
    .select('*')
    .in('id', taskIds)
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * 获取任务详情（包含所有关联数据）
 */
export async function getTaskWithDetails(taskId: string): Promise<TaskDetail | null> {
  return getTaskById(taskId);
}

/**
 * 批量更新任务
 */
export async function batchUpdateTasks(
  taskIds: string[],
  data: Partial<UpdateTaskRequest>
): Promise<void> {
  for (const taskId of taskIds) {
    await updateTask(taskId, data);
  }
}

/**
 * 搜索任务
 */
export async function searchTasks(params: {
  keyword?: string;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ tasks: Task[]; total: number }> {
  const {
    keyword,
    projectId,
    status,
    priority,
    assigneeId,
    page = 0,
    pageSize = 20,
  } = params;

  let query = api.db.from('tasks').select('*');

  if (keyword) {
    // 注意：这里假设后端支持 ilike 查询
    query = query.ilike('title', `%${keyword}%`);
  }

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (priority) {
    query = query.eq('priority', priority);
  }

  // 获取总数
  const { data: countData } = await api.db.from('tasks').select('id');
  let filteredCount = countData?.length || 0;

  // 执行人过滤
  if (assigneeId) {
    const { data: assigneeData } = await api.db
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', assigneeId);
    const taskIds = (assigneeData || []).map((a: TaskAssignee) => a.task_id);

    if (taskIds.length > 0) {
      query = query.in('id', taskIds);
    } else {
      return { tasks: [], total: 0 };
    }
  }

  const { data } = await query
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  return {
    tasks: data || [],
    total: filteredCount,
  };
}

/**
 * 批量删除任务
 */
export async function batchDeleteTasks(taskIds: string[]): Promise<BatchOperationResponse> {
  const response = await apiClient.post('/rest/v1/tasks/batch-delete', { task_ids: taskIds });
  return response;
}

/**
 * 批量更新任务状态
 */
export async function batchUpdateTaskStatus(taskIds: string[], status: TaskStatus): Promise<BatchOperationResponse> {
  const response = await apiClient.post('/rest/v1/tasks/batch-status', { task_ids: taskIds, status });
  return response;
}

/**
 * 批量分配任务处理人
 */
export async function batchAssignTasks(
  taskIds: string[],
  userIds: string[],
  mode: 'append' | 'replace' = 'append'
): Promise<BatchOperationResponse> {
  const response = await apiClient.post('/rest/v1/tasks/batch-assign', {
    task_ids: taskIds,
    user_ids: userIds,
    mode
  });
  return response;
}

/**
 * 获取任务历史记录
 */
export async function getTaskHistory(taskId: string): Promise<TaskHistory[]> {
  const response = await apiClient.get(`/rest/v1/tasks/${taskId}/history`);
  return response || [];
}

/**
 * 记录处理人变更历史
 * @param taskId 任务ID
 * @param changeType 变更类型: 'add' | 'remove'
 * @param assigneeName 处理人姓名
 */
export async function recordTaskAssigneeChange(
  taskId: string,
  changeType: 'add' | 'remove',
  assigneeName: string
): Promise<void> {
  await apiClient.post('/rest/v1/tasks/record-assignee-change', {
    task_id: taskId,
    change_type: changeType,
    assignee_name: assigneeName,
  });
}

/**
 * 记录功能模块变更历史
 * @param taskId 任务ID
 * @param changeType 变更类型: 'add' | 'remove'
 * @param moduleName 模块名称
 */
export async function recordTaskModuleChange(
  taskId: string,
  changeType: 'add' | 'remove',
  moduleName: string
): Promise<void> {
  await apiClient.post('/rest/v1/tasks/record-module-change', {
    task_id: taskId,
    change_type: changeType,
    module_name: moduleName,
  });
}

// 导出服务对象
export const taskService = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskComments,
  addTaskComment,
  getTaskProgressLogs,
  updateTaskProgress,
  assignTask,
  updateTaskModules,
  getTasksByProject,
  getTasksByAssignee,
  getTaskWithDetails,
  batchUpdateTasks,
  searchTasks,
  batchDeleteTasks,
  batchUpdateTaskStatus,
  batchAssignTasks,
  getTaskHistory,
  recordTaskAssigneeChange,
};
