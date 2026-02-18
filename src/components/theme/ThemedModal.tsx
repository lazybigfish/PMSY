import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X } from 'lucide-react';

interface ThemedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  footer?: React.ReactNode;
}

export const ThemedModal: React.FC<ThemedModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  footer,
}) => {
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  if (!isOpen) return null;

  // 主题特定的样式
  const getModalStyles = () => {
    switch (themeConfig.name) {
      case 'V1 经典版':
        return {
          overlay: isDark ? 'bg-black/60' : 'bg-black/40',
          overlayGradient: 'radial-gradient(circle at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)',
          content: 'bg-white rounded-2xl shadow-2xl border border-orange-100',
          header: 'border-b border-orange-100',
          title: 'text-gray-800',
          closeButton: 'text-gray-400 hover:text-orange-500 hover:bg-orange-50',
        };
      case 'V2 科技版':
        return {
          overlay: isDark ? 'bg-black/80' : 'bg-black/60',
          overlayGradient: 'radial-gradient(circle at center, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 40%, transparent 70%)',
          content: `rounded-xl border ${isDark ? 'bg-gray-900/95 border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)]' : 'bg-white border-gray-200 shadow-2xl'}`,
          header: `border-b ${isDark ? 'border-cyan-500/20' : 'border-gray-200'}`,
          title: isDark ? 'text-cyan-400 font-mono' : 'text-gray-800',
          closeButton: isDark
            ? 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
        };
      case 'V3 时尚版':
        return {
          overlay: isDark ? 'bg-black/50' : 'bg-black/30',
          overlayGradient: 'radial-gradient(circle at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 40%, transparent 70%)',
          content: 'bg-white/90 backdrop-blur-xl rounded-3xl border border-white/50 shadow-[0_8px_32px_rgba(31,38,135,0.15)]',
          header: 'border-b border-blue-100/50',
          title: 'text-gray-800 font-medium',
          closeButton: 'text-gray-400 hover:text-blue-500 hover:bg-blue-50/50',
        };
      default:
        return {
          overlay: isDark ? 'bg-black/70' : 'bg-black/50',
          overlayGradient: 'radial-gradient(circle at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)',
          content: 'bg-white rounded-lg shadow-xl',
          header: 'border-b border-gray-200',
          title: 'text-gray-800',
          closeButton: 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
        };
    }
  };

  const styles = getModalStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩层 - 层叠淡化效果 */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${styles.overlay}`}
        style={{
          background: styles.overlayGradient,
        }}
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div
        className={`relative w-full ${sizeClasses[size]} transform transition-all duration-300 scale-100 ${styles.content}`}
        style={{
          animation: 'modalEnter 0.3s ease-out',
        }}
      >
        {/* 头部 */}
        {(title || showCloseButton) && (
          <div className={`flex items-center justify-between px-6 py-4 ${styles.header}`}>
            {title && (
              <h3 className={`text-lg ${styles.title}`}>
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={`p-1 rounded-lg transition-all duration-200 ${styles.closeButton}`}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* 内容区域 */}
        <div className="px-6 py-4">
          {children}
        </div>

        {/* 底部 */}
        {footer && (
          <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
            themeConfig.name === 'V1 经典版' ? 'border-orange-100' :
            themeConfig.name === 'V2 科技版' ? (isDark ? 'border-cyan-500/20' : 'border-gray-200') :
            'border-blue-100/50'
          }`}>
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

// 确认弹窗组件
interface ThemedConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'success' | 'warning' | 'danger';
}

export const ThemedConfirmModal: React.FC<ThemedConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  type = 'info',
}) => {
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'text-emerald-500',
          iconBg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
        };
      case 'warning':
        return {
          icon: 'text-amber-500',
          iconBg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
        };
      case 'danger':
        return {
          icon: 'text-red-500',
          iconBg: isDark ? 'bg-red-500/10' : 'bg-red-50',
        };
      default:
        return {
          icon: isDark ? 'text-cyan-400' : `text-[${colors.primary[500]}]`,
          iconBg: isDark ? 'bg-cyan-500/10' : `bg-[${colors.primary[50]}]`,
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <ThemedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <ThemedButton variant="secondary" onClick={onClose}>
            {cancelText}
          </ThemedButton>
          <ThemedButton
            variant={type === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmText}
          </ThemedButton>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${typeStyles.iconBg}`}>
          <span className={`text-2xl ${typeStyles.icon}`}>
            {type === 'success' && '✓'}
            {type === 'warning' && '!'}
            {type === 'danger' && '✕'}
            {type === 'info' && '?'}
          </span>
        </div>
        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {message}
        </p>
      </div>
    </ThemedModal>
  );
};

import { ThemedButton } from './ThemedButton';
