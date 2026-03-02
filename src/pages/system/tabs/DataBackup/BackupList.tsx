/**
 * 备份列表组件
 * 显示备份历史记录，支持下载和删除
 */

import React from 'react';
import { Download, Trash2, AlertCircle, CheckCircle, Loader2, HardDrive } from 'lucide-react';
import { BackupRecord } from '@/types/backup';
import { formatFileSize, formatDate } from '@/lib/utils';

interface BackupListProps {
  backups: BackupRecord[];
  loading: boolean;
  onDownload: (backup: BackupRecord) => void;
  onDelete: (backup: BackupRecord) => void;
}

export function BackupList({ backups, loading, onDownload, onDelete }: BackupListProps) {
  const getStatusIcon = (status: BackupRecord['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: BackupRecord['status']) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'processing':
        return '处理中';
      case 'failed':
        return '失败';
      default:
        return '未知';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-2 text-gray-500">加载中...</span>
      </div>
    );
  }

  if (backups.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <HardDrive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">暂无备份记录</p>
        <p className="text-sm text-gray-400 mt-1">点击上方「创建备份」按钮开始备份</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">状态</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">备份名称</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">数据量</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">文件大小</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">创建时间</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">操作</th>
          </tr>
        </thead>
        <tbody>
          {backups.map((backup) => (
            <tr key={backup.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(backup.status)}
                  <span className={`text-sm ${
                    backup.status === 'completed' ? 'text-green-600' :
                    backup.status === 'processing' ? 'text-blue-600' :
                    backup.status === 'failed' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {getStatusText(backup.status)}
                  </span>
                </div>
                {backup.status === 'failed' && backup.errorMessage && (
                  <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={backup.errorMessage}>
                    {backup.errorMessage}
                  </p>
                )}
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{backup.name}</p>
                  {backup.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{backup.description}</p>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-600">
                  {backup.manifest?.stats?.totalRecords?.toLocaleString() || '-'} 条记录
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-600">
                  {formatFileSize(backup.fileSize)}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-600">
                  {formatDate(backup.createdAt)}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {backup.status === 'completed' && (
                    <button
                      onClick={() => onDownload(backup)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="下载备份"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(backup)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除备份"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
