import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ThemeType, ThemeConfig, LogoStyle } from '../types/theme';
import { THEME_CONFIGS, LOGO_STYLES } from '../themes';

interface ThemeContextType {
  theme: ThemeType;
  themeConfig: ThemeConfig;
  logoStyle: LogoStyle;
  setTheme: (theme: ThemeType) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('v1');

  // 从 localStorage 加载主题
  useEffect(() => {
    const cachedTheme = localStorage.getItem('login_page_theme') as ThemeType;
    if (cachedTheme && THEME_CONFIGS[cachedTheme]) {
      setThemeState(cachedTheme);
    }
  }, []);

  // 注入 CSS 变量
  const injectThemeCSS = useCallback((themeType: ThemeType) => {
    const config = THEME_CONFIGS[themeType];
    const root = document.documentElement;

    // 主色
    Object.entries(config.colors.primary).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value);
    });

    // 辅助色
    Object.entries(config.colors.secondary).forEach(([key, value]) => {
      root.style.setProperty(`--color-secondary-${key}`, value);
    });

    // 强调色
    Object.entries(config.colors.accent).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--color-accent-${key}`, value);
      }
    });

    // 背景色
    root.style.setProperty('--color-bg-main', config.colors.background.main);
    root.style.setProperty('--color-bg-surface', config.colors.background.surface);
    root.style.setProperty('--color-bg-elevated', config.colors.background.elevated);

    // 文字色
    root.style.setProperty('--color-text-primary', config.colors.text.primary);
    root.style.setProperty('--color-text-secondary', config.colors.text.secondary);
    root.style.setProperty('--color-text-muted', config.colors.text.muted);

    // 边框色
    root.style.setProperty('--color-border-light', config.colors.border.light);
    root.style.setProperty('--color-border-default', config.colors.border.DEFAULT);
    root.style.setProperty('--color-border-dark', config.colors.border.dark);

    // 状态色
    root.style.setProperty('--color-status-success', config.colors.status.success);
    root.style.setProperty('--color-status-warning', config.colors.status.warning);
    root.style.setProperty('--color-status-error', config.colors.status.error);
    root.style.setProperty('--color-status-info', config.colors.status.info);

    // 阴影
    root.style.setProperty('--shadow-glow', config.shadows.glow);

    // 渐变
    root.style.setProperty('--gradient-primary', config.gradients.primary);
    root.style.setProperty('--gradient-hero', config.gradients.hero);
    root.style.setProperty('--gradient-text', config.gradients.text);

    // 设置 data-theme 属性用于 CSS 选择器
    root.setAttribute('data-theme', themeType);

    // 设置深色模式
    if (themeType === 'v2') {
      root.classList.add('dark');
      document.body.style.backgroundColor = config.colors.background.main;
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = config.colors.background.main;
    }
  }, []);

  // 设置主题并保存
  const setTheme = useCallback((newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('login_page_theme', newTheme);
    injectThemeCSS(newTheme);
  }, [injectThemeCSS]);

  // 初始化时注入 CSS
  useEffect(() => {
    injectThemeCSS(theme);
  }, [theme, injectThemeCSS]);

  const value = useMemo(() => ({
    theme,
    themeConfig: THEME_CONFIGS[theme],
    logoStyle: LOGO_STYLES[theme],
    setTheme,
    isDark: theme === 'v2',
  }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export type { ThemeType, ThemeConfig, LogoStyle };
