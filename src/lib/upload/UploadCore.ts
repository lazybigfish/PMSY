/**
 * 统一上传核心模块
 * 提供图片/文件上传的完整功能
 */

import { apiClient } from '../api';

// 上传配置
export interface UploadConfig {
  maxFileSize?: number;
  allowedTypes?: string[];
  compress?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  };
  retryCount?: number;
}

// 上传选项
export interface UploadOptions {
  bucket: string;
  folder?: string;
  fileName?: string;
  metadata?: {
    projectId?: string;
    taskId?: string;
    moduleType?: string;
    [key: string]: any;
  };
  onProgress?: (progress: UploadProgress) => void;
}

// 上传进度
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// 上传结果
export interface UploadResult {
  id: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

// 上传错误
export enum UploadErrorCode {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_TYPE = 'INVALID_TYPE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  CANCELLED = 'CANCELLED',
  COMPRESS_FAILED = 'COMPRESS_FAILED',
}

export interface UploadError {
  code: UploadErrorCode;
  message: string;
  detail?: string;
  retryable: boolean;
}

// 默认配置
const DEFAULT_CONFIG: UploadConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: [],
  retryCount: 3,
};

// 图片压缩配置
const COMPRESS_PRESETS = {
  avatar: { maxWidth: 200, maxHeight: 200, quality: 0.9 },
  thumbnail: { maxWidth: 400, maxHeight: 400, quality: 0.8 },
  post: { maxWidth: 1920, maxHeight: 1920, quality: 0.85 },
  document: { maxWidth: 1920, maxHeight: 1920, quality: 0.9 },
};

class UploadCore {
  private abortControllers: Map<string, AbortController> = new Map();

  /**
   * 验证文件
   */
  validateFile(file: File, config: UploadConfig = {}): UploadError | null {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // 检查文件大小
    if (finalConfig.maxFileSize && file.size > finalConfig.maxFileSize) {
      return {
        code: UploadErrorCode.FILE_TOO_LARGE,
        message: `文件大小不能超过 ${this.formatFileSize(finalConfig.maxFileSize)}`,
        retryable: false,
      };
    }

    // 检查文件类型
    if (finalConfig.allowedTypes && finalConfig.allowedTypes.length > 0) {
      if (!finalConfig.allowedTypes.includes(file.type)) {
        return {
          code: UploadErrorCode.INVALID_TYPE,
          message: `不支持的文件类型: ${file.type}`,
          retryable: false,
        };
      }
    }

    return null;
  }

  /**
   * 单文件上传
   */
  async upload(
    file: File,
    options: UploadOptions,
    config: UploadConfig = {}
  ): Promise<UploadResult> {
    const uploadId = this.generateUploadId();
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // 验证文件
    const validationError = this.validateFile(file, finalConfig);
    if (validationError) {
      throw validationError;
    }

    // 创建 AbortController
    const abortController = new AbortController();
    this.abortControllers.set(uploadId, abortController);

    try {
      // 图片压缩
      let processedFile = file;
      if (this.isImage(file) && finalConfig.compress) {
        try {
          processedFile = await this.compressImage(file, finalConfig.compress);
        } catch (error) {
          console.warn('[UploadCore] Image compression failed, using original:', error);
        }
      }

      // 构建 FormData
      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('bucket', options.bucket);
      if (options.folder) {
        formData.append('folder', options.folder);
      }
      if (options.fileName) {
        formData.append('fileName', options.fileName);
      }
      if (options.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata));
      }

      // 使用 XMLHttpRequest 以支持进度回调
      return await this.uploadWithXHR(
        uploadId,
        formData,
        processedFile.size,
        options.onProgress,
        abortController
      );
    } finally {
      this.abortControllers.delete(uploadId);
    }
  }

  /**
   * 批量上传
   */
  async uploadBatch(
    files: File[],
    options: UploadOptions,
    config: UploadConfig = {}
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 为每个文件创建独立的进度回调
      const onProgress = options.onProgress
        ? (progress: UploadProgress) => {
            // 计算总体进度
            const totalProgress: UploadProgress = {
              loaded: progress.loaded + i * (file.size || 0),
              total: files.reduce((sum, f) => sum + (f.size || 0), 0),
              percentage: Math.round(
                ((progress.loaded + i * (file.size || 0)) /
                  files.reduce((sum, f) => sum + (f.size || 0), 0)) *
                  100
              ),
            };
            options.onProgress?.(totalProgress);
          }
        : undefined;

      try {
        const result = await this.upload(file, { ...options, onProgress }, config);
        results.push(result);
      } catch (error) {
        console.error(`[UploadCore] Failed to upload ${file.name}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * 取消上传
   */
  cancel(uploadId: string): void {
    const controller = this.abortControllers.get(uploadId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(uploadId);
    }
  }

  /**
   * 使用 XMLHttpRequest 上传（支持进度）
   */
  private uploadWithXHR(
    uploadId: string,
    formData: FormData,
    totalSize: number,
    onProgress?: (progress: UploadProgress) => void,
    abortController?: AbortController
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 进度监听
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      // 完成监听
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result.success) {
              resolve(result.data);
            } else {
              reject({
                code: UploadErrorCode.SERVER_ERROR,
                message: result.error?.message || '上传失败',
                retryable: true,
              });
            }
          } catch (error) {
            reject({
              code: UploadErrorCode.SERVER_ERROR,
              message: '解析响应失败',
              detail: String(error),
              retryable: false,
            });
          }
        } else {
          reject({
            code: UploadErrorCode.SERVER_ERROR,
            message: `上传失败: ${xhr.statusText}`,
            retryable: xhr.status >= 500,
          });
        }
      });

      // 错误监听
      xhr.addEventListener('error', () => {
        reject({
          code: UploadErrorCode.NETWORK_ERROR,
          message: '网络错误，请检查网络连接',
          retryable: true,
        });
      });

      // 取消监听
      xhr.addEventListener('abort', () => {
        reject({
          code: UploadErrorCode.CANCELLED,
          message: '上传已取消',
          retryable: false,
        });
      });

      // 监听 abortController
      if (abortController) {
        abortController.signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      // 发送请求
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      xhr.open('POST', `${API_BASE_URL}/api/upload`);

      const token = localStorage.getItem('access_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  /**
   * 图片压缩
   */
  private compressImage(file: File, config: UploadConfig['compress']): Promise<File> {
    return new Promise((resolve, reject) => {
      if (!config) {
        resolve(file);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        let { width, height } = img;
        const { maxWidth = 1920, maxHeight = 1920, quality = 0.85 } = config;

        // 计算缩放比例
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        // 创建 canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // 转换为 blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: file.lastModified,
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * 判断是否为图片
   */
  private isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * 生成上传ID
   */
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 获取压缩预设
   */
  getCompressPreset(preset: keyof typeof COMPRESS_PRESETS) {
    return COMPRESS_PRESETS[preset];
  }
}

// 导出单例
export const uploadCore = new UploadCore();
export default uploadCore;
