import React, { useState } from 'react';
import { PlayCircle, CheckCircle2, PauseCircle, XCircle, Circle, Loader2 } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { TaskStatus } from '../../../types';

interface BatchStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskCount: number;
  onConfirm: (status: TaskStatus) => Promise<void>;
}

const statusOptions: { value: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'todo',
    label: '待办',
    icon: <Circle className="w-5 h-5" />,
    color: 'bg-dark-100 text-dark-600',
  },
  {
    value: 'in_progress',
    label: '进行中',
    icon: <PlayCircle className="w-5 h-5" />,
    color: 'bg-primary-100 text-primary-600',
  },
  {
    value: 'paused',
    label: '已暂停',
    icon: <PauseCircle className="w-5 h-5" />,
    color: 'bg-yellow-100 text-yellow-600',
  },
  {
    value: 'done',
    label: '已完成',
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: 'bg-mint-100 text-mint-600',
  },
  {
    value: 'canceled',
    label: '已取消',
    icon: <XCircle className="w-5 h-5" />,
    color: 'bg-red-100 text-red-600',
  },
];

export const BatchStatusModal: React.FC<BatchStatusModalProps> = ({
  isOpen,
  onClose,
  taskCount,
  onConfirm,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleConfirm = async () => {
    if (!selectedStatus) return;
    setIsUpdating(true);
    try {
      await onConfirm(selectedStatus);
      onClose();
    } catch (error) {
      console.error('批量修改状态失败:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="p-6">
        {/* 标题 */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-dark-900 mb-1">批量修改状态</h3>
          <p className="text-sm text-dark-500">
            将选中的 <span className="font-bold text-primary-600">{taskCount}</span> 个任务修改为以下状态
          </p>
        </div>

        {/* 状态选项 */}
        <div className="space-y-2 mb-6">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                selectedStatus === option.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-dark-100 hover:border-dark-200 hover:bg-dark-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg ${option.color} flex items-center justify-center`}>
                {option.icon}
              </div>
              <span className="font-medium text-dark-700">{option.label}</span>
              {selectedStatus === option.value && (
                <div className="ml-auto w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* 按钮 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 rounded-xl text-dark-700 font-medium hover:bg-dark-100 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedStatus || isUpdating}
            className="px-4 py-2 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>更新中...</span>
              </>
            ) : (
              <span>确认修改</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
