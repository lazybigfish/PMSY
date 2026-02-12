import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Attachment {
  id?: string;
  file: File;
  file_name: string;
  file_url?: string;
  file_type: string;
  file_size: number;
  uploading?: boolean;
}

interface TaskProgressUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (progress: number, content: string, attachments: Attachment[]) => Promise<void>;
  currentProgress: number;
  taskTitle: string;
}

const PROGRESS_OPTIONS = [
  { value: 0, label: '0% - 未开始' },
  { value: 25, label: '25% - 刚开始' },
  { value: 50, label: '50% - 进行中' },
  { value: 75, label: '75% - 即将完成' },
  { value: 100, label: '100% - 已完成' }
];

export function TaskProgressUpdateModal({
  isOpen,
  onClose,
  onSubmit,
  currentProgress,
  taskTitle
}: TaskProgressUpdateModalProps) {
  const [progress, setProgress] = useState(currentProgress);
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      file,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      uploading: false
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (): Promise<Attachment[]> => {
    const uploadedAttachments: Attachment[] = [];

    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i];
      if (attachment.file_url) {
        // 已经上传过了
        uploadedAttachments.push(attachment);
        continue;
      }

      try {
        setAttachments(prev => prev.map((a, idx) => 
          idx === i ? { ...a, uploading: true } : a
        ));

        const fileExt = attachment.file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `task-progress/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(filePath, attachment.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('task-attachments')
          .getPublicUrl(filePath);

        uploadedAttachments.push({
          ...attachment,
          file_url: publicUrl,
          uploading: false
        });

        setAttachments(prev => prev.map((a, idx) => 
          idx === i ? { ...a, file_url: publicUrl, uploading: false } : a
        ));
      } catch (error) {
        console.error('Upload error:', error);
        setAttachments(prev => prev.map((a, idx) => 
          idx === i ? { ...a, uploading: false } : a
        ));
        throw new Error(`上传文件 ${attachment.file_name} 失败`);
      }
    }

    return uploadedAttachments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      // 先上传附件
      const uploadedAttachments = await uploadAttachments();
      
      // 提交进度更新
      await onSubmit(progress, content, uploadedAttachments);
      
      // 重置表单
      setProgress(currentProgress);
      setContent('');
      setAttachments([]);
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
      alert('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-100">
          <div>
            <h3 className="text-lg font-display font-bold text-dark-900">更新进度</h3>
            <p className="text-sm text-dark-500 mt-0.5">{taskTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-100 rounded-xl transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-dark-500" />
          </button>
        </div>

        {/* Current Progress */}
        <div className="px-6 py-3 bg-dark-50 border-b border-dark-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-dark-500">当前进度</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-dark-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
              <span className="font-semibold text-dark-700">{currentProgress}%</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Progress Select */}
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-2">
              更新进度 <span className="text-red-500">*</span>
            </label>
            <select
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full"
              disabled={isSubmitting}
            >
              {PROGRESS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content Textarea */}
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-2">
              更新内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="描述本次更新的工作内容、进展情况..."
              rows={4}
              className="input resize-none"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-2">
              成果附件
            </label>
            
            {/* Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="w-full py-3 border-2 border-dashed border-dark-200 rounded-xl text-dark-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all flex flex-col items-center gap-2"
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm">点击上传或拖拽文件到此处</span>
              <span className="text-xs text-dark-400">支持文档、图片等格式</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isSubmitting}
            />

            {/* Attachment List */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-dark-50 rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-900 truncate">
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-dark-500">
                        {formatFileSize(attachment.file_size)}
                        {attachment.uploading && (
                          <span className="ml-2 text-primary-600">上传中...</span>
                        )}
                        {attachment.file_url && (
                          <span className="ml-2 text-mint-600">已上传</span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      disabled={isSubmitting || attachment.uploading}
                      className="p-1.5 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="btn-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  提交中...
                </>
              ) : (
                '提交更新'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
