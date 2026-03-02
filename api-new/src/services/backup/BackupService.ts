/**
 * 备份服务
 * 负责系统数据的导出、打包和存储
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { db } from '../../config/database';
import {
  BackupRecord,
  BackupManifest,
  BackupOptions,
  BackupStats,
  TableManifest,
  FileManifest,
  TableDefinition,
  ExportContext,
  BackupErrorCode,
} from '../../types/backup.types';
import { query, insert, updateById } from '../dbService';

/**
 * 将数据库的下划线命名转换为驼峰命名
 */
function convertToCamelCase(record: any): BackupRecord {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    filePath: record.file_path,
    fileSize: parseInt(record.file_size) || 0,
    manifest: record.manifest,
    status: record.status,
    errorMessage: record.error_message,
    createdBy: record.created_by,
    createdAt: record.created_at,
    completedAt: record.completed_at,
  };
}

// 备份格式版本
const BACKUP_VERSION = '1.0.0';

// 应用版本（从 package.json 读取）
let appVersion = '2.0.0';
try {
  const packageJson = require('../../../package.json');
  appVersion = packageJson.version || '2.0.0';
} catch {
  // 使用默认值
}

// 数据库版本（从迁移文件确定）
const DB_VERSION = '040';

// 备份锁（防止并发备份）
const backupLocks = new Map<string, boolean>();

// 表定义（按依赖顺序排列）
const TABLE_DEFINITIONS: TableDefinition[] = [
  // 核心表（无依赖）
  { name: 'profiles', dependencies: [] },
  { name: 'app_roles', dependencies: [] },
  { name: 'app_permissions', dependencies: [] },
  { name: 'milestone_templates', dependencies: [] },
  { name: 'clients', dependencies: ['profiles'] },
  { name: 'system_settings', dependencies: [] },
  
  // 第二层（依赖核心表）
  { name: 'app_role_permissions', dependencies: ['app_roles', 'app_permissions'] },
  { name: 'projects', dependencies: ['profiles'] },
  { name: 'client_contacts', dependencies: ['clients'] },
  { name: 'folders', dependencies: ['projects', 'profiles'] },
  { name: 'report_templates', dependencies: ['profiles'] },
  { name: 'ai_config', dependencies: [] },
  { name: 'milestone_task_templates', dependencies: ['milestone_templates'] },
  
  // 第三层
  { name: 'project_members', dependencies: ['projects', 'profiles'] },
  { name: 'project_clients', dependencies: ['projects', 'clients', 'client_contacts', 'profiles'] },
  { name: 'project_modules', dependencies: ['projects'] },
  { name: 'project_milestones', dependencies: ['projects', 'milestone_templates', 'profiles'] },
  { name: 'suppliers', dependencies: ['projects'] },
  { name: 'risks', dependencies: ['projects', 'profiles'] },
  { name: 'files', dependencies: ['projects', 'folders', 'profiles'] },
  { name: 'storage_quotas', dependencies: ['projects'] },
  { name: 'hot_news', dependencies: ['profiles'] },
  
  // 第四层
  { name: 'tasks', dependencies: ['projects', 'project_modules', 'project_milestones', 'profiles'] },
  { name: 'supplier_contacts', dependencies: ['suppliers'] },
  { name: 'supplier_payment_plans', dependencies: ['suppliers', 'projects', 'profiles'] },
  { name: 'supplier_acceptance_records', dependencies: ['suppliers', 'projects'] },
  { name: 'project_suppliers', dependencies: ['projects', 'suppliers'] },
  { name: 'file_operation_logs', dependencies: ['files', 'profiles'], optional: true },
  
  // 第五层
  { name: 'task_assignees', dependencies: ['tasks', 'profiles'] },
  { name: 'task_progress_updates', dependencies: ['tasks', 'profiles'] },
  { name: 'task_comments', dependencies: ['tasks', 'profiles'] },
  { name: 'task_dependencies', dependencies: ['tasks', 'profiles'] },
  { name: 'task_history', dependencies: ['tasks', 'profiles'], optional: true },
  { name: 'milestone_tasks', dependencies: ['project_milestones', 'milestone_task_templates', 'profiles'] },
  
  // 可选表（日志、通知、论坛）
  { name: 'notifications', dependencies: ['profiles'], optional: true },
  { name: 'forum_posts', dependencies: ['profiles'], optional: true },
  { name: 'forum_comments', dependencies: ['forum_posts', 'profiles'], optional: true },
  { name: 'forum_likes', dependencies: ['profiles'], optional: true },
];

