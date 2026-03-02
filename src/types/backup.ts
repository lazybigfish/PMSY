/**
 * 数据备份与恢复相关类型定义（前端）
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
  version: string;
  appVersion: string;
  dbVersion: string;
  backupAt: string;
  description?: string;
  tables: TableManifest[];
  files: FileManifest[];
  stats: BackupStats;
  options: BackupOptions;
}

// 表数据清单
export interface TableManifest {
  name: string;
  recordCount: number;
  fileName: string;
  hash: string;
}

// 文件清单
export interface FileManifest {
  path: string;
  originalPath: string;
  size: number;
  hash: string;
}

// 备份统计
export interface BackupStats {
  totalRecords: number;
  totalFiles: number;
  totalFileSize: number;
  duration?: number;
}

// 备份选项
export interface BackupOptions {
  includeLogs: boolean;
  includeNotifications: boolean;
  includeForum: boolean;
  encrypt: boolean;
}

// 定时备份配置
export interface BackupScheduleConfig {
  enabled: boolean;
  cron: string;
  timeZone: string;
  options: BackupOptions;
  keepCount: number;
}

// 恢复预览
export interface RestorePreview {
  manifest: BackupManifest;
  conflicts: DataConflict[];
  warnings: string[];
}

// 数据冲突
export interface DataConflict {
  table: string;
  recordId: string;
  conflictType: 'duplicate' | 'missing_dependency';
  existingRecord?: unknown;
  incomingRecord: unknown;
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

// 创建备份表单数据
export interface CreateBackupFormData {
  name: string;
  description: string;
  includeLogs: boolean;
  includeNotifications: boolean;
  includeForum: boolean;
}

// 恢复表单数据
export interface RestoreFormData {
  file: File;
  mode: 'full' | 'merge';
  conflictResolution: 'skip' | 'overwrite' | 'rename';
}

// 备份列表组件 Props
export interface BackupListProps {
  backups: BackupRecord[];
  loading: boolean;
  onDownload: (backup: BackupRecord) => void;
  onDelete: (backup: BackupRecord) => void;
  onVerify: (backup: BackupRecord) => void;
}

// 创建备份弹窗组件 Props
export interface CreateBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: CreateBackupFormData) => Promise<void>;
  loading: boolean;
}

// 恢复面板组件 Props
export interface RestorePanelProps {
  onPreview: (file: File) => Promise<RestorePreview>;
  onRestore: (data: RestoreFormData) => Promise<RestoreResult>;
  loading: boolean;
}

// 定时备份设置组件 Props
export interface ScheduleSettingsProps {
  config: BackupScheduleConfig;
  onSave: (config: BackupScheduleConfig) => Promise<void>;
  loading: boolean;
}
