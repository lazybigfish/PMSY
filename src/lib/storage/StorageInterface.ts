// 文件存储抽象接口
export interface StorageConfig {
  id: string;
  name: string;
  type: 'local' | 'aliyun_oss' | 'tencent_cos' | 'aws_s3' | 'minio';
  isDefault: boolean;
  config: Record<string, unknown>;
  status: 'active' | 'inactive';
}

export interface UploadOptions {
  fileName: string;
  mimeType: string;
  size: number;
  folder?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadResult {
  success: boolean;
  path: string;
  url: string;
  size: number;
  checksum?: string;
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  stream?: ReadableStream;
  buffer?: Buffer;
  url?: string;
  error?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  mimeType: string;
  lastModified: Date;
  checksum?: string;
}

export interface StorageQuota {
  total: number;
  used: number;
  available: number;
}

export interface IStorageProvider {
  // 初始化
  initialize(config: Record<string, unknown>): Promise<boolean>;
  
  // 上传文件
  upload(file: File | Buffer | ReadableStream, options: UploadOptions): Promise<UploadResult>;
  
  // 分片上传 - 初始化
  initiateMultipartUpload(fileName: string, mimeType: string): Promise<{ uploadId: string; key: string }>;
  
  // 分片上传 - 上传分片
  uploadPart(uploadId: string, key: string, partNumber: number, data: Buffer): Promise<{ etag: string }>;
  
  // 分片上传 - 完成
  completeMultipartUpload(uploadId: string, key: string, parts: { partNumber: number; etag: string }[]): Promise<UploadResult>;
  
  // 下载文件
  download(path: string): Promise<DownloadResult>;
  
  // 获取文件URL
  getUrl(path: string, expires?: number): string;
  
  // 删除文件
  delete(path: string): Promise<boolean>;
  
  // 检查文件是否存在
  exists(path: string): Promise<boolean>;
  
  // 获取文件元数据
  getMetadata(path: string): Promise<FileMetadata | null>;
  
  // 生成缩略图（图片/视频）
  generateThumbnail(path: string, width: number, height: number): Promise<string | null>;
  
  // 获取存储配额信息
  getQuota(): Promise<StorageQuota>;
  
  // 测试连接
  testConnection(): Promise<boolean>;
}
