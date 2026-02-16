/**
 * 项目管理服务
 * 替代原有的 Supabase 项目相关调用
 */

import { api } from '../lib/api';
import type {
  Project,
  ProjectDetail,
  ProjectModule,
  ProjectMilestone,
  ProjectRisk,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateProjectModuleRequest,
  CreateMilestoneRequest,
  CreateRiskRequest
} from '../types';

/**
 * 获取项目列表
 */
export async function getProjects(options: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ projects: Project[]; total: number }> {
  const { status, search, page = 0, pageSize = 20 } = options;

  let query = api.db.from('projects').select('*').order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data } = await query.range(page * pageSize, (page + 1) * pageSize - 1);

  // 获取总数
  const { data: countData } = await api.db.from('projects').select('id');

  return {
    projects: data || [],
    total: countData?.length || 0,
  };
}

/**
 * 获取项目详情
 */
export async function getProjectById(projectId: string): Promise<ProjectDetail | null> {
  // 1. 获取项目基本信息
  const projectData = await api.db.from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (!projectData) return null;

  // 2. 获取项目模块
  const modulesData = await api.db.from('project_modules')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order');

  // 3. 获取项目里程碑
  const milestonesData = await api.db.from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('phase_order');

  // 4. 获取项目风险
  const risksData = await api.db.from('risks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return {
    ...projectData?.data,
    modules: modulesData?.data || [],
    milestones: milestonesData?.data || [],
    risks: risksData?.data || [],
  };
}

/**
 * 创建项目
 */
export async function createProject(data: CreateProjectRequest): Promise<Project> {
  const statusMap: Record<string, string> = {
    'planning': 'pending',
    'in_progress': 'in_progress',
    'completed': 'completed',
    'on_hold': 'paused',
    'cancelled': 'paused',
  };
  
  const { data: result, error } = await api.db.from('projects').insert({
    name: data.name,
    description: data.description,
    customer_name: data.customer_name,
    amount: data.amount,
    is_public: data.is_public,
    status: statusMap[data.status || 'planning'] || 'pending',
    manager_id: data.manager_id || null,
  });

  if (error) throw error;
  return result?.[0];
}

/**
 * 更新项目
 */
export async function updateProject(projectId: string, data: UpdateProjectRequest): Promise<Project> {
  const statusMap: Record<string, string> = {
    'planning': 'pending',
    'in_progress': 'in_progress',
    'completed': 'completed',
    'on_hold': 'paused',
    'cancelled': 'paused',
  };
  
  const updateData: Record<string, any> = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.customer_name !== undefined) updateData.customer_name = data.customer_name;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.is_public !== undefined) updateData.is_public = data.is_public;
  if (data.status !== undefined) updateData.status = statusMap[data.status] || data.status;
  if (data.manager_id !== undefined) updateData.manager_id = data.manager_id;
  if (data.current_milestone_id !== undefined) updateData.current_milestone_id = data.current_milestone_id;
  
  const { data: result, error } = await api.db.from('projects').update(updateData).eq('id', projectId);

  if (error) throw error;
  return result?.[0];
}

/**
 * 删除项目
 */
export async function deleteProject(projectId: string): Promise<void> {
  await api.db.from('projects').delete().eq('id', projectId);
}

/**
 * 获取项目模块
 */
export async function getProjectModules(projectId: string): Promise<ProjectModule[]> {
  const { data } = await api.db.from('project_modules')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order');

  return data || [];
}

/**
 * 创建项目模块
 */
export async function createProjectModule(data: CreateProjectModuleRequest): Promise<ProjectModule> {
  const result = await api.db.from('project_modules').insert({
    project_id: data.project_id,
    name: data.name,
    description: data.description,
    sort_order: data.sort_order || 0,
  });

  return result?.[0];
}

/**
 * 更新项目模块
 */
export async function updateProjectModule(moduleId: string, data: Partial<CreateProjectModuleRequest>): Promise<ProjectModule> {
  const result = await api.db.from('project_modules').update({
    name: data.name,
    description: data.description,
    sort_order: data.sort_order,
  }).eq('id', moduleId);

  return result?.[0];
}

/**
 * 删除项目模块
 */
export async function deleteProjectModule(moduleId: string): Promise<void> {
  await api.db.from('project_modules').delete().eq('id', moduleId);
}

/**
 * 获取项目里程碑
 */
export async function getProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
  const { data } = await api.db.from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('phase_order');

  return data || [];
}

/**
 * 创建里程碑
 */
