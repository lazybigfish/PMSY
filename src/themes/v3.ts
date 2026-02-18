import type { ThemeConfig } from '../types/theme';

export const v3Theme: ThemeConfig = {
  name: '时尚版',
  type: 'v3',

  colors: {
    primary: {
      50: '#F0F9FF',
      100: '#E0F2FE',
      200: '#BAE6FD',
      300: '#7DD3FC',
      400: '#38BDF8',
      500: '#0EA5E9',
      600: '#0284C7',
      700: '#0369A1',
      800: '#075985',
      900: '#0C4A6E',
    },
    secondary: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      200: '#99F6E4',
      300: '#5EEAD4',
      400: '#2DD4BF',
      500: '#14B8A6',
      600: '#0D9488',
      700: '#0F766E',
      800: '#115E59',
      900: '#134E4A',
    },
    accent: {
      50: '#FDF4FF',
      100: '#FAE8FF',
      200: '#F5D0FE',
      300: '#F0ABFC',
      400: '#E879F9',
      500: '#D946EF',
      600: '#C026D3',
      700: '#A21CAF',
      800: '#86198F',
      900: '#701A75',
      coral: { 400: '#FB7185', 500: '#F43F5E' },
      yellow: { 400: '#FACC15', 500: '#EAB308' },
    },
    background: {
      main: '#F8FAFC',
      surface: '#FFFFFF',
      elevated: 'rgba(255, 255, 255, 0.75)',
      overlay: 'rgba(15, 23, 42, 0.4)',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      muted: '#94A3B8',
      inverse: '#FFFFFF',
    },
    border: {
      light: 'rgba(14, 165, 233, 0.2)',
      DEFAULT: 'rgba(14, 165, 233, 0.3)',
      dark: 'rgba(14, 165, 233, 0.5)',
    },
    status: {
      success: '#14B8A6',
      warning: '#F59E0B',
      error: '#F43F5E',
      info: '#0EA5E9',
    },
  },

  shadows: {
    sm: '0 2px 8px rgba(14, 165, 233, 0.1)',
    DEFAULT: '0 10px 40px -10px rgba(14, 165, 233, 0.2), 0 0 60px -15px rgba(139, 92, 246, 0.15)',
    md: '0 8px 30px rgba(14, 165, 233, 0.15)',
    lg: '0 12px 40px rgba(14, 165, 233, 0.2)',
    glow: '0 8px 20px -5px rgba(14, 165, 233, 0.4)',
  },

  gradients: {
    primary: 'linear-gradient(135deg, #0EA5E9 0%, #22D3EE 100%)',
    hero: 'linear-gradient(135deg, #0EA5E9 0%, #22D3EE 50%, #8B5CF6 100%)',
    text: 'linear-gradient(135deg, #0EA5E9 0%, #8B5CF6 100%)',
    fluid: 'linear-gradient(135deg, #0EA5E9 0%, #22D3EE 25%, #8B5CF6 50%, #F43F5E 75%, #FACC15 100%)',
  },

  radius: {
    sm: '0.375rem',
    DEFAULT: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
};
