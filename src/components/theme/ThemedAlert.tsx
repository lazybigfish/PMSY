import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ThemedAlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: React.ReactNode;
  title?: string;
}

export const ThemedAlert: React.FC<ThemedAlertProps> = ({
  type,
  message,
  title,
}) => {
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';

  const getAlertStyles = (): { background: string; color: string; borderColor: string; border: string } => {
    const baseBorder = isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent';

    switch (type) {
      case 'success':
        return {
          background: isDark ? 'rgba(34, 211, 238, 0.1)' : `${colors.status.success}15`,
          color: isDark ? '#22D3EE' : colors.status.success,
          borderColor: isDark ? 'rgba(34, 211, 238, 0.3)' : `${colors.status.success}30`,
          border: baseBorder,
        };
      case 'error':
        return {
          background: isDark ? 'rgba(239, 68, 68, 0.1)' : `${colors.status.error}15`,
          color: colors.status.error,
          borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : `${colors.status.error}30`,
          border: baseBorder,
        };
      case 'warning':
        return {
          background: isDark ? 'rgba(245, 158, 11, 0.1)' : `${colors.status.warning}15`,
          color: colors.status.warning,
          borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : `${colors.status.warning}30`,
          border: baseBorder,
        };
      case 'info':
        return {
          background: isDark ? 'rgba(99, 102, 241, 0.1)' : `${colors.status.info}15`,
          color: isDark ? colors.primary[400] : colors.status.info,
          borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : `${colors.status.info}30`,
          border: baseBorder,
        };
      default:
        return {
          background: isDark ? 'rgba(99, 102, 241, 0.1)' : `${colors.status.info}15`,
          color: isDark ? colors.primary[400] : colors.status.info,
          borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : `${colors.status.info}30`,
          border: baseBorder,
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 flex-shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 flex-shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 flex-shrink-0" />;
      default:
        return null;
    }
  };

  const styles = getAlertStyles();

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl"
      style={{
        background: styles.background,
        color: styles.color,
        border: styles.border,
        borderColor: styles.borderColor,
      }}
    >
      {getIcon()}
      <div className="flex-1">
        {title && (
          <p className="font-medium mb-0.5">{title}</p>
        )}
        <div className="text-sm opacity-90">{message}</div>
      </div>
    </div>
  );
};
