import React, { useState, useEffect } from 'react';
import { Palette, Eye, Check, AlertCircle, Sparkles, Layout } from 'lucide-react';
import { api } from '../../../lib/api';
import { useTheme } from '../../../context/ThemeContext';
import { ThemedCard } from '../../../components/theme/ThemedCard';
import { ThemedButton } from '../../../components/theme/ThemedButton';
import { ThemedInput } from '../../../components/theme/ThemedInput';
import { ThemedBadge } from '../../../components/theme/ThemedBadge';
import { ThemedAlert } from '../../../components/theme/ThemedAlert';
import { ThemedSpinner } from '../../../components/theme/ThemedLoading';

interface LoginTheme {
  id: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  preview: string;
}

const LoginThemeConfig = () => {
  const [themes, setThemes] = useState<LoginTheme[]>([
    {
      id: 'v1',
      name: '经典版',
      description: '原有多彩渐变风格，珊瑚橙主色调',
      version: '1.0',
      isActive: true,
      preview: '经典渐变风格',
    },
    {
      id: 'v2',
      name: '科技版',
      description: '深邃紫+科技青，赛博朋克风格',
      version: '2.0',
      isActive: false,
      preview: '赛博科技风格',
    },
    {
      id: 'v3',
      name: '时尚版',
      description: '居中悬浮卡片，流体渐变背景，3D交互效果',
      version: '3.0',
      isActive: false,
      preview: '时尚悬浮风格',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [config, setConfig] = useState({
    login_page_title: 'PMSY 项目管理系统',
    login_page_subtitle: '提升团队协作效率，管理每一个精彩项目',
  });
  const { themeConfig, setTheme } = useTheme();
  const isDark = themeConfig.colors.background.main === '#0A0A0F';

  // 加载当前配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // 先从 localStorage 读取（快速响应）
      const cachedTheme = localStorage.getItem('login_page_theme');
      if (cachedTheme) {
        setThemes(prev => prev.map(t => ({
          ...t,
          isActive: t.id === cachedTheme
        })));
      }

      // 再从数据库获取最新配置
      const { data: themeData } = await api.db.from('system_configs')
        .select('value')
        .eq('key', 'login_page_theme')
        .single();
      
      if (themeData?.data?.value) {
        const activeTheme = themeData.data.value;
        setThemes(prev => prev.map(t => ({
          ...t,
          isActive: t.id === activeTheme
        })));
        // 同步到 localStorage
        localStorage.setItem('login_page_theme', activeTheme);
      }

      // 获取标题配置
      const { data: titleData } = await api.db.from('system_configs')
        .select('value')
        .eq('key', 'login_page_title')
        .single();
      
      const { data: subtitleData } = await api.db.from('system_configs')
        .select('value')
        .eq('key', 'login_page_subtitle')
        .single();

      setConfig({
        login_page_title: titleData?.data?.value || 'PMSY 项目管理系统',
        login_page_subtitle: subtitleData?.data?.value || '提升团队协作效率，管理每一个精彩项目',
      });
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  // 切换主题
  const handleThemeChange = async (themeId: string) => {
    setLoading(true);
    try {
      // 使用新的 admin/config API 更新数据库（支持插入或更新）
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${API_BASE_URL}/health/admin/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          key: 'login_page_theme',
          value: themeId,
        }),
      });

      // 同时保存到 localStorage（供登录页读取）
      localStorage.setItem('login_page_theme', themeId);

      // 更新主题上下文（实时更新系统Logo）
      setTheme(themeId as 'v1' | 'v2' | 'v3');

      // 更新本地状态
      setThemes(prev => prev.map(t => ({
        ...t,
        isActive: t.id === themeId
      })));

      setMessage({ type: 'success', text: '登录页主题已更新，退出登录后生效' });
    } catch (error) {
      setMessage({ type: 'error', text: '更新失败，请重试' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 保存配置
  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('access_token');

      await Promise.all([
        fetch(`${API_BASE_URL}/health/admin/config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            key: 'login_page_title',
            value: config.login_page_title,
          }),
        }),
        fetch(`${API_BASE_URL}/health/admin/config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            key: 'login_page_subtitle',
            value: config.login_page_subtitle,
          }),
        }),
      ]);

      setMessage({ type: 'success', text: '配置已保存' });
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败，请重试' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 获取主题预览渐变
  const getThemeGradient = (themeId: string) => {
    switch (themeId) {
      case 'v1':
        return 'from-orange-400 via-pink-500 to-purple-500';
      case 'v2':
        return 'from-indigo-500 via-purple-500 to-cyan-400';
      case 'v3':
        return 'from-sky-400 via-cyan-400 to-violet-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="space-y-8">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ 
            background: `linear-gradient(135deg, ${themeConfig.colors.primary[400]}, ${themeConfig.colors.primary[600]})` 
          }}
        >
          <Palette className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>登录页管理</h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>管理系统的登录页面主题和样式</p>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <ThemedAlert 
          type={message.type} 
          message={message.text}
        />
      )}

      {/* 主题选择 */}
      <div className="space-y-4">
        <h3 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Layout className="w-5 h-5" style={{ color: themeConfig.colors.primary[500] }} />
          选择登录页主题
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themes.map((theme) => (
            <ThemedCard
              key={theme.id}
              variant={theme.isActive ? 'elevated' : 'default'}
              className={`cursor-pointer transition-all duration-200 ${
                theme.isActive ? 'ring-2' : ''
              }`}
              style={theme.isActive ? { 
                outline: `2px solid ${themeConfig.colors.primary[300]}`,
                outlineOffset: '2px'
              } : {}}
              onClick={() => !loading && handleThemeChange(theme.id)}
            >
              <div className="relative p-2">
                {/* 选中标记 */}
                {theme.isActive && (
                  <div 
                    className="absolute top-0 right-0 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: themeConfig.colors.primary[500] }}
                  >
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* 预览图标 */}
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br ${getThemeGradient(theme.id)}`}>
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{theme.name}</h4>
                      <ThemedBadge variant="primary" size="sm">v{theme.version}</ThemedBadge>
                    </div>
                    <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{theme.description}</p>
                    
                    {/* 预览按钮 */}
                    <ThemedButton
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open('/login', '_blank');
                      }}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      预览效果
                    </ThemedButton>
                  </div>
                </div>
              </div>
            </ThemedCard>
          ))}
        </div>
      </div>

      {/* 页面配置 */}
      <div className="space-y-4">
        <h3 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Palette className="w-5 h-5" style={{ color: themeConfig.colors.primary[500] }} />
          页面文案配置
        </h3>

        <ThemedCard variant="default">
          <div className="space-y-4">
            <ThemedInput
              type="text"
              label="登录页标题"
              value={config.login_page_title}
              onChange={(e) => setConfig(prev => ({ ...prev, login_page_title: e.target.value }))}
              placeholder="PMSY 项目管理系统"
            />

            <ThemedInput
              type="textarea"
              label="登录页副标题"
              value={config.login_page_subtitle}
              onChange={(e) => setConfig(prev => ({ ...prev, login_page_subtitle: e.target.value }))}
              placeholder="提升团队协作效率，管理每一个精彩项目"
              rows={2}
            />

            <div className="flex justify-end">
              <ThemedButton
                variant="primary"
                onClick={handleSaveConfig}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <ThemedSpinner size="sm" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    保存配置
                  </>
                )}
              </ThemedButton>
            </div>
          </div>
        </ThemedCard>
      </div>

      {/* 说明 */}
      <ThemedAlert
        type="warning"
        title="使用说明"
        message={
          <ul className="space-y-1 mt-2">
            <li>• 选择主题后，刷新登录页面即可看到新效果</li>
            <li>• 页面文案配置会同时应用到所有登录页主题</li>
            <li>• 建议先在预览中确认效果后再正式启用</li>
          </ul>
        }
      />
    </div>
  );
};

export default LoginThemeConfig;