/**
 * 获取备份存储路径
 */
function getBackupStoragePath(): string {
  return process.env.BACKUP_STORAGE_PATH || path.join(process.cwd(), 'backups');
}

/**
 * 计算文件哈希
 */
async function calculateFileHash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * 计算字符串哈希
 */
function calculateStringHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * 检查磁盘空间
 */
async function checkDiskSpace(requiredBytes: number): Promise<boolean> {
  try {
    const stats = await fs.statfs(getBackupStoragePath());
    const availableBytes = stats.bavail * stats.bsize;
    return availableBytes >= requiredBytes;
  } catch {
    // 如果无法检查，假设空间足够
    return true;
  }
}

/**
 * 获取文件大小
 */
async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * 获取表数据
 */
async function exportTableData(tableName: string): Promise<unknown[]> {
  try {
    const data = await query(tableName, { limit: 100000 }); // 限制最大10万条
    return data;
  } catch (error) {
    console.error(`导出表 ${tableName} 失败:`, error);
    throw new Error(`导出表 ${tableName} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 收集文件资源
 */
async function collectFiles(context: ExportContext): Promise<void> {
  const uploadPath = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
  
  try {
    // 检查上传目录是否存在
    try {
      await fs.access(uploadPath);
    } catch {
      // 目录不存在，跳过文件收集
      return;
    }

    // 递归收集文件
    await collectFilesRecursive(uploadPath, uploadPath, context);
  } catch (error) {
    console.error('收集文件失败:', error);
    throw new Error(`收集文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 递归收集文件
 */
async function collectFilesRecursive(
  dirPath: string,
  basePath: string,
  context: ExportContext
): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      if (entry.isDirectory()) {
        await collectFilesRecursive(fullPath, basePath, context);
      } else {
        const size = await getFileSize(fullPath);
        const hash = await calculateFileHash(fullPath);

        context.files.push({
          path: `files/${relativePath}`,
          originalPath: relativePath,
          size,
          hash,
        });
      }
    }
  } catch (error) {
    console.error(`读取目录 ${dirPath} 失败:`, error);
  }
}

/**
 * 创建备份
 */
