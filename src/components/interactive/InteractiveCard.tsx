import { cn } from '../../lib/utils';
import { getThemeClasses, cardHoverClasses } from '../../lib/interactions';
import type { InteractiveCardProps, ThemeColor } from '../../lib/interactions';

/**
 * 交互卡片组件
 * 提供统一的悬停效果：上浮、阴影、边框变色
 */
export function InteractiveCard({
  children,
  theme = 'primary',
  clickable = true,
  onClick,
  className,
  showIndicator = false,
}: InteractiveCardProps) {
  const themeClasses = getThemeClasses(theme);

  return (
    <div
      data-testid="interactive-card"
      onClick={onClick}
      className={cn(
        // 基础样式
        'rounded-xl border border-dark-200 bg-white',
        // 悬停效果
        cardHoverClasses,
        themeClasses.hoverBorder,
        // 点击状态
        clickable && 'cursor-pointer active:scale-[0.99]',
        // 左侧指示条
        showIndicator && [
          'relative',
          'before:absolute before:left-0 before:top-0 before:bottom-0',
          'before:w-0 before:rounded-l-xl',
          'before:transition-all before:duration-200',
          `hover:before:w-1 ${themeClasses.indicator}`,
        ],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * 简洁版交互卡片（无主题边框效果）
 */
export function SimpleCard({
  children,
  clickable = true,
  onClick,
  className,
}: Omit<InteractiveCardProps, 'theme' | 'showIndicator'>) {
  return (
    <div
      data-testid="simple-card"
      onClick={onClick}
      className={cn(
        'rounded-xl border border-dark-200 bg-white',
        'hover:-translate-y-0.5 hover:shadow-lg hover:border-dark-300',
        'transition-all duration-200 ease-out',
        clickable && 'cursor-pointer active:scale-[0.99]',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * 列表项卡片
 * 用于帖子列表、任务列表等
 */
export function ListCard({
  children,
  theme = 'primary',
  clickable = true,
  onClick,
  className,
}: InteractiveCardProps) {
  const themeClasses = getThemeClasses(theme);

  return (
    <div
      data-testid="list-card"
      onClick={onClick}
      className={cn(
        // 基础样式
        'rounded-xl border border-dark-200 bg-white p-5',
        // 悬停效果
        'hover:-translate-y-0.5 hover:shadow-lg',
        themeClasses.hoverBorder,
        'transition-all duration-200 ease-out',
        // 点击状态
        clickable && 'cursor-pointer active:scale-[0.99]',
        className
      )}
    >
      {children}
    </div>
  );
}

export { type InteractiveCardProps, type ThemeColor };
