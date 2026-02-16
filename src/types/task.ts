/**
 * 任务管理相关类型定义
 */

// 任务状态 - 与数据库约束保持一致: CHECK (status IN ('todo', 'in_progress', 'paused', 'done', 'canceled'))
export type TaskStatus = 'todo' | 'in_progress' | 'paused' | 'done' | 'canceled';

// 任务优先级
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// 任务基础信息
export interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string;
  status: TaskStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  module_id?: string | null;
  is_public?: boolean;
}

// 任务详情（包含关联信息）
export interface TaskDetail extends Task {
  owner_id?: string;
  project?: {
    id: string;
    name: string;
  };
  assignees?: TaskAssignee[];
  modules?: TaskModule[];
  comments?: TaskComment[];
  progress_logs?: TaskProgressLog[];
  attachments?: TaskAttachment[];
}

// 任务分配
export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// 任务模块关联
export interface TaskModule {
  id: string;
  task_id: string;
  module_id: string;
  created_at: string;
  module?: {
    id: string;
    name: string;
  };
}

// 任务评论
export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// 任务进度日志
export interface TaskProgressLog {
  id: string;
  task_id: string;
  user_id: string;
  progress: number;
  content: string | null;
  description?: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  attachments?: {
    id: string;
    file_name: string;
    file_url: string;
  }[];
}

// 任务附件
export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
  file_url?: string;
  uploader?: {
    id: string;
    full_name: string | null;
  };
}

// 创建任务请求
export interface CreateTaskRequest {
  title: string;
  description?: string;
  project_id: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  start_date?: string;
  due_date?: string;
  assignee_ids?: string[];
  module_ids?: string[];
  is_public?: boolean;
  created_by?: string;
  owner_id?: string;
}

// 更新任务请求
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  start_date?: string;
  due_date?: string;
  completed_at?: string;
}

// 更新任务进度请求
export interface UpdateTaskProgressRequest {
  progress: number;
  content?: string;
}

// 添加任务评论请求
export interface AddTaskCommentRequest {
  content: string;
}

/**
 * 任务历史记录
 */
export interface TaskHistory {
  id: string;
  task_id: string;
  user_id: string;
  field_name: string;           // 变更字段: title/status/priority/due_date/assignees等
  old_value: string | null;     // 变更前值
  new_value: string | null;     // 变更后值
  change_type: 'create' | 'update' | 'delete';
  description: string;          // 友好描述: "将优先级从'中'修改为'高'"
  created_at: string;
  creator?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

/**
 * 批量操作请求
 */
export interface BatchDeleteRequest {
  task_ids: string[];
}

export interface BatchUpdateStatusRequest {
  task_ids: string[];
  status: TaskStatus;
}

export interface BatchAssignRequest {
  task_ids: string[];
  user_ids: string[];           // 要添加的处理人ID列表
  mode?: 'append' | 'replace';  // append: 追加, replace: 替换
}

/**
 * 批量操作响应
 */
export interface BatchOperationResponse {
  deleted?: number;
  updated?: number;
  failed?: { id: string; reason: string }[];
  message: string;
}

// 风险等级
export type RiskLevel = 'low' | 'medium' | 'high';

// 风险状态
export type RiskStatus = 'open' | 'mitigated' | 'closed';

// 风险
export interface Risk {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  impact: string | null;
  level: RiskLevel;
  status: RiskStatus;
  mitigation_plan: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
