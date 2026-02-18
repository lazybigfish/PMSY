import React, { useState, useEffect } from 'react';
import LoginV1 from './LoginV1';
import LoginV2 from './LoginV2';
import LoginV3 from './LoginV3';

// 登录页主题类型
type LoginTheme = 'v1' | 'v2' | 'v3';

// 主题配置接口
interface ThemeConfig {
  theme: LoginTheme;
  title: string;
  subtitle: string;
}

// 默认配置
const DEFAULT_CONFIG: ThemeConfig = {
  theme: 'v1',
  title: 'PMSY 项目管理系统',
  subtitle: '提升团队协作效率，管理每一个精彩项目',
};

// API 基础 URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Login = () => {
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  // 加载主题配置
  useEffect(() => {
    const loadThemeConfig = async () => {
      try {
        // 1. 先从本地存储读取（快速响应）
        const cachedTheme = localStorage.getItem('login_page_theme') as LoginTheme;
        if (cachedTheme) {
          setConfig(prev => ({
            ...prev,
            theme: cachedTheme
          }));
        }

        // 2. 从后端公开 API 获取最新配置（无需认证）
        const response = await fetch(`${API_BASE_URL}/health/public-config`);
        if (response.ok) {
          const data = await response.json();
          const serverTheme = data.login_page_theme as LoginTheme;

          // 更新配置
          setConfig({
            theme: serverTheme,
            title: data.login_page_title || DEFAULT_CONFIG.title,
            subtitle: data.login_page_subtitle || DEFAULT_CONFIG.subtitle,
          });

          // 同步到 localStorage
          localStorage.setItem('login_page_theme', serverTheme);
        }
      } catch (error) {
        console.log('从服务器加载登录页配置失败，使用本地缓存或默认配置:', error);
        // 如果 API 调用失败，继续使用 localStorage 中的缓存或默认配置
      } finally {
        setLoading(false);
      }
    };

    loadThemeConfig();
  }, []);

  // 渲染加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  // 根据主题渲染对应的登录页
  switch (config.theme) {
    case 'v3':
      return <LoginV3 />;
    case 'v2':
      return <LoginV2 />;
    default:
      return <LoginV1 />;
  }
};

export default Login;