export async function createBackup(
  userId: string,
  name?: string,
  description?: string,
  options: Partial<BackupOptions> = {}
): Promise<BackupRecord> {
  const lockKey = 'backup';
  
  // 检查是否已有备份在进行中
  if (backupLocks.get(lockKey)) {
    throw new Error('已有备份任务在进行中，请等待完成');
  }

  // 设置备份锁
  backupLocks.set(lockKey, true);

  const startTime = Date.now();
  const backupId = crypto.randomUUID();
  const backupName = name || `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const backupFileName = `${backupName}.zip`;
  const backupFilePath = path.join(getBackupStoragePath(), backupFileName);

  try {
    // 确保备份目录存在
    await fs.mkdir(getBackupStoragePath(), { recursive: true });

    // 创建备份记录
    const record = await insert('backup_records', {
      id: backupId,
      name: backupName,
      description,
      file_path: backupFileName,
      file_size: 0,
      manifest: {},
      status: 'processing',
      created_by: userId,
    }) as BackupRecord[];

    // 合并默认选项
    const backupOptions: BackupOptions = {
      includeLogs: false,
      includeNotifications: false,
      includeForum: false,
      encrypt: false,
      ...options,
    };

    // 导出数据
    const context: ExportContext = {
      tables: new Map(),
      files: [],
      startTime,
    };

    const tableManifests: TableManifest[] = [];
    let totalRecords = 0;

    // 按依赖顺序导出表数据
    for (const tableDef of TABLE_DEFINITIONS) {
      // 跳过可选表（如果未启用）
      if (tableDef.optional) {
        if (tableDef.name === 'file_operation_logs' && !backupOptions.includeLogs) continue;
        if (tableDef.name === 'notifications' && !backupOptions.includeNotifications) continue;
        if (['forum_posts', 'forum_comments', 'forum_likes'].includes(tableDef.name) && !backupOptions.includeForum) continue;
      }

      try {
        const data = await exportTableData(tableDef.name);
        context.tables.set(tableDef.name, data);
        
        const jsonContent = JSON.stringify(data, null, 2);
        const hash = calculateStringHash(jsonContent);
        
        tableManifests.push({
          name: tableDef.name,
          recordCount: data.length,
          fileName: `${tableDef.name}.json`,
          hash,
        });
        
        totalRecords += data.length;
      } catch (error) {
        console.error(`导出表 ${tableDef.name} 失败:`, error);
        // 继续导出其他表
      }
    }

    // 收集文件
    await collectFiles(context);

    // 创建 ZIP 文件
    const zip = new JSZip();

    // 添加 manifest
    const manifest: BackupManifest = {
      version: BACKUP_VERSION,
      appVersion,
      dbVersion: DB_VERSION,
      backupAt: new Date().toISOString(),
      description,
      tables: tableManifests,
      files: context.files,
      stats: {
        totalRecords,
        totalFiles: context.files.length,
        totalFileSize: context.files.reduce((sum, f) => sum + f.size, 0),
        duration: Date.now() - startTime,
      },
      options: backupOptions,
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // 添加表数据
    for (const [tableName, data] of context.tables) {
      zip.file(`data/${tableName}.json`, JSON.stringify(data, null, 2));
    }

    // 添加文件
    for (const fileManifest of context.files) {
      const filePath = path.join(process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads'), fileManifest.originalPath);
      try {
        const content = await fs.readFile(filePath);
        zip.file(fileManifest.path, content);
      } catch (error) {
        console.error(`读取文件 ${filePath} 失败:`, error);
        // 继续处理其他文件
      }
    }

    // 生成 ZIP 文件
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
    
    // 检查磁盘空间
    if (!await checkDiskSpace(zipContent.length)) {
      throw new Error('磁盘空间不足，无法保存备份文件');
    }

    await fs.writeFile(backupFilePath, zipContent);

    // 获取文件大小
    const fileSize = await getFileSize(backupFilePath);

    // 更新备份记录
    const updatedRecord = await updateById('backup_records', backupId, {
      file_size: fileSize,
      manifest,
      status: 'completed',
      completed_at: new Date(),
    }) as BackupRecord;

    // 应用保留策略
    await applyRetentionPolicy();

    return updatedRecord;
  } catch (error) {
    // 更新备份记录为失败状态
    await updateById('backup_records', backupId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : '未知错误',
      completed_at: new Date(),
    });

    throw error;
  } finally {
    // 释放备份锁
    backupLocks.delete(lockKey);
  }
}

/**
 * 应用保留策略（保留最近10个备份）
 */
async function applyRetentionPolicy(): Promise<void> {
  const keepCount = 10;

  try {
    // 获取所有已完成的备份，按创建时间倒序
    const backups = await query('backup_records', {
      eq: { status: 'completed' },
      order: 'created_at.desc',
    }) as BackupRecord[];

    // 如果超过保留数量，删除最旧的
    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);
      
      for (const backup of toDelete) {
        try {
          // 删除文件
          const filePath = path.join(getBackupStoragePath(), backup.filePath);
          await fs.unlink(filePath);
        } catch {
          // 文件可能已不存在，忽略错误
        }

        // 删除记录
        await db('backup_records').where({ id: backup.id }).del();
      }
    }
  } catch (error) {
    console.error('应用保留策略失败:', error);
  }
}

/**
 * 获取备份列表
 */
export async function getBackupList(): Promise<BackupRecord[]> {
  const records = await query('backup_records', {
    order: 'created_at.desc',
  });
  return records.map(convertToCamelCase);
}

/**
 * 获取备份详情
 */
export async function getBackupById(id: string): Promise<BackupRecord | null> {
  const records = await query('backup_records', {
    eq: { id },
  });
  
  return records[0] ? convertToCamelCase(records[0]) : null;
}

/**
 * 删除备份
 */
export async function deleteBackup(id: string): Promise<boolean> {
  const backup = await getBackupById(id);
  if (!backup) {
    return false;
  }

  try {
    // 删除文件
    const filePath = path.join(getBackupStoragePath(), backup.filePath);
    await fs.unlink(filePath);
  } catch {
    // 文件可能已不存在，继续删除记录
  }

  // 删除记录
  const count = await db('backup_records').where({ id }).del();
  return count > 0;
}

/**
 * 获取备份文件路径
 */
export function getBackupFilePath(fileName: string): string {
  return path.join(getBackupStoragePath(), fileName);
}

/**
 * 验证备份文件是否存在
 */
export async function backupFileExists(fileName: string): Promise<boolean> {
  try {
    const filePath = path.join(getBackupStoragePath(), fileName);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export default {
  createBackup,
  getBackupList,
  getBackupById,
  deleteBackup,
  getBackupFilePath,
  backupFileExists,
};
