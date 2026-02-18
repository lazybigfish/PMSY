import { IStorageProvider, UploadOptions, UploadResult, DownloadResult, FileMetadata, StorageQuota } from './StorageInterface';
import { apiClient } from '../api';

export class LocalStorageProvider implements IStorageProvider {
  private config: Record<string, unknown> = {};
  private basePath: string = 'uploads';

  async initialize(config: Record<string, unknown>): Promise<boolean> {
    this.config = config;
    this.basePath = (config.basePath as string) || 'uploads';

    // 检查基础目录是否存在
    try {
      const result = await apiClient.get<{ exists: boolean }>(`/api/storage/check?path=${encodeURIComponent(this.basePath)}`);
      return result.exists;
    } catch (error) {
      console.error('Failed to initialize local storage:', error);
      return false;
    }
  }

  async upload(file: File | Buffer | ReadableStream, options: UploadOptions): Promise<UploadResult> {
    try {
      const formData = new FormData();
      
      if (file instanceof File) {
        formData.append('file', file);
      } else if (file instanceof Blob) {
        formData.append('file', file, options.fileName);
      } else {
        // 处理 Buffer 或 ReadableStream
        const blob = new Blob([file as BlobPart]);
        formData.append('file', blob, options.fileName);
      }

      formData.append('fileName', options.fileName);
      formData.append('mimeType', options.mimeType);
      formData.append('folder', options.folder || '');
      formData.append('metadata', JSON.stringify(options.metadata || {}));

      const result = await apiClient.post<{
        path: string;
        url: string;
        size: number;
        checksum?: string;
        message?: string;
      }>('/api/storage/upload', formData, {
        headers: {
          // 不设置 Content-Type，让浏览器自动设置 multipart/form-data
        }
      });

      return {
        success: true,
        path: result.path,
        url: result.url,
        size: result.size,
        checksum: result.checksum,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        path: '',
        url: '',
        size: 0,
        error: err.message || 'Upload failed',
      };
    }
  }

  async initiateMultipartUpload(fileName: string, mimeType: string): Promise<{ uploadId: string; key: string }> {
    const result = await apiClient.post<{
      uploadId: string;
      key: string;
    }>('/api/storage/multipart/initiate', { fileName, mimeType });

    return result;
  }

  async uploadPart(uploadId: string, key: string, partNumber: number, data: Buffer): Promise<{ etag: string }> {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('key', key);
    formData.append('partNumber', partNumber.toString());
    formData.append('data', new Blob([new Uint8Array(data)]));

    const result = await apiClient.post<{
      etag: string;
    }>('/api/storage/multipart/upload', formData, {
      headers: {
        // 不设置 Content-Type，让浏览器自动设置 multipart/form-data
      }
    });

    return result;
  }

  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: { partNumber: number; etag: string }[]
  ): Promise<UploadResult> {
    try {
      const result = await apiClient.post<{
        path: string;
        url: string;
        size: number;
        checksum?: string;
        message?: string;
      }>('/api/storage/multipart/complete', { uploadId, key, parts });

      return {
        success: true,
        path: result.path,
        url: result.url,
        size: result.size,
        checksum: result.checksum,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        path: '',
        url: '',
        size: 0,
        error: err.message || 'Failed to complete multipart upload',
      };
    }
  }

  async download(path: string): Promise<DownloadResult> {
    try {
      // 使用 fetch 下载文件（二进制数据）
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/storage/download?path=${encodeURIComponent(path)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: 'Download failed',
        };
      }

      const blob = await response.blob();
      return {
        success: true,
        buffer: Buffer.from(await blob.arrayBuffer()),
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  getUrl(path: string, _expires?: number): string {
    // 本地存储返回相对路径或API URL
    void _expires; // 本地存储不使用过期时间
    return `/api/storage/file?path=${encodeURIComponent(path)}`;
  }

  async delete(path: string): Promise<boolean> {
    try {
      await apiClient.delete(`/api/storage/delete?path=${encodeURIComponent(path)}`);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const result = await apiClient.get<{ exists: boolean }>(`/api/storage/exists?path=${encodeURIComponent(path)}`);
      return result.exists;
    } catch {
      return false;
    }
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    try {
      return await apiClient.get<FileMetadata>(`/api/storage/metadata?path=${encodeURIComponent(path)}`);
    } catch {
      return null;
    }
  }

  async generateThumbnail(path: string, width: number, height: number): Promise<string | null> {
    try {
      const result = await apiClient.post<{
        thumbnailUrl: string;
      }>('/api/storage/thumbnail', { path, width, height });
      return result.thumbnailUrl;
    } catch {
      return null;
    }
  }

  async getQuota(): Promise<StorageQuota> {
    try {
      return await apiClient.get<StorageQuota>('/api/storage/quota');
    } catch {
      return { total: 0, used: 0, available: 0 };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await apiClient.get('/api/storage/test');
      return true;
    } catch {
      return false;
    }
  }
}
