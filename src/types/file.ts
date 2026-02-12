// 文件系统类型定义

/* eslint-disable @typescript-eslint/no-explicit-any */

export type StorageType = 'local' | 'aliyun_oss' | 'tencent_cos' | 'aws_s3' | 'minio';
export type FileCategory = 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';
export type FileStatus = 'active' | 'deleted' | 'archived';
export type OperationType = 'upload' | 'download' | 'view' | 'rename' | 'move' | 'copy' | 'delete' | 'restore' | 'share';
export type ShareType = 'link' | 'password' | 'email';

export interface StorageConfig {
  id: string;
  name: string;
  type: StorageType;
  is_default: boolean;
  config: Record<string, any>;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface FileRecord {
  id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  extension: string;
  storage_type: StorageType;
  storage_path: string;
  storage_config_id: string | null;
  url: string | null;
  thumbnail_url: string | null;
  category: FileCategory;
  tags: string[];
  uploader_id: string | null;
  uploader_name: string | null;
  version: number;
  parent_id: string | null;
  is_latest: boolean;
  download_count: number;
  view_count: number;
  last_accessed_at: string | null;
  checksum: string | null;
  is_scanned: boolean;
  scan_result: string | null;
  status: FileStatus;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  path: string;
  owner_id: string | null;
  is_shared: boolean;
  share_config: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface FileOperationLog {
  id: string;
  operation_type: OperationType;
  file_id: string | null;
  file_name: string | null;
  operator_id: string | null;
  operator_name: string | null;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface FileShare {
  id: string;
  file_id: string;
  share_token: string;
  share_type: ShareType;
  password: string | null;
  expire_at: string | null;
  max_downloads: number | null;
  download_count: number;
  created_by: string | null;
  created_at: string;
}

export interface StorageQuota {
  id: string;
  user_id: string;
  total_quota: number;
  used_quota: number;
  file_count: number;
  created_at: string;
  updated_at: string;
}

export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  result?: FileRecord;
}

export interface ChunkUploadState {
  uploadId: string;
  key: string;
  uploadedParts: number[];
  totalParts: number;
}

// 允许的文件类型映射
export const ALLOWED_MIME_TYPES: Record<string, FileCategory> = {
  // 图片
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'image/bmp': 'image',
  
  // 文档
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'text/plain': 'document',
  'text/markdown': 'document',
  'text/csv': 'document',
  
  // 视频
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  'video/mpeg': 'video',
  
  // 音频
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/mp3': 'audio',
  'audio/x-m4a': 'audio',
  
  // 压缩包
  'application/zip': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/x-7z-compressed': 'archive',
  'application/gzip': 'archive',
};

// 默认文件大小限制 (10MB)
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

// 分片大小 (5MB)
export const CHUNK_SIZE = 5 * 1024 * 1024;

// 允许的扩展名
export const ALLOWED_EXTENSIONS = [
  // 图片
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp',
  // 文档
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv',
  // 视频
  'mp4', 'webm', 'mov', 'avi', 'mpg', 'mpeg',
  // 音频
  'mp3', 'wav', 'ogg', 'm4a',
  // 压缩包
  'zip', 'rar', '7z', 'gz',
];

// 根据扩展名获取 MIME 类型
export function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'zip': 'application/zip',
  };
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 获取文件扩展名
export function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

// 根据文件名获取分类
export function getCategoryFromFile(file: File): FileCategory {
  // 先根据 MIME 类型判断
  if (ALLOWED_MIME_TYPES[file.type]) {
    return ALLOWED_MIME_TYPES[file.type];
  }
  // 再根据扩展名判断
  const ext = getExtension(file.name);
  const mimeType = getMimeType(ext);
  if (ALLOWED_MIME_TYPES[mimeType]) {
    return ALLOWED_MIME_TYPES[mimeType];
  }
  return 'other';
}
