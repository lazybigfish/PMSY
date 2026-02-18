import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTouchFeedback } from '../../../hooks/useTouchFeedback';

export interface BottomNavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeIcon?: React.ComponentType<{ className?: string }>;
  badge?: number;
  onPress?: () => void;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  items,
  activeKey,
  onChange,
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // 当活动项改变时，滚动到可见区域
  useEffect(() => {
    if (activeItemRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const activeItem = activeItemRef.current;
      const containerRect = container.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();

      // 计算活动项是否在可视区域内
      const isVisible = itemRect.left >= containerRect.left && itemRect.right <= containerRect.right;

      if (!isVisible) {
        // 滚动到活动项居中
        const scrollLeft = activeItem.offsetLeft - containerRect.width / 2 + itemRect.width / 2;
        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth',
        });
      }
    }
  }, [activeKey]);

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-900 border-t border-dark-100 dark:border-dark-800 safe-area-bottom z-50 ${className}`}
      style={{
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div
        ref={scrollRef}
        className="flex items-center h-16 overflow-x-auto scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {items.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            isActive={activeKey === item.key}
            isCurrent={activeKey === item.key}
            itemRef={activeKey === item.key ? activeItemRef : undefined}
            onPress={() => {
              item.onPress?.();
              onChange(item.key);
            }}
          />
        ))}
      </div>
    </nav>
  );
};

interface NavItemProps {
  item: BottomNavItem;
  isActive: boolean;
  isCurrent: boolean;
  itemRef?: React.RefObject<HTMLButtonElement | null>;
  onPress: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ item, isActive, isCurrent, itemRef, onPress }) => {
  const { handlers, style: feedbackStyle } = useTouchFeedback({
    feedback: 'scale',
    scale: 0.9,
  });

  const Icon = isActive && item.activeIcon ? item.activeIcon : item.icon;

  return (
    <button
      ref={itemRef}
      onClick={onPress}
      className="relative flex flex-col items-center justify-center h-full min-w-[72px] px-3 touch-manipulation no-tap-highlight shrink-0"
      style={{
        ...feedbackStyle,
        scrollSnapAlign: 'center',
      }}
      {...handlers}
    >
      <div className="relative">
        <Icon
          className={`w-6 h-6 transition-colors duration-200 ${
            isActive
              ? 'text-primary-500'
              : 'text-dark-400 dark:text-dark-500'
          }`}
        />
        {item.badge !== undefined && item.badge > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium text-white bg-red-500 rounded-full">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </div>
      <span
        className={`mt-1 text-xs transition-colors duration-200 whitespace-nowrap ${
          isActive
            ? 'text-primary-500 font-medium'
            : 'text-dark-400 dark:text-dark-500'
        }`}
      >
        {item.label}
      </span>
      {isCurrent && (
        <motion.div
          layoutId="activeTab"
          className="absolute top-0 w-12 h-0.5 bg-primary-500 rounded-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
};
