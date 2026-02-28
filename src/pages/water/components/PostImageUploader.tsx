import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, GripVertical, AlertCircle } from 'lucide-react';
import { fileService } from '../../../services/fileService';

interface PostImage {
  id: string;
  url: string;
  file?: File;
  uploading?: boolean;
  progress?: number;
  error?: string;
}

interface PostImageUploaderProps {
  images: PostImage[];
  onChange: (images: PostImage[]) => void;
  maxImages?: number;
  maxFileSize?: number;
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function PostImageUploader({
  images,
  onChange,
  maxImages = 9,
  maxFileSize = DEFAULT_MAX_FILE_SIZE
}: PostImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return '请选择图片文件';
    }
    if (file.size > maxFileSize) {
      return `图片大小不能超过 ${maxFileSize / 1024 / 1024}MB`;
    }
    return null;
  };

  const uploadImage = useCallback(async (file: File): Promise<PostImage> => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tempImage: PostImage = {
      id: tempId,
      url: URL.createObjectURL(file),
      file,
      uploading: true,
      progress: 0
    };

    onChange([...images, tempImage]);

    try {
      const uploadedFile: any = await fileService.uploadFile(file, null, (progress) => {
        onChange(prev => prev.map(img => 
          img.id === tempId ? { ...img, progress: progress.percentage } : img
        ));
      });

      // 使用后端返回的 URL 进行预览
      const imageUrl = uploadedFile.url || '';
      const finalImage: PostImage = {
        id: uploadedFile.path || tempId,
        url: imageUrl,
        uploading: false,
        progress: 100
      };

      onChange(prev => prev.map(img => 
        img.id === tempId ? finalImage : img
      ));

      return finalImage;
    } catch (error) {
      onChange(prev => prev.map(img => 
        img.id === tempId ? { ...img, uploading: false, error: '上传失败' } : img
      ));
      throw error;
    }
  }, [images, onChange]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      alert(`最多只能上传 ${maxImages} 张图片`);
      return;
    }

    const fileArray = Array.from(files).slice(0, remainingSlots);

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        alert(error);
        continue;
      }
      await uploadImage(file);
    }

    if (event.target) {
      event.target.value = '';
    }
  };

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      return;
    }

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
      await uploadImage(file);
    }
  }, [images.length, maxImages, uploadImage]);

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
    onChange(images.filter(img => img.id !== id));
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
    
    onChange(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const uploadedImages = images.filter(img => !img.uploading && !img.error);
  const canAddMore = uploadedImages.length < maxImages;

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-dark-500">
        <ImageIcon className="w-4 h-4" />
        <span>支持点击上传或 Ctrl+V 粘贴图片</span>
        <span className="text-dark-400">({uploadedImages.length}/{maxImages})</span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((image, index) => (
            <div
              key={image.id || `img-${index}`}
              draggable
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
                    <span className="text-xs text-red-600 mt-1">{image.error}</span>
                  </div>
                </div>
              ) : (
                <>
                  <img
                    src={image.url}
                    alt={`图片 ${index + 1}`}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                  {hoveredIndex === index && (
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
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex items-center gap-2 text-dark-500">
            <Upload className="w-5 h-5" />
            <span className="text-sm">点击上传图片</span>
          </div>
        </label>
      )}
    </div>
  );
}

export type { PostImage };
