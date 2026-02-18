import React, { useState } from 'react';
import AIConfig from './tabs/AIConfig';
import ReportTemplates from './tabs/ReportTemplates';
import UserManagement from './tabs/UserManagement';
import RoleManagement from './tabs/RoleManagement';
import MilestoneTemplates from './tabs/MilestoneTemplates';
import GeneralConfig from './tabs/GeneralConfig';
import HotNewsConfig from './tabs/HotNewsConfig';
import LoginThemeConfig from './tabs/LoginThemeConfig';
import { useAuth } from '../../context/AuthContextNew';
import { useTheme } from '../../context/ThemeContext';

const SystemSettings = () => {
  const { profile } = useAuth();
  const { themeConfig } = useTheme();
  const isAdmin = profile?.role === 'admin';
  const isDark = themeConfig.colors.background.main === '#0A0A0F';
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', label: '用户管理' },
    { id: 'roles', label: '角色权限' },
    { id: 'milestone-templates', label: '里程碑模板' },
    { id: 'report-templates', label: '报告模板' },
    { id: 'ai-config', label: 'AI配置' },
    ...(isAdmin ? [{ id: 'hot-news', label: '热点配置' }] : []),
    { id: 'general', label: '通用设置' },
    { id: 'login-theme', label: '登录页管理' },
  ];

  const getTabButtonClass = (isActive: boolean) => {
    const baseClasses = "flex-1 min-w-[100px] rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200 ease-out focus:outline-none focus:ring-2 ring-offset-2";
    
    if (isActive) {
      return `${baseClasses} text-white shadow-md`;
    }
    
    if (isDark) {
      return `${baseClasses} text-gray-400 hover:text-gray-200 hover:bg-gray-800`;
    }
    
    return `${baseClasses} text-gray-700 hover:text-gray-900 hover:bg-gray-100`;
  };

  const getTabsListClass = () => {
    if (isDark) {
      return "flex space-x-1 rounded-xl bg-gray-800/50 p-1 overflow-x-auto border border-gray-700";
    }
    return "flex space-x-1 rounded-xl bg-gray-100 p-1 overflow-x-auto";
  };

  const getContentClass = () => {
    if (isDark) {
      return "bg-gray-900/50 p-6 rounded-lg border border-gray-700 mt-4";
    }
    return "bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-4";
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'roles':
        return <RoleManagement />;
      case 'milestone-templates':
        return <MilestoneTemplates />;
      case 'report-templates':
        return <ReportTemplates />;
      case 'ai-config':
        return <AIConfig />;
      case 'hot-news':
        return isAdmin ? <HotNewsConfig /> : null;
      case 'general':
        return <GeneralConfig />;
      case 'login-theme':
        return <LoginThemeConfig />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>系统设置</h1>

      <div className="space-y-4">
        <div className={getTabsListClass()}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={getTabButtonClass(activeTab === tab.id)}
              style={activeTab === tab.id ? { backgroundColor: themeConfig.colors.primary[500] } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={getContentClass()}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
