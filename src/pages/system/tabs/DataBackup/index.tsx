/**
 * 数据备份主组件
 * 整合备份列表、恢复面板、定时设置
 */

import React, { useState, useEffect } from 'react';
import { HardDrive, Upload, Clock, Plus, Loader2 } from 'lucide-react';
import { BackupList } from './BackupList';
import { CreateBackupModal } from './CreateBackupModal';
import { RestorePanel } from './RestorePanel';
import { ScheduleSettings } from './ScheduleSettings';
import { ConfirmModal } from '@/components/Modal';
import { backupApi } from '@/services/backupApi';
import { BackupRecord, BackupScheduleConfig, CreateBackupFormData } from '@/types/backup';
type TabType = 'backup' | 'restore' | 'schedule';

export default function DataBackup() {
  const [activeTab, setActiveTab] = useState<TabType>('backup');
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState<BackupScheduleConfig | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [deleteBackup, setDeleteBackup] = useState<BackupRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 加载备份列表
  const fetchBackups = async () => {
    setLoading(true);
    try {
      const data = await backupApi.getBackupList();
      setBackups(data);
    } catch (error) {
      alert('获取备份列表失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 加载定时备份配置
  const fetchScheduleConfig = async () => {
    try {
      const config = await backupApi.getBackupSchedule();
      setScheduleConfig(config);
    } catch (error) {
      alert('获取定时备份配置失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchScheduleConfig();
  }, []);

  // 创建备份
  const handleCreateBackup = async (data: CreateBackupFormData) => {
    setCreateLoading(true);
    try {
      await backupApi.createBackup(data);
      alert('备份任务已创建');
      setCreateModalOpen(false);
      // 刷新列表
      setTimeout(() => fetchBackups(), 1000);
    } catch (error) {
      alert('创建备份失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setCreateLoading(false);
    }
  };

  // 下载备份
  const handleDownload = async (backup: BackupRecord) => {
    try {
      const blob = await backupApi.downloadBackup(backup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.filePath;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert('备份下载已开始');
    } catch (error) {
      alert('下载备份失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 删除备份
  const handleDelete = async () => {
    if (!deleteBackup) return;
    setDeleteLoading(true);
    try {
      await backupApi.deleteBackup(deleteBackup.id);
      alert('备份已删除');
      setDeleteBackup(null);
      fetchBackups();
    } catch (error) {
      alert('删除备份失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setDeleteLoading(false);
    }
  };

  // 预览恢复
  const handlePreviewRestore = async (file: File) => {
    return await backupApi.previewRestore(file);
  };

  // 执行恢复
  const handleRestore = async (data: { file: File; mode: 'full' | 'merge'; conflictResolution: 'skip' | 'overwrite' | 'rename' }) => {
    return await backupApi.restoreBackup(data.file, data.mode, data.conflictResolution);
  };

  // 保存定时备份配置
  const handleSaveSchedule = async (config: BackupScheduleConfig) => {
    setScheduleLoading(true);
    try {
      await backupApi.updateBackupSchedule(config);
      alert('定时备份配置已保存');
      fetchScheduleConfig();
    } catch (error) {
      alert('保存配置失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setScheduleLoading(false);
    }
  };

  const tabs = [
    { id: 'backup' as TabType, label: '备份管理', icon: HardDrive },
    { id: 'restore' as TabType, label: '数据恢复', icon: Upload },
    { id: 'schedule' as TabType, label: '定时备份', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* 标签页导航 */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 备份管理 */}
      {activeTab === 'backup' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">备份列表</h3>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              创建备份
            </button>
          </div>
          <BackupList
            backups={backups}
            loading={loading}
            onDownload={handleDownload}
            onDelete={setDeleteBackup}
          />
        </div>
      )}

      {/* 数据恢复 */}
      {activeTab === 'restore' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-1">注意事项</h3>
            <p className="text-sm text-yellow-700">
              数据恢复将修改系统中的数据，请在操作前确保已备份当前数据。
              建议先在测试环境验证备份文件的完整性。
            </p>
          </div>
          <RestorePanel
            onPreview={handlePreviewRestore}
            onRestore={handleRestore}
            loading={false}
          />
        </div>
      )}

      {/* 定时备份 */}
      {activeTab === 'schedule' && (
        <ScheduleSettings
          config={scheduleConfig}
          onSave={handleSaveSchedule}
          loading={scheduleLoading}
        />
      )}

      {/* 创建备份弹窗 */}
      <CreateBackupModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onConfirm={handleCreateBackup}
        loading={createLoading}
      />

      {/* 删除确认弹窗 */}
      <ConfirmModal
        isOpen={!!deleteBackup}
        onClose={() => setDeleteBackup(null)}
        onConfirm={handleDelete}
        title="确认删除备份"
        message={`确定要删除备份 "${deleteBackup?.name}" 吗？此操作不可撤销。`}
        confirmText="删除"
        type="danger"
        isLoading={deleteLoading}
      />
    </div>
  );
}
