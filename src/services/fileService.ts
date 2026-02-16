/**
 * 文件服务
 * 替代原有的 Supabase 文件相关调用
 */

import { api } from '../lib/api';
import type { FileRecord, Folder } from '../types/file';
export type { FileRecord, Folder } from '../types/file';

// 上传进度回调
export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  progress: number; // 兼容旧代码
}

/**
 * 获取文件列表
 */
export async function getFiles(options: {
  folderId?: string | null;
  category?: string | null;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ files: FileRecord[]; total: number }> {
  const { folderId = null, category = null, search = '', page = 0, pageSize = 20 } = options;
  
  let query = api.db.from('files')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (folderId) {
    query = query.eq('folder_id', folderId);
  }
  
  if (category) {
    query = query.eq('category', category);
  }
  
  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data } = await query.range(page * pageSize, (page + 1) * pageSize - 1);

  // 获取总数
  const { data: countData } = await api.db.from('files').select('id');

  return {
    files: data || [],
    total: countData?.length || 0,
  };
}

/**
 * 获取文件夹列表
 */
export async function getFolders(parentId: string | null = null): Promise<Folder[]> {
  let query = api.db.from('folders').select('*').order('name');

  if (parentId) {
    query = query.eq('parent_id', parentId);
  } else {
    query = query.is('parent_id', null);
  }

  const { data } = await query;
  return data || [];
}

/**
 * 创建文件夹
 */
export async function createFolder(name: string, parentId: string | null = null): Promise<Folder> {
  // 构建路径
  let path = name;
  if (parentId) {
    const { data: parentData } = await api.db.from('folders')
      .select('path')
      .eq('id', parentId)
      .single();
    if (parentData?.data) {
      path = `${parentData.data.path}/${name}`;
    }
  }

  const { data } = await api.db.from('folders').insert({
    name,
    parent_id: parentId,
    path,
  });

  return data?.[0];
}

/**
 * 上传文件
 */
export async function uploadFile(
  file: File,
  folderId?: string | null,
  onProgress?: (progress: FileUploadProgress) => void
): Promise<FileRecord> {
  const formData = new FormData();
  formData.append('file', file);
  
  if (folderId) {
    formData.append('folder_id', folderId);
  }
  
  // 使用原生 fetch 以便支持进度回调
  const token = localStorage.getItem('access_token');
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage,
          progress: percentage, // 兼容旧代码
        });
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`上传失败: ${xhr.statusText}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('上传失败'));
    });
    
    xhr.open('POST', `${API_BASE_URL}/storage/v1/upload`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
}

/**
 * 下载文件
 */
export async function downloadFile(fileId: string): Promise<Blob> {
  return api.storage.from('files').download(fileId);
}

/**
 * 获取文件下载链接
 */
export function getFileUrl(filePath: string): string {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return `${API_BASE_URL}/storage/v1/object/public/files/${filePath}`;
}

/**
 * 删除文件
 */
export async function deleteFile(fileId: string): Promise<void> {
  await api.db.from('files').delete().eq('id', fileId);
}

/**
 * 删除文件夹
 */
export async function deleteFolder(folderId: string): Promise<void> {
  await api.db.from('folders').delete().eq('id', folderId);
}

/**
 * 获取存储配额
 */
export async function getStorageQuota(): Promise<{ used: number; total: number }> {
  // 模拟返回存储配额
  return { used: 0, total: 1073741824 }; // 1GB
}

/**
 * 批量上传文件
 */
export async function uploadMultipleFiles(
  files: File[],
  folderId?: string | null,
  onProgress?: (progress: FileUploadProgress) => void
): Promise<FileRecord[]> {
  const results: FileRecord[] = [];
  for (const file of files) {
    const result = await uploadFile(file, folderId, onProgress);
    results.push(result);
  }
  return results;
}

/**
 * 移动文件
 */
export async function moveFile(fileId: string, targetFolderId: string): Promise<void> {
  await api.db.from('files').update({ folder_id: targetFolderId }).eq('id', fileId);
}

/**
 * 复制文件
 */
export async function copyFile(fileId: string, targetFolderId: string): Promise<FileRecord> {
  // 1. 获取原文件信息
  const { data: file } = await api.db.from('files').select('*').eq('id', fileId).single();
  if (!file?.data) throw new Error('文件不存在');

  // 2. 创建新文件记录
  const { data: result } = await api.db.from('files').insert({
    name: `${file.data.name} (复制)`,
    file_path: file.data.file_path,
    file_type: file.data.file_type,
    file_size: file.data.file_size,
    folder_id: targetFolderId,
    uploaded_by: file.data.uploaded_by,
  });

  return result?.[0];
}

/**
 * 更新文件上下文关联
 */
export async function updateFileContext(fileId: string, context: {
  projectId?: string;
  taskId?: string;
  moduleType?: string;
}): Promise<void> {
  const updates: Record<string, string | undefined> = {};
  if (context.projectId) updates.project_id = context.projectId;
  if (context.taskId) updates.task_id = context.taskId;
  if (context.moduleType) updates.module_type = context.moduleType;

  if (Object.keys(updates).length > 0) {
    await api.db.from('files').update(updates).eq('id', fileId);
  }
}

// 导出服务对象
export const fileService = {
  getFiles,
  getFolders,
  createFolder,
  uploadFile,
  downloadFile,
  getFileUrl,
  deleteFile,
  deleteFolder,
  getStorageQuota,
  uploadMultipleFiles,
  moveFile,
  copyFile,
  updateFileContext,
};

// 为了保持向后兼容，导出默认实例
export default fileService;
