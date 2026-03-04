import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, FilePlus, Trash2, Upload, Download, FileText, Loader2, Archive } from 'lucide-react';
import { api } from '../../../lib/api';

interface MilestoneTask {
  id: string;
  milestone_id: string;
  name: string;
  description: string;
  is_required: boolean;
  is_completed: boolean;
  completed_at: string;
  completed_by: string;
  output_documents: { name: string; url?: string; uploaded_at?: string; uploaded_by?: string; required?: boolean }[];
  is_custom?: boolean;
}

interface MilestoneTaskListProps {
  tasks: MilestoneTask[];
  projectName?: string;
  onToggleTask: (task: MilestoneTask) => void;
  onAddDoc: (task: MilestoneTask) => void;
  onRemoveDoc: (task: MilestoneTask, docIndex: number) => void;
  onDeleteTask: (task: MilestoneTask) => void;
  onDeleteDoc?: (task: MilestoneTask, docIndex: number) => void;
  onUploadDoc?: (task: MilestoneTask, docIndex: number, file: File) => Promise<void>;
  onDownloadDoc?: (url: string, filename: string) => void;
  uploadingTaskId?: string | null;
  onTasksChange?: (tasks: MilestoneTask[]) => void;
}

export function MilestoneTaskList({
  tasks,
  projectName = '',
  onToggleTask,
  onAddDoc,
  onRemoveDoc,
  onDeleteTask,
  onDeleteDoc,
  onUploadDoc,
  onDownloadDoc,
  uploadingTaskId,
  onTasksChange
}: MilestoneTaskListProps) {
  const [uploading, setUploading] = useState<{ taskId: string; docIndex: number } | null>(null);
  const [localTasks, setLocalTasks] = useState<MilestoneTask[]>(tasks);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // 同步外部 tasks 变化到本地状态
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleFileUpload = async (task: MilestoneTask, docIndex: number, file: File) => {
    if (!file) return;
    
    setUploading({ taskId: task.id, docIndex });
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${task.id}_${docIndex}_${Date.now()}.${fileExt}`;
      const filePath = `milestone-documents/${fileName}`;

      // Upload file to Storage
      const { data: uploadData, error: uploadError } = await api.storage
        .from('project-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 使用服务器返回的实际路径获取 public URL
      const actualPath = uploadData?.path || filePath;
      const { data: { publicUrl } } = api.storage
        .from('project-documents')
        .getPublicUrl(actualPath);

      // Update task with new document URL
      const docs = [...(task.output_documents || [])];
      docs[docIndex] = {
        ...docs[docIndex],
        url: publicUrl,
        uploaded_at: new Date().toISOString()
      };

      const { error: updateError } = await api.db
        .from('milestone_tasks')
        .update({ output_documents: docs })
        .eq('id', task.id);

      if (updateError) throw updateError;

      // 更新本地状态，而不是全局刷新
      const updatedTasks = localTasks.map(t =>
        t.id === task.id ? { ...t, output_documents: docs } : t
      );
      setLocalTasks(updatedTasks);
      if (onTasksChange) {
        onTasksChange(updatedTasks);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('上传文件失败');
    } finally {
      setUploading(null);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      // 添加 download=true 参数强制下载
      const downloadUrl = url.includes('?') ? `${url}&download=true` : `${url}?download=true`;

      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // 构建下载文件名：原文件名-项目名称.扩展名
      const lastDotIndex = filename.lastIndexOf('.');
      const namePart = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
      const extPart = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
      const downloadFilename = projectName
        ? `${namePart}-${projectName}${extPart}`
        : filename;

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('下载文件失败');
    }
  };

  if (localTasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无任务
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {localTasks.map((task) => (
        <div
          key={task.id}
          className={`border rounded-lg p-4 transition-all ${
            task.is_completed
              ? 'bg-green-50 border-green-200'
              : task.is_required
              ? 'bg-white border-red-200'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={() => onToggleTask(task)}
              className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                task.is_completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-indigo-500'
              }`}
            >
              {task.is_completed && <CheckCircle className="w-3.5 h-3.5" />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={`font-medium ${task.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {task.name}
                </h4>
                {task.is_required && (
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">必填</span>
                )}
                {task.is_custom && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">自定义</span>
                )}
              </div>

              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}

              {/* Output Documents */}
              {task.output_documents && task.output_documents.length > 0 && (
                <div className="mt-3 space-y-2">
                  {task.output_documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700 flex-1 truncate">{doc.name}</span>
                      
                      {/* Upload Button */}
                      <input
                        type="file"
                        ref={(el) => { fileInputRefs[`${task.id}_${idx}`] = el; }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(task, idx, file);
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRefs[`${task.id}_${idx}`]?.click()}
                        disabled={uploading?.taskId === task.id && uploading?.docIndex === idx}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
                        title="上传附件"
                      >
                        {uploading?.taskId === task.id && uploading?.docIndex === idx ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </button>

                      {/* Download Button - only show if document has URL */}
                      {doc.url && (
                        <button
                          onClick={() => handleDownload(doc.url, doc.name)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="下载附件"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete/Clear Attachment Button - only show if document has URL and onDeleteDoc is provided */}
                      {doc.url && onDeleteDoc && (
                        <button
                          onClick={() => onDeleteDoc(task, idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title={'required' in doc ? '清除附件（可重新上传）' : '删除附件'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Remove Document Button - only show if no URL and no required field (custom doc without file) */}
                      {!doc.url && !('required' in doc) && (
                        <button
                          onClick={() => onRemoveDoc(task, idx)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="移除文档"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onAddDoc(task)}
                disabled={uploadingTaskId === task.id}
                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                title="上传附件"
              >
                {uploadingTaskId === task.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FilePlus className="w-4 h-4" />
                )}
              </button>
              {task.is_custom && (
                <button
                  onClick={() => onDeleteTask(task)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除任务"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
