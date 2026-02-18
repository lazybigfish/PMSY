import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: 'auto' | 'full' | number;
  showHandle?: boolean;
  showCloseButton?: boolean;
  onBackdropPress?: () => void;
  gestureEnabled?: boolean;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
  showHandle = true,
  showCloseButton = true,
  onBackdropPress,
  gestureEnabled = true,
  className = '',
}) => {
  const handleBackdropClick = useCallback(() => {
    onBackdropPress?.();
    onClose();
  }, [onBackdropPress, onClose]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onClose();
      }
    },
    [onClose]
  );

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const getHeight = () => {
    if (height === 'full') return '90vh';
    if (height === 'auto') return 'auto';
    return `${height}px`;
  };

  const getMaxHeight = () => {
    if (height === 'full') return '90vh';
    return '85vh';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleBackdropClick}
          />

          {/* 底部面板 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag={gestureEnabled ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-900 rounded-t-2xl shadow-2xl safe-area-bottom ${className}`}
            style={{
              height: getHeight(),
              maxHeight: getMaxHeight(),
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)',
            }}
          >
            {/* 拖动把手 */}
            {showHandle && (
              <div className="w-full flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-dark-300 dark:bg-dark-600 rounded-full" />
              </div>
            )}

            {/* 头部 */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-dark-100 dark:border-dark-800">
                {title && (
                  <h3 className="text-lg font-semibold text-dark-900 dark:text-dark-100">
                    {title}
                  </h3>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors min-w-touch min-h-touch flex items-center justify-center"
                    aria-label="关闭"
                  >
                    <X className="w-5 h-5 text-dark-500" />
                  </button>
                )}
              </div>
            )}

            {/* 内容区域 */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 60px)' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
