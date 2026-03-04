/**
 * 文件访问服务
 * 支持多种访问策略：直接访问、后端代理、预签名URL
 */

import { Client as MinioClient } from 'minio';
import { MINIO_CONFIG, API_URL } from '../config/constants';
import { logger } from '../utils/logger';

// MinIO 客户端实例
const minioClient = new MinioClient({
  endPoint: MINIO_CONFIG.endPoint,
  port: MINIO_CONFIG.port,
  useSSL: MINIO_CONFIG.useSSL,
  accessKey: MINIO_CONFIG.accessKey,
  secretKey: MINIO_CONFIG.secretKey,
});

// 访问策略
export enum AccessStrategy {
  DIRECT = 'direct',      // 直接访问 MinIO
  PROXY = 'proxy',        // 后端代理
  PRESIGNED = 'presigned', // 预签名 URL
}

// 文件访问配置
export interface FileAccessConfig {
  strategy: AccessStrategy;
  expirySeconds?: number;  // 预签名 URL 过期时间（秒）
}

// 公开访问的 bucket 列表（可以直接访问）
// 注意：服务器环境只有 6969 端口可外部访问，所有 bucket 都通过后端代理访问
const PUBLIC_BUCKETS: string[] = [];

// 私有 bucket 列表（需要权限控制）
const PRIVATE_BUCKETS = ['documents', 'contracts', 'private'];

/**
 * 获取文件访问 URL
 * @param bucket - 存储桶
 * @param filePath - 文件路径
 * @param strategy - 访问策略
 * @returns 访问 URL
 */
export async function getFileUrl(
  bucket: string,
  filePath: string,
  strategy?: AccessStrategy
): Promise<string> {
  // 如果没有指定策略，根据 bucket 自动选择
  const finalStrategy = strategy || getDefaultStrategy(bucket);

  switch (finalStrategy) {
    case AccessStrategy.DIRECT:
      return getDirectUrl(bucket, filePath);
    
    case AccessStrategy.PRESIGNED:
      return getPresignedUrl(bucket, filePath, 3600); // 默认1小时
    
    case AccessStrategy.PROXY:
    default:
      return getProxyUrl(bucket, filePath);
  }
}

/**
 * 获取直接访问 URL（MinIO 直链）
 */
export function getDirectUrl(bucket: string, filePath: string): string {
  const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || 
    `http://${MINIO_CONFIG.endPoint}:${MINIO_CONFIG.port}`;
  return `${MINIO_PUBLIC_URL}/${bucket}/${filePath}`;
}

/**
 * 获取后端代理 URL
 */
export function getProxyUrl(bucket: string, filePath: string): string {
  return `${API_URL}/api/files/${bucket}/${filePath}`;
}

/**
 * 获取预签名 URL
 */
export async function getPresignedUrl(
  bucket: string,
  filePath: string,
  expirySeconds: number = 3600
): Promise<string> {
  try {
    return await minioClient.presignedGetObject(bucket, filePath, expirySeconds);
  } catch (error) {
    logger.error(`[FileAccess] Failed to generate presigned URL: ${bucket}/${filePath}`, error);
    // 如果生成失败，回退到代理 URL
    return getProxyUrl(bucket, filePath);
  }
}

/**
 * 批量获取预签名 URL
 */
export async function getPresignedUrls(
  files: Array<{ bucket: string; filePath: string }>,
  expirySeconds: number = 3600
): Promise<Array<{ bucket: string; filePath: string; url: string }>> {
  const results = await Promise.all(
    files.map(async (file) => ({
      ...file,
      url: await getPresignedUrl(file.bucket, file.filePath, expirySeconds),
    }))
  );
  return results;
}

/**
 * 获取默认访问策略
 */
export function getDefaultStrategy(bucket: string): AccessStrategy {
  if (PUBLIC_BUCKETS.includes(bucket)) {
    return AccessStrategy.DIRECT;
  }
  if (PRIVATE_BUCKETS.includes(bucket)) {
    return AccessStrategy.PROXY;
  }
  // 默认使用代理（安全优先）
  return AccessStrategy.PROXY;
}

/**
 * 检查 bucket 是否为公开
 */
export function isPublicBucket(bucket: string): boolean {
  return PUBLIC_BUCKETS.includes(bucket);
}

/**
 * 检查 bucket 是否为私有
 */
export function isPrivateBucket(bucket: string): boolean {
  return PRIVATE_BUCKETS.includes(bucket);
}

/**
 * 添加公开 bucket
 */
export function addPublicBucket(bucket: string): void {
  if (!PUBLIC_BUCKETS.includes(bucket)) {
    PUBLIC_BUCKETS.push(bucket);
  }
}

/**
 * 添加私有 bucket
 */
export function addPrivateBucket(bucket: string): void {
  if (!PRIVATE_BUCKETS.includes(bucket)) {
    PRIVATE_BUCKETS.push(bucket);
  }
}

export default {
  getFileUrl,
  getDirectUrl,
  getProxyUrl,
  getPresignedUrl,
  getPresignedUrls,
  getDefaultStrategy,
  isPublicBucket,
  isPrivateBucket,
  addPublicBucket,
  addPrivateBucket,
  AccessStrategy,
};
