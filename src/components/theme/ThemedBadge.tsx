import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ThemedBadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  size?: 'sm' | 'md';
}

export const ThemedBadge: React.FC<ThemedBadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
}) => {
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;

  const getBadgeStyles = () => {
    const baseAlpha = '20';
    
    switch (variant) {
      case 'primary':
        return {
          background: `${colors.primary[500]}${baseAlpha}`,
          color: colors.primary[600],
        };
      case 'secondary':
        return {
          background: `${colors.secondary[500]}${baseAlpha}`,
          color: colors.secondary[600],
        };
      case 'success':
        return {
          background: `${colors.status.success}${baseAlpha}`,
          color: colors.status.success,
        };
      case 'warning':
        return {
          background: `${colors.status.warning}${baseAlpha}`,
          color: colors.status.warning,
        };
      case 'error':
        return {
          background: `${colors.status.error}${baseAlpha}`,
          color: colors.status.error,
        };
      case 'info':
        return {
          background: `${colors.status.info}${baseAlpha}`,
          color: colors.status.info,
        };
      default:
        return {
          background: `${colors.primary[500]}${baseAlpha}`,
          color: colors.primary[600],
        };
    }
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeStyles[size]}`}
      style={getBadgeStyles()}
    >
      {children}
    </span>
  );
};
