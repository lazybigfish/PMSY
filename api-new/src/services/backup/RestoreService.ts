/**
 * 恢复服务
 * 负责系统数据的恢复、预览和冲突处理
 */

import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { db } from '../../config/database';
import {
  BackupManifest,
  RestorePreview,
  RestoreResult,
  DataConflict,
  TableImportResult,
  ImportContext,
  RestoreErrorCode,
} from '../../types/backup.types';
import { insertMany, query, transaction, remove } from '../dbService';

// 支持的备份版本
const SUPPORTED_VERSIONS = ['1.0.0'];

// 表导入顺序（按依赖关系）
const TABLE_IMPORT_ORDER = [
  'profiles',
  'app_roles',
  'app_permissions',
  'milestone_templates',
  'clients',
  'system_settings',
  'app_role_permissions',
  'projects',
  'client_contacts',
  'folders',
  'report_templates',
  'ai_config',
  'milestone_task_templates',
  'project_members',
  'project_clients',
  'project_modules',
  'project_milestones',
  'suppliers',
  'risks',
  'files',
  'storage_quotas',
  'hot_news',
  'tasks',
  'supplier_contacts',
  'supplier_payment_plans',
  'supplier_acceptance_records',
  'project_suppliers',
  'file_operation_logs',
  'task_assignees',
  'task_progress_updates',
  'task_comments',
  'task_dependencies',
  'task_history',
  'milestone_tasks',
  'notifications',
  'forum_posts',
  'forum_comments',
  'forum_likes',
];

/**
 * 获取上传目录路径
 */
function getUploadPath(): string {
  return process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
}

/**
 * 解压备份包
 */
