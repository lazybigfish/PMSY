/**
 * 图片上传组件
 * 支持点击上传、拖拽上传、粘贴上传、图片预览、拖拽排序
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, GripVertical, AlertCircle } from 'lucide-react';
import { useUpload } from '../../hooks/useUpload';
import { UploadResult, UploadProgress } from '../../lib/upload/UploadCore';
import { ImagePreviewModal } from '../ImagePreviewModal';

export interface ImageUploaderProps {
  value?: string[];
  onChange?: (urls: string[]) => void;
  maxCount?: number;
  maxSize?: number;
  compress?: boolean | 'post' | 'avatar' | 'thumbnail';
  disabled?: boolean;
  className?: string;
  bucket?: string;
  folder?: string;
}

interface ImageItem {
  id: string;
  url: string;
  file?: File;
  uploading?: boolean;
  progress?: number;
  error?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value = [],
  onChange,
  maxCount = 9,
  maxSize = 5 * 1024 * 1024, // 5MB
  compress = true,
  disabled = false,
  className = '',
  bucket = 'images',
  folder = 'uploads',
}) => {
  const [images, setImages] = useState<ImageItem[]>(
    value.map((url, index) => ({
      id: `existing_${index}`,
      url,
    }))
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload, isUploading } = useUpload({
    config: {
      maxFileSize: maxSize,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      compress: compress === true || compress === 'post' 
        ? { maxWidth: 1920, maxHeight: 1920, quality: 0.85 }
        : compress === 'avatar'
        ? { maxWidth: 200, maxHeight: 200, quality: 0.9 }
        : compress === 'thumbnail'
        ? { maxWidth: 400, maxHeight: 400, quality: 0.8 }
        : undefined,
    },
  });

  // 同步外部 value 变化
  useEffect(() => {
    const currentUrls = images.filter(img => !img.uploading && !img.error).map(img => img.url);
    if (JSON.stringify(currentUrls) !== JSON.stringify(value)) {
      setImages(value.map((url, index) => ({
        id: `existing_${index}`,
        url,
      })));
    }
  }, [value]);

  // 通知外部变化
  const notifyChange = useCallback((newImages: ImageItem[]) => {
    const urls = newImages.filter(img => !img.uploading && !img.error).map(img => img.url);
    onChange?.(urls);
  }, [onChange]);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return '请选择图片文件';
    }
    if (file.size > maxSize) {
      return `图片大小不能超过 ${(maxSize / 1024 / 1024).toFixed(0)}MB`;
    }
    return null;
  };

  const uploadSingleImage = async (file: File) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tempImage: ImageItem = {
      id: tempId,
      url: URL.createObjectURL(file),
      file,
      uploading: true,
      progress: 0,
    };

    const newImages = [...images, tempImage];
    setImages(newImages);

    try {
      const result = await upload(file, {
        bucket,
        folder,
      });

      const finalImage: ImageItem = {
        id: result.id,
        url: result.fileUrl,
        uploading: false,
        progress: 100,
      };

      const updatedImages = newImages.map(img => 
        img.id === tempId ? finalImage : img
      );
      setImages(updatedImages);
      notifyChange(updatedImages);

      // 清理临时 URL
      URL.revokeObjectURL(tempImage.url);
    } catch (error: any) {
      const updatedImages = newImages.map(img => 
        img.id === tempId ? { ...img, uploading: false, error: error.message || '上传失败' } : img
      );
      setImages(updatedImages);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxCount - images.filter(img => !img.uploading && !img.error).length;
    if (remainingSlots <= 0) {
      alert(`最多只能上传 ${maxCount} 张图片`);
      return;
    }

    const fileArray = Array.from(files).slice(0, remainingSlots);

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        alert(error);
        continue;
      }
      await uploadSingleImage(file);
    }

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (disabled) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;

    const remainingSlots = maxCount - images.filter(img => !img.uploading && !img.error).length;
    if (remainingSlots <= 0) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length === 0) return;
    e.preventDefault();

    const filesToUpload = imageFiles.slice(0, remainingSlots);
    for (const file of filesToUpload) {
      const error = validateFile(file);
      if (error) {
        alert(error);
        continue;
      }
      await uploadSingleImage(file);
    }
  }, [images, maxCount, disabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('paste', handlePaste as any);
    return () => {
      container.removeEventListener('paste', handlePaste as any);
    };
  }, [handlePaste]);

  const handleRemove = (id: string) => {
    const image = images.find(img => img.id === id);
    if (image?.url && image.url.startsWith('blob:')) {
      URL.revokeObjectURL(image.url);
    }
    const newImages = images.filter(img => img.id !== id);
    setImages(newImages);
    notifyChange(newImages);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    
    setImages(newImages);
    setDraggedIndex(index);
    notifyChange(newImages);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const uploadedImages = images.filter(img => !img.uploading && !img.error);
  const canAddMore = uploadedImages.length < maxCount && !disabled;

  return (
    <div ref={containerRef} className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-dark-500">
        <ImageIcon className="w-4 h-4" />
        <span>支持点击上传或 Ctrl+V 粘贴图片</span>
        <span className="text-dark-400">({uploadedImages.length}/{maxCount})</span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable={!disabled && !image.uploading}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                draggedIndex === index 
                  ? 'border-primary-500 opacity-50' 
                  : 'border-dark-200 hover:border-primary-300'
              } ${image.error ? 'border-red-300 bg-red-50' : ''}`}
            >
              {image.uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-100">
                  <div className="text-center">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin mx-auto" />
                    <span className="text-xs text-dark-500 mt-1">{image.progress || 0}%</span>
                  </div>
                </div>
              ) : image.error ? (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                  <div className="text-center p-2">
                    <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
                    <span className="text-xs text-red-600 mt-1 block truncate">{image.error}</span>
                  </div>
                </div>
              ) : (
                <>
                  <img
                    src={image.url}
                    alt={`图片 ${index + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setPreviewIndex(index)}
                  />
                  {hoveredIndex === index && !disabled && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleRemove(image.id)}
                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        title="删除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="p-1.5 bg-dark-500 text-white rounded-lg cursor-grab active:cursor-grabbing" title="拖拽排序">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-dark-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all duration-200">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading || disabled}
          />
          <div className="flex items-center gap-2 text-dark-500">
            <Upload className="w-5 h-5" />
            <span className="text-sm">点击上传图片</span>
          </div>
        </label>
      )}

      {/* 图片预览弹窗 */}
      <ImagePreviewModal
        isOpen={previewIndex !== null}
        onClose={() => setPreviewIndex(null)}
        images={uploadedImages.map(img => img.url)}
        currentIndex={previewIndex ?? 0}
        onIndexChange={setPreviewIndex}
        title="图片预览"
      />
    </div>
  );
};

export default ImageUploader;
