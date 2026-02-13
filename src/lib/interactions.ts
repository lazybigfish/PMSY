/**
 * 交互效果工具函数和类型定义
 * 用于系统全局鼠标悬停交互效果
 */

/** 主题色类型 */
export type ThemeColor = 'primary' | 'mint' | 'sun' | 'violet' | 'dark' | 'red';

/** 元素类型 */
export type ElementType = 'card' | 'button' | 'nav' | 'list' | 'tab' | 'avatar';

/** 尺寸类型 */
export type SizeType = 'sm' | 'md' | 'lg';

/**
 * 悬停效果配置接口
 */
export interface HoverEffectConfig {
  /** 主题色 */
  theme: ThemeColor;
  /** 元素类型 */
  type: ElementType;
  /** 尺寸 */
  size?: SizeType;
  /** 是否禁用悬停效果 */
  disabled?: boolean;
}

/**
 * 交互卡片 Props
 */
export interface InteractiveCardProps {
  children: React.ReactNode;
  theme?: ThemeColor;
  /** 是否可点击 */
  clickable?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 是否显示左侧指示条 */
  showIndicator?: boolean;
}

/**
 * 悬停按钮 Props
 */
export interface HoverButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: SizeType;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 导航项 Props
 */
export interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  theme?: ThemeColor;
  active?: boolean;
  onClick?: () => void;
}

/**
 * 主题色映射配置
 * 定义每种主题色对应的悬停样式类名
 */
export const themeColorMap: Record<ThemeColor, {
  hoverBg: string;
  hoverText: string;
  hoverBorder: string;
  indicator: string;
  lightBg: string;
  mediumBg: string;
}> = {
  primary: {
    hoverBg: 'hover:bg-primary-50',
    hoverText: 'hover:text-primary-700',
    hoverBorder: 'hover:border-primary-300',
    indicator: 'before:bg-primary-500',
    lightBg: 'bg-primary-50',
    mediumBg: 'bg-primary-100',
  },
  mint: {
    hoverBg: 'hover:bg-mint-50',
    hoverText: 'hover:text-mint-700',
    hoverBorder: 'hover:border-mint-300',
    indicator: 'before:bg-mint-500',
    lightBg: 'bg-mint-50',
    mediumBg: 'bg-mint-100',
  },
  sun: {
    hoverBg: 'hover:bg-sun-50',
    hoverText: 'hover:text-sun-700',
    hoverBorder: 'hover:border-sun-300',
    indicator: 'before:bg-sun-500',
    lightBg: 'bg-sun-50',
    mediumBg: 'bg-sun-100',
  },
  violet: {
    hoverBg: 'hover:bg-violet-50',
    hoverText: 'hover:text-violet-700',
    hoverBorder: 'hover:border-violet-300',
    indicator: 'before:bg-violet-500',
    lightBg: 'bg-violet-50',
    mediumBg: 'bg-violet-100',
  },
  dark: {
    hoverBg: 'hover:bg-dark-100',
    hoverText: 'hover:text-dark-800',
    hoverBorder: 'hover:border-dark-300',
    indicator: 'before:bg-dark-500',
    lightBg: 'bg-dark-50',
    mediumBg: 'bg-dark-100',
  },
  red: {
    hoverBg: 'hover:bg-red-50',
    hoverText: 'hover:text-red-600',
    hoverBorder: 'hover:border-red-300',
    indicator: 'before:bg-red-500',
    lightBg: 'bg-red-50',
    mediumBg: 'bg-red-100',
  },
};

/**
 * 按钮变体映射配置
 */
export const buttonVariantMap: Record<string, {
  base: string;
  hover: string;
  active: string;
}> = {
  primary: {
    base: 'bg-primary-600 text-white',
    hover: 'hover:bg-primary-700 hover:-translate-y-px hover:shadow-md',
    active: 'active:scale-95 active:bg-primary-800',
  },
  secondary: {
    base: 'bg-dark-100 text-dark-700',
    hover: 'hover:bg-dark-200 hover:text-dark-800 hover:-translate-y-px',
    active: 'active:scale-95 active:bg-dark-300',
  },
  danger: {
    base: 'bg-red-50 text-red-600',
    hover: 'hover:bg-red-100 hover:text-red-700 hover:-translate-y-px',
    active: 'active:scale-95 active:bg-red-200',
  },
  ghost: {
    base: 'bg-transparent text-dark-600',
    hover: 'hover:bg-dark-50 hover:text-dark-800',
    active: 'active:scale-95 active:bg-dark-100',
  },
};

