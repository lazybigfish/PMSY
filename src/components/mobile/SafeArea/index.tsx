import React from 'react';
import { useSafeArea } from '../../../hooks/useSafeArea';

export interface SafeAreaProps {
  children: React.ReactNode;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const SafeArea: React.FC<SafeAreaProps> = ({
  children,
  top = true,
  bottom = true,
  left = false,
  right = false,
  className = '',
  style,
}) => {
  const { insets } = useSafeArea();

  const safeAreaStyle: React.CSSProperties = {
    paddingTop: top ? `${insets.top}px` : undefined,
    paddingBottom: bottom ? `${insets.bottom}px` : undefined,
    paddingLeft: left ? `${insets.left}px` : undefined,
    paddingRight: right ? `${insets.right}px` : undefined,
    ...style,
  };

  return (
    <div className={className} style={safeAreaStyle}>
      {children}
    </div>
  );
};

export interface SafeAreaViewProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const SafeAreaView: React.FC<SafeAreaViewProps> = ({
  children,
  className = '',
  style,
}) => {
  return (
    <div
      className={`safe-area-all ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export interface SafeAreaTopProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const SafeAreaTop: React.FC<SafeAreaTopProps> = ({
  children,
  className = '',
  style,
}) => {
  return (
    <div
      className={`safe-area-top ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export interface SafeAreaBottomProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const SafeAreaBottom: React.FC<SafeAreaBottomProps> = ({
  children,
  className = '',
  style,
}) => {
  return (
    <div
      className={`safe-area-bottom ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};
