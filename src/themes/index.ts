import { v1Theme } from './v1';
import { v2Theme } from './v2';
import { v3Theme } from './v3';
import type { ThemeConfig, ThemeType, LogoStyle } from '../types/theme';

// 主题配置映射
export const THEME_CONFIGS: Record<ThemeType, ThemeConfig> = {
  v1: v1Theme,
  v2: v2Theme,
  v3: v3Theme,
};

// Logo 样式配置
export const LOGO_STYLES: Record<ThemeType, LogoStyle> = {
  v1: {
    background: 'linear-gradient(135deg, #FF6B4A 0%, #F05A3A 100%)',
    iconColor: '#FFFFFF',
    textGradient: 'linear-gradient(135deg, #FF6B4A 0%, #8B5CF6 100%)',
    shadow: '0 0 20px rgba(255, 107, 74, 0.3)',
  },
  v2: {
    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #22D3EE 100%)',
    iconColor: '#FFFFFF',
    textGradient: 'linear-gradient(135deg, #6366F1 0%, #22D3EE 100%)',
    shadow: '0 0 20px rgba(99, 102, 241, 0.5)',
  },
  v3: {
    background: 'linear-gradient(135deg, #0EA5E9 0%, #22D3EE 100%)',
    iconColor: '#FFFFFF',
    textGradient: 'linear-gradient(135deg, #0EA5E9 0%, #8B5CF6 100%)',
    shadow: '0 0 20px rgba(14, 165, 233, 0.4)',
  },
};

// 导出主题配置
export { v1Theme, v2Theme, v3Theme };
export type { ThemeConfig, ThemeType, LogoStyle };
