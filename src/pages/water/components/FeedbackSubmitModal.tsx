/**
 * 提交反馈弹窗组件
 */

import React, { useState } from 'react';
import { ModalForm } from '../../../components/Modal';
import { useCreateFeedback } from '../../../hooks/useFeedback';
import {
  FeedbackType,
  FeedbackTypeLabels,
  CreateFeedbackRequest,
} from '../../../types/feedback';

interface FeedbackSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function FeedbackSubmitModal({
  isOpen,
  onClose,
  onSuccess,
}: FeedbackSubmitModalProps) {
  const [formData, setFormData] = useState<CreateFeedbackRequest>({
    title: '',
    content: '',
    type: 'bug',
    images: [],
  });

  const { createFeedback, loading } = useCreateFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      return;
    }

    try {
      await createFeedback({
        ...formData,
        images: [],
      });
      onSuccess?.();
      handleClose();
    } catch (err) {
      // 错误已在 hook 中处理
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      content: '',
      type: 'bug',
      images: [],
    });
    onClose();
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={handleClose}
      title="提交反馈"
      onSubmit={handleSubmit}
      submitText="提交"
      isSubmitting={loading}
      submitDisabled={!formData.title.trim() || !formData.content.trim()}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* 反馈类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            反馈类型 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value as FeedbackType })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(FeedbackTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="简要描述你的反馈"
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 详细描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            详细描述 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            rows={4}
            placeholder="请详细描述问题或需求，如果是Bug请提供复现步骤..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

      </div>
    </ModalForm>
  );
}
