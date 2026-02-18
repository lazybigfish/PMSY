import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ThemedInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  type?: 'text' | 'password' | 'email' | 'number' | 'textarea';
  rows?: number;
}

export const ThemedInput: React.FC<ThemedInputProps> = ({
  label,
  error,
  icon,
  type = 'text',
  rows = 3,
  className = '',
  ...props
}) => {
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';

  const inputStyles = {
    background: isDark ? colors.background.elevated : '#FFFFFF',
    color: colors.text.primary,
    border: `1px solid ${error ? colors.status.error : isDark ? colors.border.DEFAULT : colors.border.light}`,
  };

  const isTextarea = type === 'textarea';

  return (
    <div className="w-full">
      {label && (
        <label 
          className="block text-sm font-medium mb-1.5"
          style={{ color: colors.text.secondary }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && !isTextarea && (
          <div 
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: colors.text.muted }}
          >
            {icon}
          </div>
        )}
        {isTextarea ? (
          <textarea
            rows={rows}
            className={`
              w-full px-4 py-3 rounded-xl transition-all duration-200 outline-none resize-none
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
              ${className}
            `}
            style={inputStyles}
            {...props as React.TextareaHTMLAttributes<HTMLTextAreaElement>}
          />
        ) : (
          <input
            type={type}
            className={`
              w-full px-4 py-3 rounded-xl transition-all duration-200 outline-none
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
              ${className}
            `}
            style={inputStyles}
            {...props}
          />
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm" style={{ color: colors.status.error }}>
          {error}
        </p>
      )}
    </div>
  );
};
