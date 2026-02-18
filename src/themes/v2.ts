import type { ThemeConfig } from '../types/theme';

export const v2Theme: ThemeConfig = {
  name: '清新版',
  type: 'v2',

  colors: {
    primary: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#10B981',
      600: '#059669',
      700: '#047857',
      800: '#065F46',
      900: '#064E3B',
    },
    secondary: {
      50: '#F7FEE7',
      100: '#ECFCCB',
      200: '#D9F99D',
      300: '#BEF264',
      400: '#A3E635',
      500: '#84CC16',
      600: '#65A30D',
      700: '#4D7C0F',
      800: '#3F6212',
      900: '#365314',
    },
    accent: {
      50: '#FFF1F2',
      100: '#FFE4E6',
      200: '#FECDD3',
      300: '#FDA4AF',
      400: '#FB7185',
      500: '#F43F5E',
      600: '#E11D48',
      700: '#BE123C',
      800: '#9F1239',
      900: '#881337',
    },
    background: {
      main: '#F0FDF4',
      surface: '#FFFFFF',
      elevated: '#FAFEFA',
      overlay: 'rgba(6, 78, 59, 0.4)',
    },
    text: {
      primary: '#064E3B',
      secondary: '#047857',
      muted: '#6B7280',
      inverse: '#FFFFFF',
    },
    border: {
      light: 'rgba(16, 185, 129, 0.2)',
      DEFAULT: 'rgba(16, 185, 129, 0.3)',
      dark: 'rgba(16, 185, 129, 0.5)',
    },
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#F43F5E',
      info: '#0EA5E9',
    },
  },

  shadows: {
    sm: '0 2px 8px rgba(16, 185, 129, 0.1)',
    DEFAULT: '0 10px 40px -10px rgba(16, 185, 129, 0.15), 0 0 20px rgba(132, 204, 22, 0.1)',
    md: '0 8px 30px rgba(16, 185, 129, 0.12)',
    lg: '0 12px 40px rgba(16, 185, 129, 0.15)',
    glow: '0 8px 20px -5px rgba(16, 185, 129, 0.35)',
  },

  gradients: {
    primary: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #84CC16 100%)',
    hero: 'linear-gradient(135deg, #10B981 0%, #34D399 50%, #A3E635 100%)',
    text: 'linear-gradient(135deg, #059669 0%, #65A30D 100%)',
  },

  radius: {
    sm: '0.375rem',
    DEFAULT: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
};
