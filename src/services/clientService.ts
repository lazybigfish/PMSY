/**
 * 客户服务
 * 替代原有的 Supabase 客户相关调用
 */

import { api } from '../lib/api';

// 客户联系人
export interface ClientContact {
  id: string;
  name: string;
  company: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 获取客户列表
 */
export async function getClients(options: {
  search?: string;
  company?: string;
} = {}): Promise<ClientContact[]> {
  const { search, company } = options;

  let query = api.db.from('client_contacts').select('*').order('name');

  if (company) {
    query = query.eq('company', company);
  }

  const { data } = await query;
  
  // 搜索过滤 - 在内存中进行
  let filteredData = data || [];
  if (search) {
    const searchLower = search.toLowerCase();
    filteredData = filteredData.filter(
      (client: ClientContact) =>
        client.name?.toLowerCase().includes(searchLower) ||
        client.company?.toLowerCase().includes(searchLower)
    );
  }
  
  return filteredData;
}

/**
 * 获取客户详情
 */
export async function getClientById(clientId: string): Promise<ClientContact | null> {
  const { data } = await api.db.from('client_contacts')
    .select('*')
    .eq('id', clientId)
    .single();
  return data?.data || null;
}

/**
 * 创建客户
 */
export async function createClient(data: Partial<ClientContact>): Promise<ClientContact> {
  const result = await api.db.from('client_contacts').insert({
    name: data.name,
    company: data.company,
    position: data.position,
    phone: data.phone,
    email: data.email,
    address: data.address,
    notes: data.notes,
  });
  return result?.[0];
}

/**
 * 更新客户
 */
export async function updateClient(id: string, data: Partial<ClientContact>): Promise<ClientContact> {
  const result = await api.db.from('client_contacts').update({
    name: data.name,
    company: data.company,
    position: data.position,
    phone: data.phone,
    email: data.email,
    address: data.address,
    notes: data.notes,
  }).eq('id', id);
  return result?.[0];
}

/**
 * 删除客户
 */
export async function deleteClient(id: string): Promise<void> {
  await api.db.from('client_contacts').delete().eq('id', id);
}

// 导出服务对象
export const clientService = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
