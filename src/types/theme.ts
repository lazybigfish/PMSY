// 主题类型
export type ThemeType = 'v1' | 'v2' | 'v3';

// 颜色色阶
export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

// 主题配置接口
export interface ThemeConfig {
  name: string;
  type: ThemeType;
  
  // 颜色系统
  colors: {
    primary: ColorScale;
    secondary: ColorScale;
    accent: ColorScale & {
      coral?: { 400: string; 500: string };
      yellow?: { 400: string; 500: string };
    };
    background: {
      main: string;
      surface: string;
      elevated: string;
      overlay: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      inverse: string;
    };
    border: {
      light: string;
      DEFAULT: string;
      dark: string;
    };
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
  };
  
  // 阴影系统
  shadows: {
    sm: string;
    DEFAULT: string;
    md: string;
    lg: string;
    glow: string;
  };
  
  // 渐变
  gradients: {
    primary: string;
    hero: string;
    text: string;
    fluid?: string;
  };
  
  // 圆角
  radius: {
    sm: string;
    DEFAULT: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Logo样式
export interface LogoStyle {
  background: string;
  iconColor: string;
  textGradient: string;
  shadow: string;
}
