/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  role: 'admin' | 'user' | 'project_manager' | 'team_member' | 'manager';
  email: string;
  phone: string;
  bio?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  customer_name: string;
  amount: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'paused';
  is_public: boolean;
  manager_id: string;
  current_milestone_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectModule {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused' | 'delayed';
  sort_order: number;
  level: number;
  progress?: number;
  children?: ProjectModule[];
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  start_date: string;
  end_date: string;
  phase_order: number;
}

export interface MilestoneTask {
  id: string;
  milestone_id: string;
  name: string;
  description: string;
  is_required: boolean;
  is_completed: boolean;
  output_documents: { name: string; url: string }[];
}

export interface Task {
  id: string;
  project_id: string;
  module_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'paused' | 'done' | 'canceled';
  priority: 'low' | 'medium' | 'high';
  is_public: boolean;
  assigned_to: string;
  created_by: string;
  owner_id: string;
  due_date: string;
  completed_at?: string;
  created_at: string;
}

export interface TaskProgressLog {
  id: string;
  task_id: string;
  progress: number;
  description: string;
  created_by: string;
  created_at: string;
  creator?: Profile;
  attachments?: TaskProgressAttachment[];
}

export interface TaskProgressAttachment {
  id: string;
  progress_log_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: Profile;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  uploaded_by: string;
  created_at: string;
  uploader?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  type?: 'development' | 'product' | 'service';
  contact_person: string;
  phone: string;
  email: string;
  address?: string;
  description: string;
  status: 'active' | 'inactive';
  project_id: string; // Deprecated in favor of Many-to-Many but kept for legacy? Or can be removed if strictly following new schema.
}

export interface ProjectSupplier {
    id: string;
    project_id: string;
    supplier_id: string;
    cooperation_type: 'development' | 'product' | 'service';
    contract_amount: number;
    contract_file_url?: string;
    module_ids?: string[];
    progress: number;
    estimated_completion_date?: string;
    actual_completion_date?: string;
    supplier?: Supplier;
    payments?: { amount: number }[];
}

export interface SupplierAcceptance {
    id: string;
    project_supplier_id: string;
    acceptance_date: string;
    result: 'pass' | 'fail';
    description: string;
    attachments: { name: string; url: string }[];
    created_by: string;
    created_at: string;
    creator?: Profile;
}

export interface SupplierPaymentPlan {
    id: string;
    project_supplier_id: string;
    milestone_name: string;
    planned_amount: number;
    planned_date: string;
    payment_percentage?: number;
    payment_reason?: string;
    materials?: { name: string; url: string }[];
    status: 'pending' | 'paid' | 'overdue';
}

export interface SupplierPayment {
    id: string;
    project_supplier_id: string;
    payment_plan_id?: string;
    amount: number;
    payment_date: string;
    voucher_url?: string;
    remark?: string;
    created_by: string;
    created_at: string;
}

export interface ConstructionRecord {
    id: string;
    project_supplier_id: string;
    construction_status: string;
    registered_by: string;
    attachments: { name: string; url: string }[];
    created_at: string;
    registrant?: Profile;
}

export interface ProgressAdjustment {
    id: string;
    project_supplier_id: string;
    old_progress: number;
    new_progress: number;
    adjustment_reason: string;
    adjusted_by: string;
    created_at: string;
    adjuster?: Profile;
}

export interface Risk {
  id: string;
  project_id: string;
  title: string;
  description: string;
  level: 'low' | 'medium' | 'high';
  status: 'open' | 'handling' | 'closed';
  owner_id: string;
  impact: string;
  mitigation_plan: string;
  handling_records: { date: string; content: string; handler_id: string }[];
  created_at: string;
}

export interface Report {
  id: string;
  project_id: string;
  title: string;
  type: 'daily' | 'weekly';
  status: 'draft' | 'published';
  content: {
    overview: string;
    risks: string;
    completed_work: string;
    plan: string;
  };
  ai_analysis: any;
  created_by: string;
  created_at: string;
}

export interface AIProvider {
  id: string;
  name: string;
  api_endpoint: string;
  api_key: string;
  model: string;
  is_active: boolean;
}

export interface AIRole {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  is_default: boolean;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  is_primary: boolean;
  assigned_at: string;
  user?: Profile;
}

export interface TaskModule {
  task_id: string;
  module_id: string;
  created_at: string;
  created_by: string;
  module?: ProjectModule;
}

// ==================== 水漫金山模块类型 ====================

export interface HotNews {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  keywords: string;
  published_at: string;
  comments_count?: number;
}

export interface NewsComment {
  id: string;
  news_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: Profile;
}

export type ForumCategory = 'tech' | 'experience' | 'help' | 'chat' | 'other';

export interface ForumPost {
  id: string;
  title: string;
  content: any;
  author_id: string;
  author?: Profile;
  category: ForumCategory;
  is_pinned: boolean;
  is_essence: boolean;
  view_count: number;
  reply_count: number;
  last_reply_at?: string;
  last_reply_by?: string;
  last_reply_user?: Profile;
  attachments: any[];
  created_at: string;
  updated_at: string;
}

export interface ForumReply {
  id: string;
  post_id: string;
  author_id: string;
  author?: Profile;
  content: any;
  parent_id?: string;
  quoted_reply_id?: string;
  quoted_reply?: ForumReply;
  created_at: string;
  updated_at: string;
}

export interface OperationLog {
  id: string;
  operator_id: string;
  operator_name?: string;
  operation_type: 'pin' | 'unpin' | 'essence' | 'unessence' | 'delete_post' | 'delete_reply';
  target_type: 'post' | 'reply';
  target_id: string;
  target_title?: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// 客户相关类型
export interface Client {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  phone: string;
  is_primary: boolean;
  created_at: string;
}

export interface ProjectClient {
  id: string;
  project_id: string;
  client_id: string;
  contract_amount: number;
  contract_file_url?: string;
  created_at: string;
}