async function extractBackup(zipPath: string): Promise<{ manifest: BackupManifest; zip: JSZip }> {
  try {
    const content = await fs.readFile(zipPath);
    const zip = await JSZip.loadAsync(content);

    // 读取 manifest
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('备份包中缺少 manifest.json 文件');
    }

    const manifestContent = await manifestFile.async('string');
    const manifest: BackupManifest = JSON.parse(manifestContent);

    return { manifest, zip };
  } catch (error) {
    if (error instanceof Error && error.message.includes('manifest.json')) {
      throw error;
    }
    throw new Error(`解压备份包失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 验证备份版本
 */
function validateVersion(manifest: BackupManifest): void {
  if (!SUPPORTED_VERSIONS.includes(manifest.version)) {
    throw new Error(
      `不支持的备份版本: ${manifest.version}。支持的版本: ${SUPPORTED_VERSIONS.join(', ')}`
    );
  }
}

/**
 * 检测数据冲突
 */
async function detectConflicts(
  manifest: BackupManifest,
  zip: JSZip
): Promise<DataConflict[]> {
  const conflicts: DataConflict[] = [];

  for (const tableManifest of manifest.tables) {
    try {
      // 读取表数据
      const dataFile = zip.file(`data/${tableManifest.fileName}`);
      if (!dataFile) continue;

      const content = await dataFile.async('string');
      const records = JSON.parse(content);

      // 检查冲突
      for (const record of records) {
        // 检查主键冲突
        if (record.id) {
          const existing = await query(tableManifest.name, {
            eq: { id: record.id },
            limit: 1,
          });

          if (existing.length > 0) {
            conflicts.push({
              table: tableManifest.name,
              recordId: record.id,
              conflictType: 'duplicate',
              existingRecord: existing[0],
              incomingRecord: record,
            });
          }
        }
      }
    } catch (error) {
      console.error(`检测表 ${tableManifest.name} 冲突失败:`, error);
    }
  }

  return conflicts;
}

/**
 * 预览备份包
 */
export async function previewRestore(zipPath: string): Promise<RestorePreview> {
  try {
    const { manifest, zip } = await extractBackup(zipPath);

    // 验证版本
    validateVersion(manifest);

    // 检测冲突
    const conflicts = await detectConflicts(manifest, zip);

    // 生成警告
    const warnings: string[] = [];

    // 检查文件完整性
    for (const fileManifest of manifest.files) {
      const file = zip.file(fileManifest.path);
      if (!file) {
        warnings.push(`备份包中缺少文件: ${fileManifest.path}`);
      }
    }

    // 检查表数据完整性
    for (const tableManifest of manifest.tables) {
      const dataFile = zip.file(`data/${tableManifest.fileName}`);
      if (!dataFile) {
        warnings.push(`备份包中缺少表数据: ${tableManifest.name}`);
      }
    }

    return {
      manifest,
      conflicts,
      warnings,
    };
  } catch (error) {
    throw new Error(`预览备份失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 清空表数据
 */
async function clearTableData(tableName: string): Promise<void> {
  try {
    await db(tableName).del();
  } catch (error) {
    console.error(`清空表 ${tableName} 失败:`, error);
    throw new Error(`清空表 ${tableName} 失败`);
  }
}

/**
 * 导入表数据
 */
async function importTableData(
  tableName: string,
  records: unknown[],
  context: ImportContext
): Promise<TableImportResult> {
  const result: TableImportResult = {
    table: tableName,
    total: records.length,
    imported: 0,
    skipped: 0,
    failed: 0,
  };

  if (records.length === 0) {
    return result;
  }

  try {
    // 根据冲突处理策略处理数据
    const recordsToImport: unknown[] = [];

    for (const record of records) {
      const recordWithId = record as { id?: string };

      if (context.mode === 'merge' && recordWithId.id) {
        // 检查是否冲突
        const conflict = context.conflicts.find(
          (c: DataConflict) => c.table === tableName && c.recordId === recordWithId.id
        );

        if (conflict) {
          switch (context.conflictResolution) {
            case 'skip':
              result.skipped++;
              continue;
            case 'overwrite':
              // 先删除现有记录
              await remove(tableName, { id: recordWithId.id });
              recordsToImport.push(record);
              break;
            case 'rename':
              // 生成新 ID
              recordsToImport.push({
                ...(record as Record<string, unknown>),
                id: crypto.randomUUID(),
              });
              break;
          }
        } else {
          recordsToImport.push(record);
        }
      } else {
        recordsToImport.push(record);
      }
    }

    // 批量插入数据
    if (recordsToImport.length > 0) {
      // 分批插入，每批 1000 条
      const batchSize = 1000;
      for (let i = 0; i < recordsToImport.length; i += batchSize) {
        const batch = recordsToImport.slice(i, i + batchSize);
        try {
          await insertMany(tableName, batch as Record<string, any>[]);
          result.imported += batch.length;
        } catch (error) {
          console.error(`批量插入 ${tableName} 失败:`, error);
          result.failed += batch.length;
          context.errors.push(`导入表 ${tableName} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    }
  } catch (error) {
    console.error(`导入表 ${tableName} 失败:`, error);
    result.failed = records.length;
    context.errors.push(`导入表 ${tableName} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  return result;
}

/**
 * 恢复文件
 */
async function restoreFiles(
  manifest: BackupManifest,
  zip: JSZip,
  context: ImportContext
): Promise<number> {
  let restoredCount = 0;
  const uploadPath = getUploadPath();

  // 确保上传目录存在
  await fs.mkdir(uploadPath, { recursive: true });

  for (const fileManifest of manifest.files) {
    try {
      const file = zip.file(fileManifest.path);
      if (!file) {
        context.warnings.push(`备份包中缺少文件: ${fileManifest.path}`);
        continue;
      }

      const content = await file.async('nodebuffer');
      const targetPath = path.join(uploadPath, fileManifest.originalPath);

      // 确保目标目录存在
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      await fs.writeFile(targetPath, content);
      restoredCount++;
    } catch (error) {
      console.error(`恢复文件 ${fileManifest.path} 失败:`, error);
      context.warnings.push(`恢复文件 ${fileManifest.path} 失败`);
    }
  }

  return restoredCount;
}

/**
 * 执行恢复
 */
export async function restoreBackup(
  zipPath: string,
  mode: 'full' | 'merge',
  conflictResolution: 'skip' | 'overwrite' | 'rename' = 'skip'
): Promise<RestoreResult> {
  const startTime = Date.now();

  try {
    // 解压备份包
    const { manifest, zip } = await extractBackup(zipPath);

    // 验证版本
    validateVersion(manifest);

    // 在全量覆盖模式下，先检测冲突
    let conflicts: DataConflict[] = [];
    if (mode === 'merge') {
      conflicts = await detectConflicts(manifest, zip);
    }

    // 创建导入上下文
    const context: ImportContext = {
      manifest,
      mode,
      conflictResolution,
      conflicts,
      importedTables: new Map(),
      errors: [],
      warnings: [],
    };

    const results: RestoreResult = {
      success: true,
      importedTables: [],
      importedFiles: 0,
      errors: [],
      warnings: [],
      duration: 0,
    };

    // 使用事务执行恢复
    await transaction(async (trx) => {
      // 全量覆盖模式下，先清空所有表
      if (mode === 'full') {
        // 按相反顺序清空表（先清空依赖表）
        for (let i = TABLE_IMPORT_ORDER.length - 1; i >= 0; i--) {
          const tableName = TABLE_IMPORT_ORDER[i];
          // 检查备份中是否包含该表
          if (manifest.tables.find(t => t.name === tableName)) {
            await trx(tableName).del();
          }
        }
      }

      // 按依赖顺序导入表数据
      for (const tableName of TABLE_IMPORT_ORDER) {
        const tableManifest = manifest.tables.find(t => t.name === tableName);
        if (!tableManifest) continue;

        try {
          // 读取表数据
          const dataFile = zip.file(`data/${tableManifest.fileName}`);
          if (!dataFile) {
            results.warnings.push(`备份包中缺少表数据: ${tableName}`);
            continue;
          }

          const content = await dataFile.async('string');
          const records = JSON.parse(content);

          // 导入数据
          const importResult = await importTableData(tableName, records, context);
          results.importedTables.push(importResult);
        } catch (error) {
          console.error(`导入表 ${tableName} 失败:`, error);
          results.errors.push(`导入表 ${tableName} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    });

    // 恢复文件（在事务外执行，因为文件系统不支持事务回滚）
    results.importedFiles = await restoreFiles(manifest, zip, context);

    // 合并错误和警告
    results.errors.push(...context.errors);
    results.warnings.push(...context.warnings);

    // 检查是否有错误
    if (results.errors.length > 0 && results.importedTables.every(t => t.imported === 0)) {
      results.success = false;
    }

    results.duration = Date.now() - startTime;

    return results;
  } catch (error) {
    throw new Error(`恢复备份失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 验证备份包完整性
 */
export async function verifyBackup(zipPath: string): Promise<{ valid: boolean; errors?: string[] }> {
  const errors: string[] = [];

  try {
    const { manifest, zip } = await extractBackup(zipPath);

    // 验证版本
    if (!SUPPORTED_VERSIONS.includes(manifest.version)) {
      errors.push(`不支持的备份版本: ${manifest.version}`);
    }

    // 验证表数据完整性
    for (const tableManifest of manifest.tables) {
      const dataFile = zip.file(`data/${tableManifest.fileName}`);
      if (!dataFile) {
        errors.push(`缺少表数据文件: ${tableManifest.fileName}`);
      } else {
        try {
          const content = await dataFile.async('string');
          const records = JSON.parse(content);
          if (records.length !== tableManifest.recordCount) {
            errors.push(
              `表 ${tableManifest.name} 记录数不匹配: 期望 ${tableManifest.recordCount}, 实际 ${records.length}`
            );
          }
        } catch {
          errors.push(`表数据文件损坏: ${tableManifest.fileName}`);
        }
      }
    }

    // 验证文件完整性
    for (const fileManifest of manifest.files) {
      const file = zip.file(fileManifest.path);
      if (!file) {
        errors.push(`缺少文件: ${fileManifest.path}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`验证失败: ${error instanceof Error ? error.message : '未知错误'}`],
    };
  }
}

export default {
  previewRestore,
  restoreBackup,
  verifyBackup,
};
