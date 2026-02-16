/**
 * 系统配置服务
 * 替代原有的 Supabase 系统配置相关调用
 */

import { api } from '../lib/api';

// AI 提供商
export interface AIProvider {
  id: string;
  name: string;
  api_key: string | null;
  base_url: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// AI 角色
export interface AIRole {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  provider_id: string | null;
  created_at: string;
  updated_at: string;
}

// 里程碑模板
export interface MilestoneTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 里程碑任务模板
export interface MilestoneTaskTemplate {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

/**
 * 获取 AI 提供商列表
 */
export async function getAIProviders(): Promise<AIProvider[]> {
  const { data } = await api.db.from('ai_providers')
    .select('*')
    .order('name');
  return data || [];
}

/**
 * 获取默认 AI 提供商
 */
export async function getDefaultAIProvider(): Promise<AIProvider | null> {
  const { data } = await api.db.from('ai_providers')
    .select('*')
    .eq('is_default', true)
    .single();
  return data?.data || null;
}

/**
 * 创建 AI 提供商
 */
export async function createAIProvider(data: Partial<AIProvider>): Promise<AIProvider> {
  const result = await api.db.from('ai_providers').insert({
    name: data.name,
    api_key: data.api_key,
    base_url: data.base_url,
    is_default: data.is_default || false,
  });
  return result?.[0];
}

/**
 * 更新 AI 提供商
 */
export async function updateAIProvider(id: string, data: Partial<AIProvider>): Promise<AIProvider> {
  const result = await api.db.from('ai_providers').update({
    name: data.name,
    api_key: data.api_key,
    base_url: data.base_url,
    is_default: data.is_default,
  }).eq('id', id);
  return result?.[0];
}

/**
 * 删除 AI 提供商
 */
export async function deleteAIProvider(id: string): Promise<void> {
  await api.db.from('ai_providers').delete().eq('id', id);
}

/**
 * 获取 AI 角色列表
 */
export async function getAIRoles(): Promise<AIRole[]> {
  const { data } = await api.db.from('ai_roles')
    .select('*')
    .order('name');
  return data || [];
}

/**
 * 创建 AI 角色
 */
export async function createAIRole(data: Partial<AIRole>): Promise<AIRole> {
  const result = await api.db.from('ai_roles').insert({
    name: data.name,
    description: data.description,
    system_prompt: data.system_prompt,
    temperature: data.temperature || 0.7,
    max_tokens: data.max_tokens || 2000,
    provider_id: data.provider_id,
  });
  return result?.[0];
}

/**
 * 更新 AI 角色
 */
export async function updateAIRole(id: string, data: Partial<AIRole>): Promise<AIRole> {
  const result = await api.db.from('ai_roles').update({
    name: data.name,
    description: data.description,
    system_prompt: data.system_prompt,
    temperature: data.temperature,
    max_tokens: data.max_tokens,
    provider_id: data.provider_id,
  }).eq('id', id);
  return result?.[0];
}

/**
 * 删除 AI 角色
 */
export async function deleteAIRole(id: string): Promise<void> {
  await api.db.from('ai_roles').delete().eq('id', id);
}

/**
 * 获取里程碑模板列表
 */
export async function getMilestoneTemplates(): Promise<MilestoneTemplate[]> {
  const { data } = await api.db.from('milestone_templates')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

/**
 * 获取里程碑模板详情（包含任务）
 */
export async function getMilestoneTemplateWithTasks(templateId: string): Promise<(MilestoneTemplate & { tasks: MilestoneTaskTemplate[] }) | null> {
  const { data: template } = await api.db.from('milestone_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (!template?.data) return null;

  const { data: tasks } = await api.db.from('milestone_task_templates')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order');

  return {
    ...template.data,
    tasks: tasks || [],
  };
}

/**
 * 创建里程碑模板
 */
export async function createMilestoneTemplate(data: { name: string; description?: string; tasks?: { name: string; description?: string }[] }): Promise<MilestoneTemplate> {
  // 1. 创建模板
  const template = await api.db.from('milestone_templates').insert({
    name: data.name,
    description: data.description,
    is_active: true,
  });

  const newTemplate = template?.[0];

  // 2. 创建任务
  if (data.tasks && data.tasks.length > 0 && newTemplate) {
    const tasksToInsert = data.tasks.map((task, index) => ({
      template_id: newTemplate.id,
      name: task.name,
      description: task.description,
      sort_order: index,
    }));
    await api.db.from('milestone_task_templates').insert(tasksToInsert);
  }

  return newTemplate;
}

/**
 * 更新里程碑模板
 */
export async function updateMilestoneTemplate(id: string, data: { name?: string; description?: string; is_active?: boolean }): Promise<MilestoneTemplate> {
  const result = await api.db.from('milestone_templates').update({
    name: data.name,
    description: data.description,
    is_active: data.is_active,
  }).eq('id', id);
  return result?.[0];
}

/**
 * 删除里程碑模板
 */
export async function deleteMilestoneTemplate(id: string): Promise<void> {
  await api.db.from('milestone_templates').delete().eq('id', id);
}

/**
 * 添加里程碑任务模板
 */
export async function addMilestoneTaskTemplate(templateId: string, data: { name: string; description?: string; sort_order?: number }): Promise<MilestoneTaskTemplate> {
  const result = await api.db.from('milestone_task_templates').insert({
    template_id: templateId,
    name: data.name,
    description: data.description,
    sort_order: data.sort_order || 0,
  });
  return result?.[0];
}

/**
 * 更新里程碑任务模板
 */
export async function updateMilestoneTaskTemplate(taskId: string, data: { name?: string; description?: string; sort_order?: number }): Promise<MilestoneTaskTemplate> {
  const result = await api.db.from('milestone_task_templates').update({
    name: data.name,
    description: data.description,
    sort_order: data.sort_order,
  }).eq('id', taskId);
  return result?.[0];
}

/**
 * 删除里程碑任务模板
 */
export async function deleteMilestoneTaskTemplate(taskId: string): Promise<void> {
  await api.db.from('milestone_task_templates').delete().eq('id', taskId);
}

// 导出服务对象
export const systemService = {
  // AI 提供商
  getAIProviders,
  getDefaultAIProvider,
  createAIProvider,
  updateAIProvider,
  deleteAIProvider,
  // AI 角色
  getAIRoles,
  createAIRole,
  updateAIRole,
  deleteAIRole,
  // 里程碑模板
  getMilestoneTemplates,
  getMilestoneTemplateWithTasks,
  createMilestoneTemplate,
  updateMilestoneTemplate,
  deleteMilestoneTemplate,
  addMilestoneTaskTemplate,
  updateMilestoneTaskTemplate,
  deleteMilestoneTaskTemplate,
};
