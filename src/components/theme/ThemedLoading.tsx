import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ThemedSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export const ThemedSpinner: React.FC<ThemedSpinnerProps> = ({ size = 'md' }) => {
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-transparent`}
      style={{
        borderTopColor: colors.primary[500],
        borderRightColor: colors.primary[300],
      }}
    />
  );
};

interface ThemedSkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export const ThemedSkeleton: React.FC<ThemedSkeletonProps> = ({
  className = '',
  width = '100%',
  height = '1rem',
}) => {
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';

  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{
        width,
        height,
        background: isDark
          ? 'linear-gradient(90deg, #1A1A25 0%, #252532 50%, #1A1A25 100%)'
          : 'linear-gradient(90deg, #f0f0f0 0%, #e8e8e8 50%, #f0f0f0 100%)',
        backgroundSize: '200% 100%',
      }}
    />
  );
};
