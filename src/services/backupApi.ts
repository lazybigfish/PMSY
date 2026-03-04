/**
 * 备份 API 服务
 * 封装所有备份相关 API 调用
 */

import { apiClient } from '../lib/api';
import {
  BackupRecord,
  BackupScheduleConfig,
  RestorePreview,
  RestoreResult,
  CreateBackupFormData,
} from '../types/backup';

/**
 * 创建备份
 */
export async function createBackup(data: CreateBackupFormData): Promise<{ id: string; status: string; message: string }> {
  return apiClient.post('/api/system/backup', {
    name: data.name,
    description: data.description,
    options: {
      includeLogs: data.includeLogs,
      includeNotifications: data.includeNotifications,
      includeForum: data.includeForum,
      encrypt: false,
    },
  });
}

/**
 * 获取备份列表
 */
export async function getBackupList(): Promise<BackupRecord[]> {
  const data = await apiClient.get<{ backups: BackupRecord[] }>('/api/system/backup');
  return data.backups;
}

/**
 * 获取备份详情
 */
export async function getBackupById(id: string): Promise<BackupRecord> {
  const data = await apiClient.get<{ backup: BackupRecord }>(`/api/system/backup/${id}`);
  return data.backup;
}

/**
 * 下载备份
 */
export async function downloadBackup(id: string): Promise<Blob> {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${API_BASE_URL}/api/system/backup/${id}/download`, {
    headers: {
      'Authorization': `Bearer ${token || ''}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '下载备份失败' }));
    throw new Error(error.error || '下载备份失败');
  }

  return response.blob();
}

/**
 * 删除备份
 */
export async function deleteBackup(id: string): Promise<void> {
  await apiClient.post('/rest/v1/delete', {
    table: 'backups',
    conditions: { id: id }
  });
}

/**
 * 验证备份
 */
export async function verifyBackup(id: string): Promise<{ valid: boolean; errors?: string[] }> {
  return apiClient.post(`/api/system/backup/${id}/verify`);
}

/**
 * 预览恢复
 */
export async function previewRestore(file: File): Promise<RestorePreview> {
  const formData = new FormData();
  formData.append('file', file);

  const data = await apiClient.post<{ preview: RestorePreview }>('/api/system/restore/preview', formData);
  return data.preview;
}

/**
 * 执行恢复
 */
export async function restoreBackup(
  file: File,
  mode: 'full' | 'merge',
  conflictResolution: 'skip' | 'overwrite' | 'rename'
): Promise<RestoreResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  formData.append('conflictResolution', conflictResolution);

  const data = await apiClient.post<{ result: RestoreResult }>('/api/system/restore', formData);
  return data.result;
}

/**
 * 获取定时备份配置
 */
export async function getBackupSchedule(): Promise<BackupScheduleConfig> {
  const data = await apiClient.get<{ config: BackupScheduleConfig }>('/api/system/backup/schedule');
  return data.config;
}

/**
 * 更新定时备份配置
 */
export async function updateBackupSchedule(config: BackupScheduleConfig): Promise<void> {
  await apiClient.put('/api/system/backup/schedule', config);
}

// 导出备份 API 服务对象
export const backupApi = {
  createBackup,
  getBackupList,
  getBackupById,
  downloadBackup,
  deleteBackup,
  verifyBackup,
  previewRestore,
  restoreBackup,
  getBackupSchedule,
  updateBackupSchedule,
};

export default backupApi;
