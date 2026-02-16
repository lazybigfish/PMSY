/**
 * 项目管理相关类型定义
 */

// 项目状态
export type ProjectStatus = 'pending' | 'in_progress' | 'completed' | 'paused';

// 项目基础信息
export interface Project {
  id: string;
  name: string;
  description: string | null;
  customer_name: string | null;
  amount: number | null;
  is_public: boolean;
  status: ProjectStatus;
  manager_id: string | null;
  current_milestone_id: string | null;
  created_at: string;
  updated_at: string;
}

// 项目详情
export interface ProjectDetail extends Project {
  manager?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  modules?: ProjectModule[];
  milestones?: ProjectMilestone[];
  members?: ProjectMember[];
  risks?: ProjectRisk[];
}

// 项目模块
export interface ProjectModule {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  // 扩展字段（用于层级结构）
  parent_id?: string | null;
  children?: ProjectModule[];
  level?: number;
  progress?: number;
  status?: 'pending' | 'in_progress' | 'completed' | 'delayed';
}

// 项目里程碑
export interface ProjectMilestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  planned_date: string | null;
  actual_date: string | null;
  status: 'pending' | 'completed';
  sort_order: number;
  created_at: string;
}

// 项目成员
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// 项目风险
export interface ProjectRisk {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  level: 'low' | 'medium' | 'high';
  status: 'open' | 'mitigated' | 'closed';
  mitigation_plan: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 创建项目请求
export interface CreateProjectRequest {
  name: string;
  description?: string;
  customer_name?: string;
  amount?: number;
  is_public?: boolean;
  status?: ProjectStatus;
  manager_id?: string;
}

// 更新项目请求
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  customer_name?: string;
  amount?: number;
  is_public?: boolean;
  status?: ProjectStatus;
  manager_id?: string;
  current_milestone_id?: string | null;
}

// 创建项目模块请求
export interface CreateProjectModuleRequest {
  project_id: string;
  name: string;
  description?: string;
  sort_order?: number;
  parent_id?: string | null;
}

// 创建里程碑请求
export interface CreateMilestoneRequest {
  project_id: string;
  name: string;
  description?: string;
  planned_date?: string;
}

// 创建风险请求
export interface CreateRiskRequest {
  project_id: string;
  title: string;
  description?: string;
  level: 'low' | 'medium' | 'high';
  mitigation_plan?: string;
}

// 项目供应商
export interface ProjectSupplier {
  id: string;
  project_id: string;
  supplier_id: string;
  contract_amount?: number | null;
  role?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  module_ids?: string[] | null;
  contract_file_url?: string | null;
  created_at: string;
  supplier?: {
    id: string;
    name: string;
    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  payments?: SupplierPaymentPlan[];
  progress?: number;
  acceptances?: SupplierAcceptance[];
}

// 供应商验收
export interface SupplierAcceptance {
  id: string;
  project_supplier_id: string;
  name: string;
  description?: string | null;
  status: 'pending' | 'passed' | 'failed';
  acceptance_type?: string | null;
  acceptance_date?: string | null;
  accepted_at?: string | null;
  result?: string | null;
  created_at: string;
}

// 客户
export interface Client {
  id: string;
  name: string;
  code?: string | null;
  type?: 'enterprise' | 'government' | 'individual' | null;
  industry?: string | null;
  scale?: 'small' | 'medium' | 'large' | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  location?: string | null;
  status?: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  position?: string | null;
  is_primary?: boolean;
  created_at: string;
  updated_at: string;
}

// 供应商付款计划
export interface SupplierPaymentPlan {
  id: string;
  project_supplier_id: string;
  amount: number;
  planned_date: string;
  actual_payment_date?: string | null;
  status: 'pending' | 'paid';
  voucher_url?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

// 报告
export interface Report {
  id: string;
  project_id: string;
  title: string;
  type: 'daily' | 'weekly';
  status: 'draft' | 'published';
  content: {
    overview?: string;
    risks?: string;
    completed_work?: string;
    plan?: string;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 供应商
export interface Supplier {
  id: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  description?: string | null;
  status?: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}
