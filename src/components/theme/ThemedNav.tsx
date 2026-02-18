import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ThemedNavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

export const ThemedNavItem: React.FC<ThemedNavItemProps> = ({
  icon,
  label,
  isActive,
  onClick,
}) => {
  const { themeConfig } = useTheme();
  const { colors, gradients } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all duration-200
        ${isActive
          ? isDark
            ? 'text-white'
            : 'text-white'
          : isDark
            ? 'hover:bg-opacity-10'
            : 'hover:bg-opacity-10'
        }
      `}
      style={{
        background: isActive
          ? isDark
            ? 'rgba(99, 102, 241, 0.2)'
            : gradients.primary
          : 'transparent',
        color: isActive
          ? isDark
            ? colors.primary[400]
            : 'white'
          : colors.text.secondary,
        border: isActive && isDark ? `1px solid ${colors.border.DEFAULT}` : 'none',
      }}
    >
      <span style={{ 
        color: isActive 
          ? isDark ? colors.primary[400] : 'white'
          : colors.text.muted 
      }}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
};
