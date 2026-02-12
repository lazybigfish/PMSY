import { IStorageProvider, UploadOptions, UploadResult, DownloadResult, FileMetadata, StorageQuota } from './StorageInterface';

export class LocalStorageProvider implements IStorageProvider {
  private config: Record<string, unknown> = {};
  private basePath: string = 'uploads';

  async initialize(config: Record<string, unknown>): Promise<boolean> {
    this.config = config;
    this.basePath = (config.basePath as string) || 'uploads';

    // 检查基础目录是否存在
    try {
      const response = await fetch(`/api/storage/check?path=${encodeURIComponent(this.basePath)}`);
      return response.ok;
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

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          path: '',
          url: '',
          size: 0,
          error: error.message || 'Upload failed',
        };
      }

      const result = await response.json();
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
    const response = await fetch('/api/storage/multipart/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, mimeType }),
    });

    if (!response.ok) {
      throw new Error('Failed to initiate multipart upload');
    }

    return await response.json();
  }

  async uploadPart(uploadId: string, key: string, partNumber: number, data: Buffer): Promise<{ etag: string }> {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('key', key);
    formData.append('partNumber', partNumber.toString());
    formData.append('data', new Blob([new Uint8Array(data)]));

    const response = await fetch('/api/storage/multipart/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload part');
    }

    return await response.json();
  }

  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: { partNumber: number; etag: string }[]
  ): Promise<UploadResult> {
    const response = await fetch('/api/storage/multipart/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, key, parts }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        path: '',
        url: '',
        size: 0,
        error: error.message || 'Failed to complete multipart upload',
      };
    }

    const result = await response.json();
    return {
      success: true,
      path: result.path,
      url: result.url,
      size: result.size,
      checksum: result.checksum,
    };
  }

  async download(path: string): Promise<DownloadResult> {
    try {
      const response = await fetch(`/api/storage/download?path=${encodeURIComponent(path)}`);
      
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
      const response = await fetch('/api/storage/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/storage/exists?path=${encodeURIComponent(path)}`);
      if (!response.ok) return false;
      
      const result = await response.json();
      return result.exists;
    } catch {
      return false;
    }
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    try {
      const response = await fetch(`/api/storage/metadata?path=${encodeURIComponent(path)}`);
      if (!response.ok) return null;
      
      return await response.json();
    } catch {
      return null;
    }
  }

  async generateThumbnail(path: string, width: number, height: number): Promise<string | null> {
    try {
      const response = await fetch('/api/storage/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, width, height }),
      });

      if (!response.ok) return null;
      
      const result = await response.json();
      return result.thumbnailUrl;
    } catch {
      return null;
    }
  }

  async getQuota(): Promise<StorageQuota> {
    try {
      const response = await fetch('/api/storage/quota');
      if (!response.ok) {
        return { total: 0, used: 0, available: 0 };
      }
      
      return await response.json();
    } catch {
      return { total: 0, used: 0, available: 0 };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/storage/test');
      return response.ok;
    } catch {
      return false;
    }
  }
}
