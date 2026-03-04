/**
 * 上传功能 Hook
 * 提供简洁的上传功能封装
 */

import { useState, useCallback, useRef } from 'react';
import {
  uploadCore,
  UploadConfig,
  UploadOptions,
  UploadResult,
  UploadProgress,
  UploadError,
} from '../lib/upload/UploadCore';

interface UseUploadOptions {
  config?: UploadConfig;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: UploadError) => void;
  onProgress?: (progress: UploadProgress) => void;
}

interface UseUploadReturn {
  // 上传方法
  upload: (file: File, options: Omit<UploadOptions, 'onProgress'>) => Promise<UploadResult>;
  uploadBatch: (files: File[], options: Omit<UploadOptions, 'onProgress'>) => Promise<UploadResult[]>;
  
  // 状态
  isUploading: boolean;
  progress: UploadProgress | null;
  error: UploadError | null;
  result: UploadResult | null;
  
  // 操作
  cancel: () => void;
  reset: () => void;
}

export function useUpload(options?: UseUploadOptions): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<UploadError | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  
  const currentUploadIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
    setResult(null);
    currentUploadIdRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    if (currentUploadIdRef.current) {
      uploadCore.cancel(currentUploadIdRef.current);
    }
  }, []);

  const upload = useCallback(
    async (file: File, uploadOptions: Omit<UploadOptions, 'onProgress'>): Promise<UploadResult> => {
      setIsUploading(true);
      setProgress(null);
      setError(null);
      setResult(null);

      try {
        const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        currentUploadIdRef.current = uploadId;

        const result = await uploadCore.upload(
          file,
          {
            ...uploadOptions,
            onProgress: (p) => {
              setProgress(p);
              options?.onProgress?.(p);
            },
          },
          options?.config
        );

        setResult(result);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const uploadError = err as UploadError;
        setError(uploadError);
        options?.onError?.(uploadError);
        throw uploadError;
      } finally {
        setIsUploading(false);
        currentUploadIdRef.current = null;
      }
    },
    [options]
  );

  const uploadBatch = useCallback(
    async (files: File[], uploadOptions: Omit<UploadOptions, 'onProgress'>): Promise<UploadResult[]> => {
      setIsUploading(true);
      setProgress(null);
      setError(null);
      setResult(null);

      try {
        const results = await uploadCore.uploadBatch(
          files,
          {
            ...uploadOptions,
            onProgress: (p) => {
              setProgress(p);
              options?.onProgress?.(p);
            },
          },
          options?.config
        );

        options?.onSuccess?.(results[results.length - 1]);
        return results;
      } catch (err) {
        const uploadError = err as UploadError;
        setError(uploadError);
        options?.onError?.(uploadError);
        throw uploadError;
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  return {
    upload,
    uploadBatch,
    isUploading,
    progress,
    error,
    result,
    cancel,
    reset,
  };
}

export default useUpload;
