/**
 * 文件访问 Hook
 * 支持多种访问策略：直接访问、后端代理、预签名URL
 */

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../lib/api';

// 访问策略
export enum AccessStrategy {
  DIRECT = 'direct',      // 直接访问 MinIO
  PROXY = 'proxy',        // 后端代理
  PRESIGNED = 'presigned', // 预签名 URL
  AUTO = 'auto',          // 自动选择
}

// 文件访问配置
export interface FileAccessConfig {
  strategy?: AccessStrategy;
  expirySeconds?: number;  // 预签名 URL 过期时间（秒）
}

// 文件信息
export interface FileInfo {
  bucket: string;
  filePath: string;
  fileName?: string;
}

// 访问 URL 结果
export interface AccessUrlResult {
  url: string;
  strategy: AccessStrategy;
  expiresAt?: number;  // 预签名 URL 过期时间戳
}

// MinIO 配置（从后端获取）
interface MinioConfig {
  minioPublicUrl: string;
  publicBuckets: string[];
  privateBuckets: string[];
}

/**
 * 获取 MinIO 配置
 */
let minioConfigCache: MinioConfig | null = null;

async function getMinioConfig(): Promise<MinioConfig> {
  if (minioConfigCache) {
    return minioConfigCache;
  }

  try {
    const response = await apiClient.get('/api/files/config');
    if (response.data?.success) {
      minioConfigCache = response.data.data;
      return minioConfigCache;
    }
  } catch (error) {
    console.warn('[useFileAccess] Failed to get MinIO config:', error);
  }

  // 默认配置
  return {
    minioPublicUrl: import.meta.env.VITE_MINIO_PUBLIC_URL || 'http://localhost:9000',
    publicBuckets: ['images', 'forum', 'avatars'],
    privateBuckets: ['documents', 'contracts', 'private'],
  };
}

/**
 * 获取默认访问策略
 */
async function getDefaultStrategy(bucket: string): Promise<AccessStrategy> {
  const config = await getMinioConfig();
  
  if (config.publicBuckets.includes(bucket)) {
    return AccessStrategy.DIRECT;
  }
  if (config.privateBuckets.includes(bucket)) {
    return AccessStrategy.PROXY;
  }
  
  // 默认使用代理（安全优先）
  return AccessStrategy.PROXY;
}

/**
 * 获取直接访问 URL
 */
async function getDirectUrl(bucket: string, filePath: string): Promise<string> {
  const config = await getMinioConfig();
  return `${config.minioPublicUrl}/${bucket}/${filePath}`;
}

/**
 * 获取代理 URL
 */
function getProxyUrl(bucket: string, filePath: string): string {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return `${API_BASE_URL}/api/files/${bucket}/${filePath}`;
}

/**
 * 获取预签名 URL
 */
async function getPresignedUrl(
  bucket: string,
  filePath: string,
  expirySeconds: number = 3600
): Promise<string> {
  try {
    const response = await apiClient.post('/api/files/presigned-urls', {
      files: [{ bucket, filePath }],
      expirySeconds,
    });
    
    if (response.data?.success && response.data.data?.[0]?.success) {
      return response.data.data[0].url;
    }
  } catch (error) {
    console.warn('[useFileAccess] Failed to get presigned URL:', error);
  }
  
  // 如果获取失败，回退到代理 URL
  return getProxyUrl(bucket, filePath);
}

/**
 * 获取文件访问 URL
 */
export async function getFileAccessUrl(
  file: FileInfo,
  config?: FileAccessConfig
): Promise<AccessUrlResult> {
  const { bucket, filePath } = file;
  
  // 确定访问策略
  let strategy = config?.strategy || AccessStrategy.AUTO;
  if (strategy === AccessStrategy.AUTO) {
    strategy = await getDefaultStrategy(bucket);
  }
  
  let url: string;
  let expiresAt: number | undefined;
  
  switch (strategy) {
    case AccessStrategy.DIRECT:
      url = await getDirectUrl(bucket, filePath);
      break;
      
    case AccessStrategy.PRESIGNED:
      url = await getPresignedUrl(bucket, filePath, config?.expirySeconds);
      expiresAt = Date.now() + (config?.expirySeconds || 3600) * 1000;
      break;
      
    case AccessStrategy.PROXY:
    default:
      url = getProxyUrl(bucket, filePath);
      break;
  }
  
  return { url, strategy, expiresAt };
}

// Hook 接口
interface UseFileAccessReturn {
  getUrl: (file: FileInfo, config?: FileAccessConfig) => Promise<AccessUrlResult>;
  getUrls: (files: FileInfo[], config?: FileAccessConfig) => Promise<AccessUrlResult[]>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 文件访问 Hook
 */
export function useFileAccess(): UseFileAccessReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getUrl = useCallback(async (
    file: FileInfo,
    config?: FileAccessConfig
  ): Promise<AccessUrlResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getFileAccessUrl(file, config);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUrls = useCallback(async (
    files: FileInfo[],
    config?: FileAccessConfig
  ): Promise<AccessUrlResult[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await Promise.all(
        files.map(file => getFileAccessUrl(file, config))
      );
      return results;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getUrl,
    getUrls,
    isLoading,
    error,
  };
}

// 导出工具函数
export const fileAccessUtils = {
  getFileAccessUrl,
  getDirectUrl,
  getProxyUrl,
  getPresignedUrl,
  getDefaultStrategy,
  AccessStrategy,
};

export default useFileAccess;
