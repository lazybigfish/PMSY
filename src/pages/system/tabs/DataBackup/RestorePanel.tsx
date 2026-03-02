/**
 * 恢复面板组件
 * 上传备份包，预览，选择恢复模式，执行恢复
 */

import React, { useState, useRef } from 'react';
import { Upload, FileArchive, AlertTriangle, CheckCircle, Loader2, Database, FileText } from 'lucide-react';
import { Modal, ConfirmModal } from '@/components/Modal';
import { RestorePreview, RestoreResult, RestoreFormData } from '@/types/backup';
import { formatFileSize, formatDate } from '@/lib/utils';

interface RestorePanelProps {
  onPreview: (file: File) => Promise<RestorePreview>;
  onRestore: (data: RestoreFormData) => Promise<RestoreResult>;
  loading: boolean;
}

export function RestorePanel({ onPreview, onRestore, loading }: RestorePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'full' | 'merge'>('full');
  const [conflictResolution, setConflictResolution] = useState<'skip' | 'overwrite' | 'rename'>('skip');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setError('请选择 ZIP 格式的备份文件');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setPreview(null);
    setPreviewLoading(true);

    try {
      const previewData = await onPreview(file);
      setPreview(previewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '预览备份失败');
      setSelectedFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) return;

    setShowConfirmModal(false);

    try {
      const result = await onRestore({
        file: selectedFile,
        mode: restoreMode,
        conflictResolution,
      });
      setRestoreResult(result);
      setShowResultModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '恢复备份失败');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setRestoreMode('full');
    setConflictResolution('skip');
    setError(null);
    setRestoreResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* 文件上传区域 */}
      {!selectedFile && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">点击或拖拽上传备份文件</p>
          <p className="text-sm text-gray-400">支持 ZIP 格式，最大 5GB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">上传失败</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* 已选择的文件 */}
      {selectedFile && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileArchive className="w-10 h-10 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-red-600 hover:text-red-700"
              disabled={loading}
            >
              重新选择
            </button>
          </div>
        </div>
      )}

      {/* 预览加载中 */}
      {previewLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-500">正在分析备份文件...</span>
        </div>
      )}

      {/* 预览信息 */}
      {preview && (
        <div className="space-y-4">
          {/* 备份信息 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" />
              备份信息
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">备份时间：</span>
                <span className="text-gray-900">{formatDate(preview.manifest.backupAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">应用版本：</span>
                <span className="text-gray-900">{preview.manifest.appVersion}</span>
              </div>
              <div>
                <span className="text-gray-500">数据记录：</span>
                <span className="text-gray-900">{preview.manifest.stats.totalRecords.toLocaleString()} 条</span>
              </div>
              <div>
                <span className="text-gray-500">文件数量：</span>
                <span className="text-gray-900">{preview.manifest.stats.totalFiles} 个</span>
              </div>
            </div>
          </div>

          {/* 警告信息 */}
          {preview.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                警告信息
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {preview.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 冲突信息 */}
          {preview.conflicts.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                数据冲突 ({preview.conflicts.length} 个)
              </h4>
              <p className="text-sm text-orange-700 mb-2">
                备份中的部分数据与现有数据存在冲突，请在下方选择处理方式。
              </p>
            </div>
          )}

          {/* 恢复模式选择 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">恢复模式</h4>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  name="restoreMode"
                  value="full"
                  checked={restoreMode === 'full'}
                  onChange={(e) => setRestoreMode(e.target.value as 'full' | 'merge')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">全量覆盖</p>
                  <p className="text-sm text-gray-500">清空所有现有数据，完全使用备份数据</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  name="restoreMode"
                  value="merge"
                  checked={restoreMode === 'merge'}
                  onChange={(e) => setRestoreMode(e.target.value as 'full' | 'merge')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">增量合并</p>
                  <p className="text-sm text-gray-500">保留现有数据，合并备份中的新数据</p>
                </div>
              </label>
            </div>
          </div>

          {/* 冲突处理（仅在合并模式下显示） */}
          {restoreMode === 'merge' && preview.conflicts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">冲突处理方式</h4>
              <select
                value={conflictResolution}
                onChange={(e) => setConflictResolution(e.target.value as 'skip' | 'overwrite' | 'rename')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="skip">跳过冲突数据（保留现有数据）</option>
                <option value="overwrite">覆盖现有数据（使用备份数据）</option>
                <option value="rename">重命名导入（为新数据生成新ID）</option>
              </select>
            </div>
          )}

          {/* 恢复按钮 */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  恢复中...
                </span>
              ) : (
                '开始恢复'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 确认弹窗 */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleRestore}
        title="确认恢复数据"
        message={
          restoreMode === 'full'
            ? '全量覆盖将清空所有现有数据，此操作不可撤销。是否继续？'
            : '增量合并将合并备份数据到现有系统中，是否继续？'
        }
        confirmText="确认恢复"
        type="danger"
        isLoading={loading}
      />

      {/* 结果弹窗 */}
      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title="恢复结果"
      >
        {restoreResult && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${restoreResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {restoreResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
                <span className={restoreResult.success ? 'text-green-800 font-medium' : 'text-red-800 font-medium'}>
                  {restoreResult.success ? '恢复成功' : '恢复完成（部分失败）'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                导入文件：{restoreResult.importedFiles} 个
              </p>
              <p className="text-sm text-gray-600">
                耗时：{(restoreResult.duration / 1000).toFixed(2)} 秒
              </p>
            </div>

            {restoreResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800 mb-1">错误信息：</p>
                <ul className="text-sm text-red-600 space-y-1">
                  {restoreResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {restoreResult.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-800 mb-1">警告信息：</p>
                <ul className="text-sm text-yellow-600 space-y-1">
                  {restoreResult.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowResultModal(false);
                  handleReset();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确定
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
