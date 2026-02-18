import React from 'react';
import { useTouchFeedback, TouchFeedbackType } from '../../../hooks/useTouchFeedback';
import { Loader2 } from 'lucide-react';

export interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  feedback?: TouchFeedbackType;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const sizeClasses = {
  sm: 'h-9 px-3 text-sm min-h-touch',
  md: 'h-11 px-4 text-base min-h-touch',
  lg: 'h-12 px-6 text-base min-h-touch',
};

const variantClasses = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm',
  secondary: 'bg-dark-100 text-dark-900 hover:bg-dark-200 active:bg-dark-300 dark:bg-dark-800 dark:text-dark-100 dark:hover:bg-dark-700',
  ghost: 'bg-transparent text-dark-700 hover:bg-dark-100 active:bg-dark-200 dark:text-dark-300 dark:hover:bg-dark-800',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
  outline: 'bg-transparent border-2 border-primary-500 text-primary-500 hover:bg-primary-50 active:bg-primary-100 dark:hover:bg-primary-900/20',
};

export const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
  (
    {
      children,
      size = 'md',
      variant = 'primary',
      feedback = 'scale',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const { handlers, style: feedbackStyle } = useTouchFeedback({
      feedback,
      disabled: disabled || loading,
    });

    const baseClasses = `
      inline-flex items-center justify-center
      font-medium rounded-lg
      transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      touch-manipulation no-tap-highlight
      ${sizeClasses[size]}
      ${variantClasses[variant]}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `;

    return (
      <button
        ref={ref}
        className={baseClasses}
        disabled={disabled || loading}
        style={{
          ...feedbackStyle,
          ...style,
          minWidth: '44px',
          minHeight: '44px',
        }}
        {...handlers}
        {...props}
      >
        {loading && (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        )}
        {!loading && leftIcon && (
          <span className="mr-2">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="ml-2">{rightIcon}</span>
        )}
      </button>
    );
  }
);

TouchButton.displayName = 'TouchButton';
