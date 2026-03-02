/**
 * Manifest 验证器
 * 验证备份包的清单文件格式和完整性
 */

import { BackupManifest, TableManifest, FileManifest } from '../../../types/backup.types';

// 支持的备份版本
const SUPPORTED_VERSIONS = ['1.0.0'];

// 必需的表（核心数据）
const REQUIRED_TABLES = [
  'profiles',
  'projects',
  'tasks',
];

/**
 * 验证 Manifest 结构
 */
export function validateManifestStructure(manifest: unknown): manifest is BackupManifest {
  if (typeof manifest !== 'object' || manifest === null) {
    throw new Error('Manifest 必须是对象');
  }

  const m = manifest as Record<string, unknown>;

  // 验证必需字段
  if (!m.version || typeof m.version !== 'string') {
    throw new Error('Manifest 缺少 version 字段');
  }

  if (!m.appVersion || typeof m.appVersion !== 'string') {
    throw new Error('Manifest 缺少 appVersion 字段');
  }

  if (!m.dbVersion || typeof m.dbVersion !== 'string') {
    throw new Error('Manifest 缺少 dbVersion 字段');
  }

  if (!m.backupAt || typeof m.backupAt !== 'string') {
    throw new Error('Manifest 缺少 backupAt 字段');
  }

  // 验证 tables 字段
  if (!Array.isArray(m.tables)) {
    throw new Error('Manifest 的 tables 字段必须是数组');
  }

  // 验证 files 字段
  if (!Array.isArray(m.files)) {
    throw new Error('Manifest 的 files 字段必须是数组');
  }

  // 验证 stats 字段
  if (typeof m.stats !== 'object' || m.stats === null) {
    throw new Error('Manifest 的 stats 字段必须是对象');
  }

  // 验证 options 字段
  if (typeof m.options !== 'object' || m.options === null) {
    throw new Error('Manifest 的 options 字段必须是对象');
  }

  return true;
}

/**
 * 验证版本兼容性
 */
export function validateVersion(version: string): boolean {
  return SUPPORTED_VERSIONS.includes(version);
}

/**
 * 获取支持的版本列表
 */
export function getSupportedVersions(): string[] {
  return [...SUPPORTED_VERSIONS];
}

/**
 * 验证表清单
 */
export function validateTableManifest(table: unknown): table is TableManifest {
  if (typeof table !== 'object' || table === null) {
    return false;
  }

  const t = table as Record<string, unknown>;

  return (
    typeof t.name === 'string' &&
    typeof t.recordCount === 'number' &&
    typeof t.fileName === 'string' &&
    typeof t.hash === 'string'
  );
}

/**
 * 验证文件清单
 */
export function validateFileManifest(file: unknown): file is FileManifest {
  if (typeof file !== 'object' || file === null) {
    return false;
  }

  const f = file as Record<string, unknown>;

  return (
    typeof f.path === 'string' &&
    typeof f.originalPath === 'string' &&
    typeof f.size === 'number' &&
    typeof f.hash === 'string'
  );
}

/**
 * 验证必需的表是否存在
 */
export function validateRequiredTables(tables: TableManifest[]): string[] {
  const missingTables: string[] = [];
  const tableNames = tables.map(t => t.name);

  for (const required of REQUIRED_TABLES) {
    if (!tableNames.includes(required)) {
      missingTables.push(required);
    }
  }

  return missingTables;
}

/**
 * 完整的 Manifest 验证
 */
export function validateManifest(manifest: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 验证结构
    validateManifestStructure(manifest);
    const m = manifest as BackupManifest;

    // 验证版本
    if (!validateVersion(m.version)) {
      errors.push(`不支持的备份版本: ${m.version}。支持的版本: ${SUPPORTED_VERSIONS.join(', ')}`);
    }

    // 验证备份时间
    const backupDate = new Date(m.backupAt);
    if (isNaN(backupDate.getTime())) {
      errors.push('无效的备份时间格式');
    }

    // 验证表清单
    for (const table of m.tables) {
      if (!validateTableManifest(table)) {
        errors.push(`无效的表清单: ${JSON.stringify(table)}`);
      }
    }

    // 验证文件清单
    for (const file of m.files) {
      if (!validateFileManifest(file)) {
        errors.push(`无效的文件清单: ${JSON.stringify(file)}`);
      }
    }

    // 验证必需的表
    const missingTables = validateRequiredTables(m.tables);
    if (missingTables.length > 0) {
      warnings.push(`备份中缺少核心表: ${missingTables.join(', ')}`);
    }

    // 验证统计信息
    if (m.stats.totalRecords < 0) {
      errors.push('totalRecords 不能为负数');
    }
    if (m.stats.totalFiles < 0) {
      errors.push('totalFiles 不能为负数');
    }
    if (m.stats.totalFileSize < 0) {
      errors.push('totalFileSize 不能为负数');
    }

    // 验证选项
    if (typeof m.options.includeLogs !== 'boolean') {
      errors.push('options.includeLogs 必须是布尔值');
    }
    if (typeof m.options.includeNotifications !== 'boolean') {
      errors.push('options.includeNotifications 必须是布尔值');
    }
    if (typeof m.options.includeForum !== 'boolean') {
      errors.push('options.includeForum 必须是布尔值');
    }
    if (typeof m.options.encrypt !== 'boolean') {
      errors.push('options.encrypt 必须是布尔值');
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : '验证失败');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export default {
  validateManifestStructure,
  validateVersion,
  getSupportedVersions,
  validateTableManifest,
  validateFileManifest,
  validateRequiredTables,
  validateManifest,
};
