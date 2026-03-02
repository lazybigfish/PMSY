/**
 * 创建备份弹窗组件
 * 填写备份名称、描述，选择备份选项
 */

import React, { useState } from 'react';
import { ModalForm } from '@/components/Modal';
import { CreateBackupFormData } from '@/types/backup';

interface CreateBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: CreateBackupFormData) => Promise<void>;
  loading: boolean;
}

export function CreateBackupModal({ isOpen, onClose, onConfirm, loading }: CreateBackupModalProps) {
  const [formData, setFormData] = useState<CreateBackupFormData>({
    name: '',
    description: '',
    includeLogs: false,
    includeNotifications: false,
    includeForum: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(formData);
    // 成功后重置表单
    setFormData({
      name: '',
      description: '',
      includeLogs: false,
      includeNotifications: false,
      includeForum: false,
    });
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={handleClose}
      title="创建数据备份"
      onSubmit={handleSubmit}
      submitText="开始备份"
      isSubmitting={loading}
      submitDisabled={!formData.name.trim()}
    >
      <div className="space-y-4">
        {/* 备份名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            备份名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="请输入备份名称"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        {/* 备份描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            备份描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="可选：添加备份描述"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={loading}
          />
        </div>

        {/* 备份选项 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            备份选项
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includeLogs}
                onChange={(e) => setFormData({ ...formData, includeLogs: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-600">包含操作日志</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includeNotifications}
                onChange={(e) => setFormData({ ...formData, includeNotifications: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-600">包含通知记录</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includeForum}
                onChange={(e) => setFormData({ ...formData, includeForum: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-gray-600">包含论坛数据</span>
            </label>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            备份将包含所有核心数据：用户、项目、任务、客户、供应商、文件等。
            备份过程可能需要几分钟，请耐心等待。
          </p>
        </div>
      </div>
    </ModalForm>
  );
}
