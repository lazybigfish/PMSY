import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { getNavItemClasses } from '../../lib/interactions';
import type { NavItemProps, ThemeColor } from '../../lib/interactions';

/**
 * 导航项组件
 * 提供统一的悬停效果：背景色、左侧指示条、图标放大
 */
export function NavItem({
  icon: Icon,
  label,
  href,
  theme = 'primary',
  active,
  onClick,
}: NavItemProps) {
  const location = useLocation();
  const isActive = active ?? location.pathname === href;
  const navClasses = getNavItemClasses(theme, isActive);

  return (
    <Link
      data-testid="nav-item"
      to={href}
      onClick={onClick}
      className={cn(
        // 基础样式
        'flex items-center gap-3 px-4 py-3 rounded-lg',
        'text-dark-600 font-medium',
        // 导航悬停样式
        navClasses,
        // 激活状态
        isActive && 'text-dark-900 font-semibold'
      )}
    >
      <Icon
        className={cn(
          'w-5 h-5 transition-transform duration-200',
          'group-hover:scale-105'
        )}
      />
      <span>{label}</span>
    </Link>
  );
}

// 添加 className 支持
interface NavItemPropsWithClassName extends NavItemProps {
  className?: string;
}

// 重新导出带 className 的版本
export function NavItemWithClassName({
  icon: Icon,
  label,
  href,
  theme = 'primary',
  active,
  onClick,
  className,
}: NavItemPropsWithClassName) {
  const location = useLocation();
  const isActive = active ?? location.pathname === href;
  const navClasses = getNavItemClasses(theme, isActive);

  return (
    <Link
      data-testid="nav-item"
      to={href}
      onClick={onClick}
      className={cn(
        // 基础样式
        'flex items-center gap-3 px-4 py-3 rounded-lg',
        'text-dark-600 font-medium',
        // 导航悬停样式
        navClasses,
        // 激活状态
        isActive && 'text-dark-900 font-semibold',
        className
      )}
    >
      <Icon 
        className={cn(
          'w-5 h-5 transition-transform duration-200',
          'group-hover:scale-105'
        )} 
      />
      <span>{label}</span>
    </Link>
  );
}

/**
 * 侧边栏导航组
 * 用于分组显示导航项
 */
interface NavGroupProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function NavGroup({ title, children, className }: NavGroupProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {title && (
        <div className="px-4 py-2 text-xs font-semibold text-dark-400 uppercase tracking-wider">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * 移动端导航项
 * 用于底部导航栏
 */
interface MobileNavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  theme?: ThemeColor;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MobileNavItem({
  icon: Icon,
  label,
  href,
  theme = 'primary',
  active,
  onClick,
  className,
}: MobileNavItemProps) {
  const location = useLocation();
  const isActive = active ?? location.pathname === href;
  const themeClasses = {
    primary: {
      active: 'text-primary-600 bg-primary-50',
      hover: 'hover:bg-primary-50 hover:text-primary-600',
    },
    mint: {
      active: 'text-mint-600 bg-mint-50',
      hover: 'hover:bg-mint-50 hover:text-mint-600',
    },
    sun: {
      active: 'text-sun-600 bg-sun-50',
      hover: 'hover:bg-sun-50 hover:text-sun-600',
    },
    violet: {
      active: 'text-violet-600 bg-violet-50',
      hover: 'hover:bg-violet-50 hover:text-violet-600',
    },
    dark: {
      active: 'text-dark-800 bg-dark-100',
      hover: 'hover:bg-dark-100 hover:text-dark-800',
    },
    red: {
      active: 'text-red-600 bg-red-50',
      hover: 'hover:bg-red-50 hover:text-red-600',
    },
  }[theme];

  return (
    <Link
      data-testid="mobile-nav-item"
      to={href}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg',
        'transition-all duration-200 ease-out',
        themeClasses.hover,
        isActive && themeClasses.active,
        className
      )}
    >
      <Icon className="w-6 h-6" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

export { type NavItemProps, type ThemeColor };
