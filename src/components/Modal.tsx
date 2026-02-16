import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  showCloseButton?: boolean;
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

/**
 * 统一弹框组件
 *
 * ⚠️ CODE REVIEW 注意：新增弹窗必须使用此组件，禁止独立实现遮罩层！
 * ❌ 禁止：<div className="fixed inset-0 bg-black/50">...</div>
 * ✅ 正确：<Modal isOpen={isOpen} onClose={handleClose}>...</Modal>
 *
 * 标准样式：
 * - 背景：径向渐变效果，从弹窗中心向外淡化至透明
 * - 层级：z-[100]（覆盖导航栏）
 * - 位置：固定全屏覆盖 (fixed inset-0)
 * - 动画：淡入效果 (animate-fade-in)
 * - 内容区：白色圆角卡片，最大高度限制，支持滚动
 * - 交互：点击背景关闭弹窗
 *
 * @see 使用规范文档：.agent/records/2026-02-15/弹窗使用规范.md
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
  showCloseButton = true,
  className = '',
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{
        background: `radial-gradient(circle at center, 
          rgba(0,0,0,0.5) 0%, 
          rgba(0,0,0,0.35) 15%, 
          rgba(0,0,0,0.2) 30%, 
          rgba(0,0,0,0.05) 50%,
          transparent 70%
        )`,
      }}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl ${maxWidthClasses[maxWidth]} w-full shadow-2xl animate-scale-in max-h-[90vh] overflow-hidden flex flex-col ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-100">
            {title && (
              <h3 className="text-lg font-semibold text-dark-900">{title}</h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-dark-100 rounded-full transition-colors ml-auto"
              >
                <X className="w-5 h-5 text-dark-500" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ModalFormProps extends ModalProps {
  onSubmit: (e: React.FormEvent) => void;
  submitText?: string;
  cancelText?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
}

/**
 * 带表单提交的弹框组件
 */
export function ModalForm({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = '确认',
  cancelText = '取消',
  isSubmitting = false,
  submitDisabled = false,
  maxWidth = 'lg',
  showCloseButton = true,
  className = '',
}: ModalFormProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{
        background: `radial-gradient(circle at center, 
          rgba(0,0,0,0.5) 0%, 
          rgba(0,0,0,0.35) 15%, 
          rgba(0,0,0,0.2) 30%, 
          rgba(0,0,0,0.05) 50%,
          transparent 70%
        )`,
      }}
      onClick={onClose}
    >
      <form
        className={`bg-white rounded-2xl ${maxWidthClasses[maxWidth]} w-full shadow-2xl animate-scale-in max-h-[90vh] overflow-hidden flex flex-col ${className}`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-100">
            {title && (
              <h3 className="text-lg font-semibold text-dark-900">{title}</h3>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-dark-100 rounded-full transition-colors ml-auto"
              >
                <X className="w-5 h-5 text-dark-500" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-100 bg-dark-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-dark-700 hover:bg-dark-100 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            disabled={submitDisabled || isSubmitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '提交中...' : submitText}
          </button>
        </div>
      </form>
    </div>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  type?: 'danger' | 'warning' | 'info';
}

/**
 * 确认弹框组件
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  isLoading = false,
  type = 'warning',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const typeStyles = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-sun-600 hover:bg-sun-700',
    info: 'bg-primary-600 hover:bg-primary-700',
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{
        background: `radial-gradient(circle at center, 
          rgba(0,0,0,0.5) 0%, 
          rgba(0,0,0,0.35) 15%, 
          rgba(0,0,0,0.2) 30%, 
          rgba(0,0,0,0.05) 50%,
          transparent 70%
        )`,
      }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-dark-900 mb-2">{title}</h3>
        <p className="text-dark-600 mb-6">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-dark-700 hover:bg-dark-100 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${typeStyles[type]}`}
          >
            {isLoading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
