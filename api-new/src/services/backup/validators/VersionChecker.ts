/**
 * 版本检查器
 * 检查备份版本与当前系统版本的兼容性
 */

// 当前数据库版本
const CURRENT_DB_VERSION = '040';

// 当前应用版本
let CURRENT_APP_VERSION = '2.0.0';
try {
  const packageJson = require('../../../../package.json');
  CURRENT_APP_VERSION = packageJson.version || '2.0.0';
} catch {
  // 使用默认值
}

// 支持的备份版本
const SUPPORTED_BACKUP_VERSIONS = ['1.0.0'];

/**
 * 版本比较结果
 */
export enum VersionComparison {
  EQUAL = 'equal',
  NEWER = 'newer',
  OLDER = 'older',
  INCOMPATIBLE = 'incompatible',
}

/**
 * 解析版本号
 */
function parseVersion(version: string): number[] {
  return version.split('.').map(Number);
}

/**
 * 比较两个版本号
 */
export function compareVersions(version1: string, version2: string): VersionComparison {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;

    if (num1 > num2) return VersionComparison.NEWER;
    if (num1 < num2) return VersionComparison.OLDER;
  }

  return VersionComparison.EQUAL;
}

/**
 * 检查备份版本是否支持
 */
export function isBackupVersionSupported(backupVersion: string): boolean {
  return SUPPORTED_BACKUP_VERSIONS.includes(backupVersion);
}

/**
 * 检查数据库版本兼容性
 */
export function checkDbVersionCompatibility(backupDbVersion: string): {
  compatible: boolean;
  message: string;
  needsMigration: boolean;
} {
  const backupVersion = parseInt(backupDbVersion, 10);
  const currentVersion = parseInt(CURRENT_DB_VERSION, 10);

  if (isNaN(backupVersion) || isNaN(currentVersion)) {
    return {
      compatible: false,
      message: '版本号格式无效',
      needsMigration: false,
    };
  }

  if (backupVersion > currentVersion) {
    return {
      compatible: false,
      message: `备份的数据库版本(${backupDbVersion})高于当前系统版本(${CURRENT_DB_VERSION})，请升级系统后再恢复`,
      needsMigration: false,
    };
  }

  if (backupVersion < currentVersion) {
    return {
      compatible: true,
      message: `备份的数据库版本(${backupDbVersion})低于当前系统版本(${CURRENT_DB_VERSION})，将自动迁移数据`,
      needsMigration: true,
    };
  }

  return {
    compatible: true,
    message: '数据库版本匹配',
    needsMigration: false,
  };
}

/**
 * 检查应用版本兼容性
 */
export function checkAppVersionCompatibility(backupAppVersion: string): {
  compatible: boolean;
  message: string;
} {
  const comparison = compareVersions(backupAppVersion, CURRENT_APP_VERSION);

  switch (comparison) {
    case VersionComparison.EQUAL:
      return {
        compatible: true,
        message: '应用版本匹配',
      };
    case VersionComparison.NEWER:
      return {
        compatible: false,
        message: `备份的应用版本(${backupAppVersion})高于当前系统版本(${CURRENT_APP_VERSION})，请升级系统后再恢复`,
      };
    case VersionComparison.OLDER:
      return {
        compatible: true,
        message: `备份的应用版本(${backupAppVersion})低于当前系统版本(${CURRENT_APP_VERSION})，向前兼容`,
      };
    default:
      return {
        compatible: false,
        message: '版本不兼容',
      };
  }
}

/**
 * 完整的版本兼容性检查
 */
export function checkVersionCompatibility(
  backupVersion: string,
  backupAppVersion: string,
  backupDbVersion: string
): {
  compatible: boolean;
  errors: string[];
  warnings: string[];
  needsMigration: boolean;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let needsMigration = false;

  // 检查备份格式版本
  if (!isBackupVersionSupported(backupVersion)) {
    errors.push(`不支持的备份格式版本: ${backupVersion}。支持的版本: ${SUPPORTED_BACKUP_VERSIONS.join(', ')}`);
  }

  // 检查应用版本
  const appCompatibility = checkAppVersionCompatibility(backupAppVersion);
  if (!appCompatibility.compatible) {
    errors.push(appCompatibility.message);
  } else if (appCompatibility.message !== '应用版本匹配') {
    warnings.push(appCompatibility.message);
  }

  // 检查数据库版本
  const dbCompatibility = checkDbVersionCompatibility(backupDbVersion);
  if (!dbCompatibility.compatible) {
    errors.push(dbCompatibility.message);
  } else if (dbCompatibility.needsMigration) {
    warnings.push(dbCompatibility.message);
    needsMigration = true;
  }

  return {
    compatible: errors.length === 0,
    errors,
    warnings,
    needsMigration,
  };
}

/**
 * 获取当前系统版本信息
 */
export function getCurrentVersionInfo(): {
  appVersion: string;
  dbVersion: string;
  backupFormatVersion: string;
} {
  return {
    appVersion: CURRENT_APP_VERSION,
    dbVersion: CURRENT_DB_VERSION,
    backupFormatVersion: SUPPORTED_BACKUP_VERSIONS[SUPPORTED_BACKUP_VERSIONS.length - 1],
  };
}

/**
 * 获取支持的备份版本列表
 */
export function getSupportedBackupVersions(): string[] {
  return [...SUPPORTED_BACKUP_VERSIONS];
}

export default {
  compareVersions,
  isBackupVersionSupported,
  checkDbVersionCompatibility,
  checkAppVersionCompatibility,
  checkVersionCompatibility,
  getCurrentVersionInfo,
  getSupportedBackupVersions,
  VersionComparison,
};
