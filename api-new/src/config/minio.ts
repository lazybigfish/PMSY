import { Client as MinioClient } from 'minio';
import { MINIO_CONFIG } from './constants';

/**
 * MinIO 客户端实例
 */
export const minioClient = new MinioClient({
  endPoint: MINIO_CONFIG.endPoint,
  port: MINIO_CONFIG.port,
  useSSL: MINIO_CONFIG.useSSL,
  accessKey: MINIO_CONFIG.accessKey,
  secretKey: MINIO_CONFIG.secretKey,
});

/**
 * 确保存储桶存在
 */
export async function ensureBucketExists(bucketName: string = MINIO_CONFIG.bucketName): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName);
      console.log(`Bucket '${bucketName}' created successfully`);
    }
  } catch (error) {
    console.error(`Failed to ensure bucket '${bucketName}' exists:`, error);
    throw error;
  }
}

/**
 * 测试 MinIO 连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    await minioClient.listBuckets();
    return true;
  } catch (error) {
    console.error('MinIO connection failed:', error);
    return false;
  }
}

export default minioClient;
