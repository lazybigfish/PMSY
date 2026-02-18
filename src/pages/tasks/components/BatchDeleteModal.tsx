import React, { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { Modal } from '../../../components/Modal';

interface BatchDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskCount: number;
  onConfirm: () => Promise<void>;
}

export const BatchDeleteModal: React.FC<BatchDeleteModalProps> = ({
  isOpen,
  onClose,
  taskCount,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('批量删除失败:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="p-6">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-dark-900">确认批量删除</h3>
            <p className="text-sm text-dark-500">此操作不可撤销</p>
          </div>
        </div>

        {/* 内容 */}
        <div className="mb-6">
          <p className="text-dark-700 mb-2">
            您确定要删除选中的 <span className="font-bold text-red-600">{taskCount}</span> 个任务吗？
          </p>
          <p className="text-sm text-dark-500">
            删除后，任务及其所有关联数据（评论、进度记录等）都将被永久删除。
          </p>
        </div>

        {/* 按钮 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-dark-700 font-medium hover:bg-dark-100 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>删除中...</span>
              </>
            ) : (
              <span>确认删除</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
