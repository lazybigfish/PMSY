import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ThemedCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass';
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const ThemedCard: React.FC<ThemedCardProps> = ({
  children,
  variant = 'default',
  className = '',
  onClick,
  style,
}) => {
  const { themeConfig, theme } = useTheme();
  const { colors, shadows } = themeConfig;
  const isDark = theme === 'v2';

  const getCardStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'elevated':
        return {
          background: colors.background.surface,
          boxShadow: shadows.lg,
          border: 'none',
        };
      case 'glass':
        return theme === 'v3'
          ? {
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${colors.border.light}`,
              boxShadow: shadows.DEFAULT,
            }
          : {
              background: colors.background.surface,
              boxShadow: shadows.DEFAULT,
            };
      default:
        return {
          background: colors.background.surface,
          boxShadow: shadows.sm,
          border: `1px solid ${isDark ? colors.border.DEFAULT : colors.border.light}`,
        };
    }
  };

  const cardStyles = getCardStyles();

  return (
    <div
      className={`rounded-2xl p-6 transition-all duration-200 ${className}`}
      style={{ ...cardStyles, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
