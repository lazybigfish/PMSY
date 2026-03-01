import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Building2, Users, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const StakeholderLayout = () => {
  const location = useLocation();
  
  const tabs = [
    { name: '客户库', href: '/stakeholders/clients', icon: Users, color: 'primary' },
    { name: '供应商库', href: '/stakeholders/suppliers', icon: Building2, color: 'sun' },
  ];

  const getTabColors = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'sun':
          return 'border-sun-500 text-sun-600';
        case 'primary':
          return 'border-primary-500 text-primary-600';
        default:
          return 'border-dark-500 text-dark-700';
      }
    }
    return 'border-transparent text-dark-500 hover:text-dark-700 hover:border-dark-300';
  };

  const getTabIconColors = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'sun':
          return 'text-sun-500';
        case 'primary':
          return 'text-primary-500';
        default:
          return 'text-dark-500';
      }
    }
    return 'text-dark-400 group-hover:text-dark-500';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center space-x-2 text-sm text-dark-500">
        <Link to="/stakeholders" className="hover:text-primary-600 transition-colors">相关方</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-dark-900 font-medium">
          {tabs.find(t => location.pathname.startsWith(t.href))?.name || '相关方管理'}
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-200">
        <nav className="-mb-px flex space-x-1">
          {tabs.map((tab) => {
            const isActive = location.pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.name}
                to={tab.href}
                className={cn(
                  "group inline-flex items-center py-4 px-4 border-b-2 font-medium text-sm rounded-t-xl transition-all duration-200",
                  getTabColors(tab.color, isActive)
                )}
              >
                <tab.icon
                  className={cn(
                    "mr-2 h-5 w-5 transition-colors",
                    getTabIconColors(tab.color, isActive)
                  )}
                />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <Outlet />
    </div>
  );
};

export default StakeholderLayout;
