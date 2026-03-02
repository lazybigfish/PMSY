/**
 * 数据备份与恢复相关类型定义
 */

// 备份记录
export interface BackupRecord {
  id: string;
  name: string;
  description?: string;
  filePath: string;
  fileSize: number;
  manifest: BackupManifest;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

// 备份清单
export interface BackupManifest {
  version: string;                    // 备份格式版本
  appVersion: string;                 // PMSY 应用版本
  dbVersion: string;                  // 数据库迁移版本
  backupAt: string;                   // 备份时间 ISO8601
  description?: string;               // 备份描述
  tables: TableManifest[];            // 表数据清单
  files: FileManifest[];              // 文件清单
  stats: BackupStats;                 // 统计信息
  options: BackupOptions;             // 备份选项
}

// 表数据清单
export interface TableManifest {
  name: string;                       // 表名
  recordCount: number;                // 记录数
  fileName: string;                   // 数据文件名称（如：profiles.json）
  hash: string;                       // 文件哈希（校验用）
}

// 文件清单
export interface FileManifest {
  path: string;                       // 文件在备份包中的路径
  originalPath: string;               // 原始存储路径
  size: number;                       // 文件大小
  hash: string;                       // 文件哈希
}

// 备份统计
export interface BackupStats {
  totalRecords: number;               // 总记录数
  totalFiles: number;                 // 总文件数
  totalFileSize: number;              // 文件总大小
  duration?: number;                  // 备份耗时（毫秒）
}

// 备份选项
export interface BackupOptions {
  includeLogs: boolean;               // 是否包含日志
  includeNotifications: boolean;      // 是否包含通知
  includeForum: boolean;              // 是否包含论坛数据
  encrypt: boolean;                   // 是否加密
}

// 定时备份配置
export interface BackupScheduleConfig {
  enabled: boolean;                   // 是否启用
  cron: string;                       // cron 表达式
  timeZone: string;                   // 时区
  options: BackupOptions;             // 备份选项
  keepCount: number;                  // 保留数量（默认10）
}

// 备份存储配置
export interface BackupStorageConfig {
  path: string;                       // 存储路径
  maxFileSize: number;                // 最大文件大小（字节）
  allowedExtensions: string[];        // 允许的文件扩展名
}

// 恢复预览
export interface RestorePreview {
  manifest: BackupManifest;
  conflicts: DataConflict[];          // 数据冲突列表
  warnings: string[];                 // 警告信息
}

// 数据冲突
export interface DataConflict {
  table: string;                      // 冲突表名
  recordId: string;                   // 冲突记录ID
  conflictType: 'duplicate' | 'missing_dependency';
  existingRecord?: unknown;           // 现有记录
  incomingRecord: unknown;            // 导入记录
}

// 恢复结果
export interface RestoreResult {
  success: boolean;
  importedTables: TableImportResult[];
  importedFiles: number;
  errors: string[];
  warnings: string[];
  duration: number;
}

// 表导入结果
export interface TableImportResult {
  table: string;
  total: number;
  imported: number;
  skipped: number;
  failed: number;
}

// 创建备份请求
export interface CreateBackupRequest {
  name?: string;
  description?: string;
  options?: Partial<BackupOptions>;
}

// 创建备份响应
export interface CreateBackupResponse {
  id: string;
  status: string;
  message: string;
}

// 恢复请求
export interface RestoreRequest {
  filePath: string;
  mode: 'full' | 'merge';
  conflictResolution?: 'skip' | 'overwrite' | 'rename';
  selectedTables?: string[];
}

// 备份错误码
export enum BackupErrorCode {
  LOCK_FAILED = 'LOCK_FAILED',
  INSUFFICIENT_SPACE = 'INSUFFICIENT_SPACE',
  DB_EXPORT_FAILED = 'DB_EXPORT_FAILED',
  FILE_COLLECT_FAILED = 'FILE_COLLECT_FAILED',
  PACK_FAILED = 'PACK_FAILED',
  UNKNOWN = 'UNKNOWN'
}

// 恢复错误码
export enum RestoreErrorCode {
  INVALID_MANIFEST = 'INVALID_MANIFEST',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  DEPENDENCY_MISSING = 'DEPENDENCY_MISSING',
  DB_IMPORT_FAILED = 'DB_IMPORT_FAILED',
  FILE_RESTORE_FAILED = 'FILE_RESTORE_FAILED',
  UNKNOWN = 'UNKNOWN'
}

// 数据库表定义（用于导出）
export interface TableDefinition {
  name: string;
  dependencies: string[];             // 依赖的表（外键关联）
  optional?: boolean;                 // 是否可选（日志类等）
}

// 数据导出上下文
export interface ExportContext {
  tables: Map<string, unknown[]>;     // 表数据
  files: FileManifest[];              // 文件清单
  startTime: number;                  // 开始时间
}

// 数据导入上下文
export interface ImportContext {
  manifest: BackupManifest;
  mode: 'full' | 'merge';
  conflictResolution: 'skip' | 'overwrite' | 'rename';
  conflicts: DataConflict[];
  importedTables: Map<string, number>;
  errors: string[];
  warnings: string[];
}
