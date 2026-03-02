/**
 * 定时备份设置组件
 * 启用/禁用定时备份，设置备份时间
 */

import React, { useState, useEffect } from 'react';
import { Clock, Save, AlertCircle, Loader2 } from 'lucide-react';
import { BackupScheduleConfig } from '@/types/backup';

interface ScheduleSettingsProps {
  config: BackupScheduleConfig | null;
  onSave: (config: BackupScheduleConfig) => Promise<void>;
  loading: boolean;
}

// 预设的备份时间选项
const PRESET_TIMES = [
  { label: '每天凌晨 2:00', cron: '0 2 * * *' },
  { label: '每天凌晨 3:00', cron: '0 3 * * *' },
  { label: '每天凌晨 4:00', cron: '0 4 * * *' },
  { label: '每周一凌晨 2:00', cron: '0 2 * * 1' },
  { label: '每周日凌晨 2:00', cron: '0 2 * * 0' },
  { label: '每月1日凌晨 2:00', cron: '0 2 1 * *' },
];

export function ScheduleSettings({ config, onSave, loading }: ScheduleSettingsProps) {
  const [formData, setFormData] = useState<BackupScheduleConfig>({
    enabled: false,
    cron: '0 2 * * *',
    timeZone: 'Asia/Shanghai',
    keepCount: 10,
    options: {
      includeLogs: false,
      includeNotifications: false,
      includeForum: false,
      encrypt: false,
    },
  });
  const [saved, setSaved] = useState(false);

  // 当配置加载时更新表单
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSave = async () => {
    await onSave(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isPresetTime = PRESET_TIMES.some(p => p.cron === formData.cron);

  return (
    <div className="space-y-6">
      {/* 启用/禁用开关 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-500" />
            <div>
              <h4 className="font-medium text-gray-900">定时备份</h4>
              <p className="text-sm text-gray-500">自动按计划执行数据备份</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="sr-only peer"
              disabled={loading}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {formData.enabled && (
        <>
          {/* 备份时间设置 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">备份时间</h4>
            <div className="space-y-3">
              {PRESET_TIMES.map((preset) => (
                <label
                  key={preset.cron}
                  className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="backupTime"
                    value={preset.cron}
                    checked={formData.cron === preset.cron}
                    onChange={(e) => setFormData({ ...formData, cron: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-700">{preset.label}</span>
                </label>
              ))}
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                <input
                  type="radio"
                  name="backupTime"
                  value="custom"
                  checked={!isPresetTime}
                  onChange={() => setFormData({ ...formData, cron: '0 2 * * *' })}
                  className="w-4 h-4 text-blue-600"
                  disabled={loading}
                />
                <span className="text-sm text-gray-700">自定义</span>
              </label>
              {!isPresetTime && (
                <input
                  type="text"
                  value={formData.cron}
                  onChange={(e) => setFormData({ ...formData, cron: e.target.value })}
                  placeholder="Cron 表达式，如：0 2 * * *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={loading}
                />
              )}
            </div>
          </div>

          {/* 保留数量设置 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">保留数量</h4>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="50"
                value={formData.keepCount}
                onChange={(e) => setFormData({ ...formData, keepCount: parseInt(e.target.value) })}
                className="flex-1"
                disabled={loading}
              />
              <span className="text-sm font-medium text-gray-700 w-12 text-right">
                {formData.keepCount}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              自动保留最近的 {formData.keepCount} 个备份，超出后自动删除最旧的备份
            </p>
          </div>

          {/* 备份选项 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">备份选项</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.options.includeLogs}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      options: { ...formData.options, includeLogs: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                  disabled={loading}
                />
                <span className="text-sm text-gray-600">包含操作日志</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.options.includeNotifications}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      options: { ...formData.options, includeNotifications: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                  disabled={loading}
                />
                <span className="text-sm text-gray-600">包含通知记录</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.options.includeForum}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      options: { ...formData.options, includeForum: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                  disabled={loading}
                />
                <span className="text-sm text-gray-600">包含论坛数据</span>
              </label>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-700">
                定时备份将在设定的时间自动执行，备份文件将保存在服务器上。
                建议定期检查备份状态，确保备份正常执行。
              </p>
            </div>
          </div>
        </>
      )}

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              保存中...
            </>
          ) : saved ? (
            <>
              <Save className="w-4 h-4" />
              已保存
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              保存设置
            </>
          )}
        </button>
      </div>
    </div>
  );
}
