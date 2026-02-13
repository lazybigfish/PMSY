import { cn } from '../../lib/utils';
import { getButtonClasses, getSizeClasses, buttonHoverClasses } from '../../lib/interactions';
import type { HoverButtonProps } from '../../lib/interactions';

/**
 * 悬停按钮组件
 * 提供统一的悬停效果：背景加深、上浮、阴影
 */
export function HoverButton({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  className,
}: HoverButtonProps) {
  const buttonClasses = getButtonClasses(variant);
  const sizeClasses = getSizeClasses(size, 'button');

  return (
    <button
      data-testid="hover-button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // 基础样式
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        // 尺寸
        sizeClasses,
        // 按钮变体样式
        buttonClasses,
        // 悬停基础样式
        buttonHoverClasses,
        // 禁用状态
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        // 焦点环颜色
        variant === 'primary' && 'focus:ring-primary-500',
        variant === 'secondary' && 'focus:ring-dark-400',
        variant === 'danger' && 'focus:ring-red-500',
        variant === 'ghost' && 'focus:ring-dark-300',
        className
      )}
    >
      {children}
    </button>
  );
}

/**
 * 图标按钮组件
 * 用于操作按钮（编辑、删除等）
 */
interface IconButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  disabled?: boolean;
  className?: string;
}

export function IconButton({
  icon: Icon,
  onClick,
  variant = 'default',
  size = 'md',
  title,
  disabled = false,
  className,
}: IconButtonProps) {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variantClasses = {
    default: 'text-dark-500 hover:text-dark-700 hover:bg-dark-100',
    danger: 'text-dark-400 hover:text-red-600 hover:bg-red-50',
    primary: 'text-dark-400 hover:text-primary-600 hover:bg-primary-50',
  };

  return (
    <button
      data-testid="icon-button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'rounded-lg transition-all duration-200 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        sizeClasses[size],
        variantClasses[variant],
        'hover:scale-105 active:scale-95',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      <Icon className={iconSizes[size]} />
    </button>
  );
}

/**
 * 幽灵按钮组件
 * 用于次要操作
 */
interface GhostButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function GhostButton({
  children,
  onClick,
  size = 'md',
  disabled = false,
  className,
}: GhostButtonProps) {
  const sizeClasses = getSizeClasses(size, 'button');

  return (
    <button
      data-testid="ghost-button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'text-dark-600 hover:text-dark-800 hover:bg-dark-50',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-dark-300 focus:ring-offset-2',
        'active:scale-95',
        sizeClasses,
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      {children}
    </button>
  );
}

export { type HoverButtonProps };
