import { Client as MinioClient, CopyConditions } from 'minio';
import { MINIO_CONFIG } from '../config/constants';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * 存储服务
 * 使用 MinIO 实现文件存储功能
 */

// MinIO 客户端实例
const minioClient = new MinioClient({
  endPoint: MINIO_CONFIG.endPoint,
  port: MINIO_CONFIG.port,
  useSSL: MINIO_CONFIG.useSSL,
  accessKey: MINIO_CONFIG.accessKey,
  secretKey: MINIO_CONFIG.secretKey,
});

/**
 * 文件元数据接口
 */
export interface FileMetadata {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  bucket: string;
  path: string;
  url: string;
  uploadedBy?: string;
  uploadedAt: Date;
}

/**
 * 上传文件
 * @param bucket - 存储桶名称
 * @param filePath - 文件路径（在存储桶中的路径）
 * @param buffer - 文件内容
 * @param metadata - 文件元数据
 * @returns 文件元数据
 */
export async function uploadFile(
  bucket: string,
  filePath: string,
  buffer: Buffer,
  metadata: Partial<FileMetadata> = {}
): Promise<FileMetadata> {
  // 确保存储桶存在
  const bucketExists = await minioClient.bucketExists(bucket);
  if (!bucketExists) {
    await minioClient.makeBucket(bucket);
    // 设置存储桶为公开读取
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    };
    await minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
  }

  // 上传文件
  await minioClient.putObject(bucket, filePath, buffer, buffer.length, {
    'Content-Type': metadata.mimetype || 'application/octet-stream',
    'X-Upload-Date': new Date().toISOString(),
  });

  // 生成文件 URL - 使用与 API 同源的地址
  const API_PORT = process.env.API_PORT || process.env.PORT || 3001;
  const url = `http://localhost:${API_PORT}/storage/v1/object/public/${bucket}/${filePath}`;

  return {
    filename: path.basename(filePath),
    originalName: metadata.originalName || path.basename(filePath),
    mimetype: metadata.mimetype || 'application/octet-stream',
    size: buffer.length,
    bucket,
    path: filePath,
    url,
    uploadedBy: metadata.uploadedBy,
    uploadedAt: new Date(),
  };
}

/**
 * 生成唯一的文件名
 * @param originalName - 原始文件名
 * @returns 唯一的文件名
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const basename = path.basename(originalName, ext);
  const timestamp = Date.now();
  const uniqueId = uuidv4().split('-')[0];
  return `${basename}_${timestamp}_${uniqueId}${ext}`;
}

/**
 * 下载文件
 * @param bucket - 存储桶名称
 * @param filePath - 文件路径
 * @returns 文件流
 */
export async function downloadFile(bucket: string, filePath: string): Promise<NodeJS.ReadableStream> {
  return await minioClient.getObject(bucket, filePath);
}

/**
 * 获取文件元数据
 * @param bucket - 存储桶名称
 * @param filePath - 文件路径
 * @returns 文件统计信息
 */
export async function getFileStat(bucket: string, filePath: string): Promise<any> {
  return await minioClient.statObject(bucket, filePath);
}

/**
 * 删除文件
 * @param bucket - 存储桶名称
 * @param filePath - 文件路径
 */
export async function deleteFile(bucket: string, filePath: string): Promise<void> {
  await minioClient.removeObject(bucket, filePath);
}

/**
 * 批量删除文件
 * @param bucket - 存储桶名称
 * @param filePaths - 文件路径数组
 */
export async function deleteFiles(bucket: string, filePaths: string[]): Promise<void> {
  await minioClient.removeObjects(bucket, filePaths);
}

/**
 * 获取公开访问 URL
 * @param bucket - 存储桶名称
 * @param filePath - 文件路径
 * @returns 公开 URL
 */
export function getPublicUrl(bucket: string, filePath: string): string {
  return `${MINIO_CONFIG.useSSL ? 'https' : 'http'}://${MINIO_CONFIG.endPoint}:${MINIO_CONFIG.port}/${bucket}/${filePath}`;
}

/**
 * 生成预签名 URL（用于临时访问）
 * @param bucket - 存储桶名称
 * @param filePath - 文件路径
 * @param expirySeconds - 过期时间（秒）
 * @returns 预签名 URL
 */
export async function getPresignedUrl(
  bucket: string,
  filePath: string,
  expirySeconds: number = 3600
): Promise<string> {
  return await minioClient.presignedGetObject(bucket, filePath, expirySeconds);
}

/**
 * 生成预签名上传 URL（用于直传）
 * @param bucket - 存储桶名称
 * @param filePath - 文件路径
 * @param expirySeconds - 过期时间（秒）
 * @returns 预签名上传 URL
 */
export async function getPresignedPutUrl(
  bucket: string,
  filePath: string,
  expirySeconds: number = 3600
): Promise<string> {
  return await minioClient.presignedPutObject(bucket, filePath, expirySeconds);
}

/**
 * 列出存储桶中的所有文件
 * @param bucket - 存储桶名称
 * @param prefix - 路径前缀（文件夹路径）
 * @param recursive - 是否递归
 * @returns 文件列表
 */
export async function listFiles(
  bucket: string,
  prefix?: string,
  recursive: boolean = false
): Promise<any[]> {
  const stream = minioClient.listObjects(bucket, prefix, recursive);
  const files: any[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (obj) => {
      files.push({
        name: obj.name,
        size: obj.size,
        lastModified: obj.lastModified,
        etag: obj.etag,
      });
    });

    stream.on('error', (err) => {
      reject(err);
    });

    stream.on('end', () => {
      resolve(files);
    });
  });
}

/**
 * 复制文件
 * @param sourceBucket - 源存储桶
 * @param sourcePath - 源文件路径
 * @param destBucket - 目标存储桶
 * @param destPath - 目标文件路径
 */
export async function copyFile(
  sourceBucket: string,
  sourcePath: string,
  destBucket: string,
  destPath: string
): Promise<void> {
  const conds = new CopyConditions();
  await minioClient.copyObject(destBucket, destPath, `/${sourceBucket}/${sourcePath}`, conds);
}

/**
 * 检查文件是否存在
 * @param bucket - 存储桶名称
 * @param filePath - 文件路径
 * @returns 是否存在
 */
export async function fileExists(bucket: string, filePath: string): Promise<boolean> {
  try {
    await minioClient.statObject(bucket, filePath);
    return true;
  } catch (error) {
    return false;
  }
}

export default {
  uploadFile,
  generateUniqueFilename,
  downloadFile,
  getFileStat,
  deleteFile,
  deleteFiles,
  getPublicUrl,
  getPresignedUrl,
  getPresignedPutUrl,
  listFiles,
  copyFile,
  fileExists,
};
