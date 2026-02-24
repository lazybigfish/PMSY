import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContextNew';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  BarChart2,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Waves,
  FileArchive,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Notifications } from './Notifications';
import { getNavItemClasses } from '../lib/interactions';
import type { ThemeColor } from '../lib/interactions';
import { Avatar } from './Avatar';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { BottomNav } from './mobile/BottomNav';

const Layout = () => {
  const { signOut, profile } = useAuth();
  const { logoStyle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [allowedModules, setAllowedModules] = useState<Set<string>>(new Set());
  const [, setLoadingPerms] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Define navigation with keys
  const allNavigation = [
    { key: 'dashboard', name: '工作台', href: '/', icon: LayoutDashboard, color: 'primary' },
    { key: 'projects', name: '项目管理', href: '/projects', icon: FolderKanban, color: 'violet' },
    { key: 'tasks', name: '任务中心', href: '/tasks', icon: CheckSquare, color: 'mint' },
    { key: 'stakeholders', name: '相关方', href: '/stakeholders', icon: Users, color: 'sun' },
    { key: 'analysis', name: '数据分析', href: '/analysis', icon: BarChart2, color: 'primary' },
    { key: 'water', name: '水漫金山', href: '/water', icon: Waves, color: 'violet' },
    { key: 'files', name: '文件管理', href: '/files', icon: FileArchive, color: 'mint' },
    { key: 'system', name: '系统设置', href: '/system', icon: Settings, color: 'dark' },
  ];

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoadingPerms(true);
      try {
        if (!profile?.role) {
          setAllowedModules(new Set(['dashboard']));
          return;
        }

        // 使用新的 API 获取权限
        const { data } = await api.db
          .from('role_permissions')
          .select('module_key')
          .eq('role_key', profile.role);

        if (data && data.length > 0) {
          const perms = new Set<string>();
          data.forEach((p: { module_key: string }) => perms.add(p.module_key));
          setAllowedModules(perms);
        } else {
          if (profile.role === 'admin') {
            setAllowedModules(new Set(allNavigation.map(n => n.key)));
          } else {
            setAllowedModules(new Set(['dashboard', 'projects', 'tasks', 'files', 'stakeholders']));
          }
        }
      } catch (err) {
        console.error('Permission fetch error:', err);
        // 出错时使用默认权限
        if (profile?.role === 'admin') {
          setAllowedModules(new Set(allNavigation.map(n => n.key)));
        } else {
          setAllowedModules(new Set(['dashboard', 'projects', 'tasks', 'files', 'stakeholders']));
        }
      } finally {
        setLoadingPerms(false);
      }
    };

    fetchPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role]);

  const navigation = allNavigation.filter(item =>
    allowedModules.size === 0 || allowedModules.has(item.key)
  );

  // 移动端底部导航项（显示所有导航）
  const bottomNavItems = navigation.map(item => ({
    key: item.key,
    label: item.name,
    icon: item.icon,
  }));

  // 获取当前激活的导航项
  const getActiveNavKey = () => {
    const currentItem = navigation.find(item =>
      location.pathname === item.href ||
      (item.href !== '/' && location.pathname.startsWith(item.href))
    );
    return currentItem?.key || 'dashboard';
  };

  const getNavColors = (color: string, isActive: boolean) => {
    const themeColor = color as ThemeColor;
    const navClasses = getNavItemClasses(themeColor, isActive);

    if (isActive) {
      return cn(navClasses, 'text-dark-900 font-semibold');
    }

    return navClasses;
  };

  return (
    <div className="min-h-screen bg-dark-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header 
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrolled 
            ? "bg-white/95 backdrop-blur-xl shadow-soft" 
            : "bg-white"
        )}
      >
        <div className="max-w-7xl xl:max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo and Navigation */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="flex items-center gap-2 group">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                    style={{
                      background: logoStyle.background,
                      boxShadow: logoStyle.shadow,
                    }}
                  >
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span 
                    className="text-xl font-display font-bold"
                    style={{
                      background: logoStyle.textGradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    PMSY
                  </span>
                </Link>
              </div>
              
              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/' && location.pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        getNavColors(item.color, isActive)
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <Notifications />
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-dark-700 hover:bg-dark-100 transition-all duration-200"
                >
                  <Avatar
                    userId={profile?.id}
                    avatarUrl={profile?.avatar_url}
                    name={profile?.full_name}
                    email={profile?.email}
                    size="sm"
                    rounded="xl"
                  />
                  <span className="hidden sm:block font-medium">{profile?.full_name || profile?.email || 'User'}</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", showUserMenu && "rotate-180")} />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg py-2 z-20 border border-dark-100 animate-scale-in">
                      <div className="px-4 py-3 border-b border-dark-100">
                        <p className="text-sm font-semibold text-dark-900">{profile?.full_name || 'User'}</p>
                        <p className="text-xs text-dark-500">{profile?.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-dark-700 hover:bg-dark-50 transition-colors"
                      >
                        <User className="w-4 h-4 text-dark-400" />
                        个人信息
                      </Link>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto ${isMobile ? 'pb-20' : ''}`}>
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && bottomNavItems.length > 0 && (
        <BottomNav
          items={bottomNavItems}
          activeKey={getActiveNavKey()}
          onChange={(key) => {
            const item = navigation.find(n => n.key === key);
            if (item) {
              navigate(item.href);
            }
          }}
        />
      )}
    </div>
  );
};

export default Layout;
