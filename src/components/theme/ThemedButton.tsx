import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ThemedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  className = '',
  ...props
}) => {
  const { themeConfig, theme } = useTheme();
  const { colors } = themeConfig;
  const isDark = theme === 'v2';

  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl';

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: themeConfig.gradients.primary,
          color: 'white',
          boxShadow: themeConfig.shadows.glow,
        };
      case 'secondary':
        return isDark
          ? {
              background: colors.background.elevated,
              color: colors.text.primary,
              border: `1px solid ${colors.border.DEFAULT}`,
            }
          : {
              background: 'white',
              color: colors.text.primary,
              border: `1px solid ${colors.border.light}`,
            };
      case 'ghost':
        return {
          background: 'transparent',
          color: colors.text.secondary,
        };
      case 'danger':
        return {
          background: colors.status.error,
          color: 'white',
        };
      default:
        return {};
    }
  };

  const dynamicStyles = getVariantStyles();

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${className} hover:-translate-y-0.5 active:scale-95`}
      style={dynamicStyles}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin">⟳</span>
      ) : children}
    </button>
  );
};