/**
 * 尺寸映射配置
 */
export const sizeMap: Record<SizeType, {
  button: string;
  card: string;
  nav: string;
}> = {
  sm: {
    button: 'px-3 py-1.5 text-sm',
    card: 'p-3',
    nav: 'px-3 py-2 text-sm',
  },
  md: {
    button: 'px-4 py-2 text-base',
    card: 'p-4',
    nav: 'px-4 py-3 text-base',
  },
  lg: {
    button: 'px-6 py-3 text-lg',
    card: 'p-6',
    nav: 'px-5 py-4 text-lg',
  },
};

/**
 * 获取主题对应的 CSS 类名
 * @param theme 主题色
 * @returns 主题色对应的样式类名对象
 */
export function getThemeClasses(theme: ThemeColor) {
  return themeColorMap[theme] || themeColorMap.primary;
}

/**
 * 获取按钮变体的 CSS 类名
 * @param variant 按钮变体
 * @returns 按钮变体对应的样式类名字符串
 */
export function getButtonClasses(variant: keyof typeof buttonVariantMap = 'primary') {
  const config = buttonVariantMap[variant] || buttonVariantMap.primary;
  return `${config.base} ${config.hover} ${config.active}`;
}

/**
 * 获取尺寸的 CSS 类名
 * @param size 尺寸
 * @param type 元素类型
 * @returns 尺寸对应的样式类名字符串
 */
export function getSizeClasses(size: SizeType = 'md', type: keyof typeof sizeMap['sm'] = 'button') {
  return sizeMap[size][type] || sizeMap.md[type];
}

/**
 * 卡片悬停效果的通用类名
 */
export const cardHoverClasses = `
  hover:-translate-y-0.5
  hover:shadow-lg
  transition-all
  duration-200
  ease-out
  cursor-pointer
`;

/**
 * 按钮悬停效果的通用类名
 */
export const buttonHoverClasses = `
  transition-all
  duration-200
  ease-out
  cursor-pointer
  focus:outline-none
  focus:ring-2
  focus:ring-offset-2
`;

/**
 * 导航项悬停效果的通用类名
 */
export const navHoverClasses = `
  relative
  transition-all
  duration-200
  ease-out
  cursor-pointer
  before:absolute
  before:left-0
  before:top-1/2
  before:-translate-y-1/2
  before:w-0
  before:h-8
  before:rounded-r-full
  before:transition-all
  before:duration-200
  hover:before:w-[3px]
`;

/**
 * 列表项悬停效果的通用类名
 */
export const listItemHoverClasses = `
  transition-all
  duration-200
  ease-out
  hover:bg-dark-100/50
`;

/**
 * 组合卡片悬停类名
 * @param theme 主题色
 * @param additionalClasses 额外的类名
 * @returns 完整的卡片悬停类名
 */
export function getCardHoverClasses(theme: ThemeColor = 'primary', additionalClasses?: string): string {
  const themeClasses = getThemeClasses(theme);
  return `
    ${cardHoverClasses}
    ${themeClasses.hoverBorder}
    ${additionalClasses || ''}
  `.trim();
}

/**
 * 组合导航项悬停类名
 * @param theme 主题色
 * @param isActive 是否激活
 * @param additionalClasses 额外的类名
 * @returns 完整的导航项悬停类名
 */
export function getNavItemClasses(
  theme: ThemeColor = 'primary',
  isActive: boolean = false,
  additionalClasses?: string
): string {
  const themeClasses = getThemeClasses(theme);
  
  if (isActive) {
    return `
      ${navHoverClasses}
      ${themeClasses.lightBg}
      ${themeClasses.hoverText}
      before:w-[3px]
      ${themeClasses.indicator}
      ${additionalClasses || ''}
    `.trim();
  }
  
  return `
    ${navHoverClasses}
    ${themeClasses.hoverBg}
    ${themeClasses.hoverText}
    hover:before:w-[3px]
    ${themeClasses.indicator}
    ${additionalClasses || ''}
  `.trim();
}
