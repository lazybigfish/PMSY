/**
 * 供应商服务
 * 替代原有的 Supabase 供应商相关调用
 */

import { api } from '../lib/api';

// 供应商
export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// 项目供应商关联
export interface ProjectSupplier {
  id: string;
  project_id: string;
  supplier_id: string;
  role: string | null;
  contract_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  supplier?: Supplier;
}

/**
 * 获取供应商列表
 */
export async function getSuppliers(options: {
  category?: string;
  status?: string;
  search?: string;
} = {}): Promise<Supplier[]> {
  const { category, status, search } = options;

  let query = api.db.from('suppliers').select('*').order('name');

  if (category) {
    query = query.eq('category', category);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data } = await query;
  return data || [];
}

/**
 * 获取供应商详情
 */
export async function getSupplierById(supplierId: string): Promise<Supplier | null> {
  const { data } = await api.db.from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .single();
  return data?.data || null;
}

/**
 * 创建供应商
 */
export async function createSupplier(data: Partial<Supplier>): Promise<Supplier> {
  const result = await api.db.from('suppliers').insert({
    name: data.name,
    contact_person: data.contact_person,
    phone: data.phone,
    email: data.email,
    address: data.address,
    category: data.category,
    status: data.status || 'active',
  });
  return result?.[0];
}

/**
 * 更新供应商
 */
export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
  const result = await api.db.from('suppliers').update({
    name: data.name,
    contact_person: data.contact_person,
    phone: data.phone,
    email: data.email,
    address: data.address,
    category: data.category,
    status: data.status,
  }).eq('id', id);
  return result?.[0];
}

/**
 * 删除供应商
 */
export async function deleteSupplier(id: string): Promise<void> {
  await api.db.from('suppliers').delete().eq('id', id);
}

/**
 * 获取项目供应商
 */
export async function getProjectSuppliers(projectId: string): Promise<ProjectSupplier[]> {
  const { data } = await api.db.from('project_suppliers')
    .select('*')
    .eq('project_id', projectId);
  return data || [];
}

/**
 * 添加供应商到项目
 */
export async function addSupplierToProject(data: {
  project_id: string;
  supplier_id: string;
  role?: string;
  contract_amount?: number;
  start_date?: string;
  end_date?: string;
}): Promise<ProjectSupplier> {
  const result = await api.db.from('project_suppliers').insert({
    project_id: data.project_id,
    supplier_id: data.supplier_id,
    role: data.role,
    contract_amount: data.contract_amount,
    start_date: data.start_date,
    end_date: data.end_date,
  });
  return result?.[0];
}

/**
 * 从项目移除供应商
 */
export async function removeSupplierFromProject(projectSupplierId: string): Promise<void> {
  await api.db.from('project_suppliers').delete().eq('id', projectSupplierId);
}

// 导出服务对象
export const supplierService = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getProjectSuppliers,
  addSupplierToProject,
  removeSupplierFromProject,
};
