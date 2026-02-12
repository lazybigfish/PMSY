import React, { useState, useRef } from 'react';
import { Upload, Loader2, X, File as FileIcon, CheckCircle } from 'lucide-react';
import { fileService } from '../services/fileService';
import { FileRecord } from '../types/file';

interface FileUploadButtonProps {
  onUploadComplete?: (files: FileRecord[]) => void;
  onUploadError?: (error: string) => void;
  buttonText?: string;
  buttonClassName?: string;
  multiple?: boolean;
  accept?: string;
  disabled?: boolean;
  context?: {
    projectId?: string;
    taskId?: string;
    moduleType?: string;
  };
}

export const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  onUploadComplete,
  onUploadError,
  buttonText = '上传附件',
  buttonClassName = '',
  multiple = true,
  accept,
  disabled = false,
  context,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; progress: number; status: 'uploading' | 'completed' | 'error' }[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setShowProgress(true);
    setUploadProgress(
      Array.from(files).map((file) => ({
        fileName: file.name,
        progress: 0,
        status: 'uploading' as const,
      }))
    );

    try {
      const uploadedFiles: FileRecord[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 更新进度状态
        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, progress: 50 } : p
          )
        );

        // 上传文件
        const result = await fileService.uploadFile(file, null, (progress) => {
          setUploadProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, progress: progress.progress } : p
            )
          );
        });

        // 如果有上下文信息，更新文件关联
        if (context) {
          await fileService.updateFileContext(result.id, context);
        }

        uploadedFiles.push(result);

        // 标记完成
        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, progress: 100, status: 'completed' as const } : p
          )
        );
      }

      onUploadComplete?.(uploadedFiles);
      
      // 延迟关闭进度显示
      setTimeout(() => {
        setShowProgress(false);
        setUploadProgress([]);
      }, 2000);
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const err = error as Error;
      onUploadError?.(err.message || '上传失败');
      
      setUploadProgress((prev) =>
        prev.map((p) =>
          p.status === 'uploading' ? { ...p, status: 'error' as const } : p
        )
      );
    } finally {
      setIsUploading(false);
      // 重置input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    setShowProgress(false);
    setUploadProgress([]);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled || isUploading}
        className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Upload className="h-4 w-4 mr-2" />
        )}
        {isUploading ? '上传中...' : buttonText}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 上传进度弹窗 */}
      {showProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">上传进度</h3>
              {!isUploading && (
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {uploadProgress.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {item.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : item.status === 'error' ? (
                      <X className="h-5 w-5 text-red-500" />
                    ) : (
                      <FileIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {item.fileName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.status === 'completed'
                          ? '完成'
                          : item.status === 'error'
                          ? '失败'
                          : `${item.progress}%`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          item.status === 'completed'
                            ? 'bg-green-500'
                            : item.status === 'error'
                            ? 'bg-red-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileUploadButton;
