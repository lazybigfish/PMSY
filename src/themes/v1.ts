import type { ThemeConfig } from '../types/theme';

export const v1Theme: ThemeConfig = {
  name: '经典版',
  type: 'v1',
  
  colors: {
    primary: {
      50: '#FFF5F3',
      100: '#FFE8E4',
      200: '#FFD5CC',
      300: '#FFB8A8',
      400: '#FF8F75',
      500: '#FF6B4A',
      600: '#F05A3A',
      700: '#D94A2C',
      800: '#B33D24',
      900: '#8F331F',
    },
    secondary: {
      50: '#F0FDF9',
      100: '#CCFBEF',
      200: '#99F6E0',
      300: '#5EE9C7',
      400: '#2DD4AA',
      500: '#14B890',
      600: '#0D9480',
      700: '#0F766E',
      800: '#115E59',
      900: '#134E4A',
    },
    accent: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      200: '#DDD6FE',
      300: '#C4B5FD',
      400: '#A78BFA',
      500: '#8B5CF6',
      600: '#7C3AED',
      700: '#6D28D9',
      800: '#5B21B6',
      900: '#4C1D95',
    },
    background: {
      main: '#FAFBFC',
      surface: '#FFFFFF',
      elevated: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
      muted: '#94A3B8',
      inverse: '#FFFFFF',
    },
    border: {
      light: '#E2E8F0',
      DEFAULT: '#CBD5E1',
      dark: '#94A3B8',
    },
    status: {
      success: '#14B890',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
  },
  
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(255, 107, 74, 0.3)',
  },
  
  gradients: {
    primary: 'linear-gradient(135deg, #FF6B4A 0%, #F05A3A 100%)',
    hero: 'linear-gradient(135deg, #FF6B4A 0%, #8B5CF6 50%, #14B890 100%)',
    text: 'linear-gradient(135deg, #FF6B4A 0%, #8B5CF6 100%)',
  },
  
  radius: {
    sm: '0.375rem',
    DEFAULT: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
};