export async function createMilestone(data: CreateMilestoneRequest): Promise<ProjectMilestone> {
  const result = await api.db.from('project_milestones').insert({
    project_id: data.project_id,
    name: data.name,
    description: data.description,
    planned_date: data.planned_date || null,
    status: 'pending',
  });

  return result?.[0];
}

/**
 * 更新里程碑
 */
export async function updateMilestone(milestoneId: string, data: Partial<CreateMilestoneRequest>): Promise<ProjectMilestone> {
  const result = await api.db.from('project_milestones').update({
    name: data.name,
    description: data.description,
    planned_date: data.planned_date,
  }).eq('id', milestoneId);

  return result?.[0];
}

/**
 * 完成里程碑
 */
export async function completeMilestone(milestoneId: string): Promise<ProjectMilestone> {
  const result = await api.db.from('project_milestones').update({
    status: 'completed',
    actual_date: new Date().toISOString(),
  }).eq('id', milestoneId);

  return result?.[0];
}

/**
 * 删除里程碑
 */
export async function deleteMilestone(milestoneId: string): Promise<void> {
  await api.db.from('project_milestones').delete().eq('id', milestoneId);
}

/**
 * 获取项目风险
 */
export async function getProjectRisks(projectId: string): Promise<ProjectRisk[]> {
  const { data } = await api.db.from('risks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * 创建风险
 */
export async function createRisk(data: CreateRiskRequest): Promise<ProjectRisk> {
  const result = await api.db.from('risks').insert({
    project_id: data.project_id,
    title: data.title,
    description: data.description,
    level: data.level,
    status: 'open',
    mitigation_plan: data.mitigation_plan || null,
  });

  return result?.[0];
}

/**
 * 更新风险
 */
export async function updateRisk(riskId: string, data: Partial<CreateRiskRequest>): Promise<ProjectRisk> {
  const result = await api.db.from('risks').update({
    title: data.title,
    description: data.description,
    level: data.level,
    mitigation_plan: data.mitigation_plan,
  }).eq('id', riskId);

  return result?.[0];
}

/**
 * 关闭风险
 */
export async function closeRisk(riskId: string): Promise<ProjectRisk> {
  const result = await api.db.from('risks').update({
    status: 'closed',
  }).eq('id', riskId);

  return result?.[0];
}

/**
 * 删除风险
 */
export async function deleteRisk(riskId: string): Promise<void> {
  await api.db.from('risks').delete().eq('id', riskId);
}

/**
 * 获取项目统计
 */
export async function getProjectStats(projectId: string): Promise<{
  totalTasks: number;
  completedTasks: number;
  totalMilestones: number;
  completedMilestones: number;
  openRisks: number;
  progress: number;
}> {
  const [{ data: tasks }, { data: milestones }, { data: risks }] = await Promise.all([
    api.db.from('tasks').select('status').eq('project_id', projectId),
    api.db.from('project_milestones').select('status').eq('project_id', projectId),
    api.db.from('risks').select('status').eq('project_id', projectId),
  ]);

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t: any) => t.status === 'completed').length || 0;
  const totalMilestones = milestones?.length || 0;
  const completedMilestones = milestones?.filter((m: any) => m.status === 'completed').length || 0;
  const openRisks = risks?.filter((r: any) => r.status === 'open').length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    totalMilestones,
    completedMilestones,
    openRisks,
    progress,
  };
}

/**
 * 获取项目成员
 */
export async function getProjectMembers(projectId: string): Promise<any[]> {
  const { data } = await api.db
    .from('project_members')
    .select('*')
    .eq('project_id', projectId);
  return data || [];
}

/**
 * 添加项目成员
 */
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: string
): Promise<void> {
  await api.db.from('project_members').insert({
    project_id: projectId,
    user_id: userId,
    role,
  });
}

/**
 * 移除项目成员
 */
export async function removeProjectMember(memberId: string): Promise<void> {
  await api.db.from('project_members').delete().eq('id', memberId);
}

/**
 * 获取项目进度
 */
export async function getProjectProgress(projectId: string): Promise<number> {
  const stats = await getProjectStats(projectId);
  return stats.progress;
}

// 导出服务对象
export const projectService = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectModules,
  createProjectModule,
  updateProjectModule,
  deleteProjectModule,
  getProjectMilestones,
  createMilestone,
  updateMilestone,
  completeMilestone,
  deleteMilestone,
  getProjectRisks,
  createRisk,
  updateRisk,
  closeRisk,
  deleteRisk,
  getProjectStats,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  getProjectProgress,
};
