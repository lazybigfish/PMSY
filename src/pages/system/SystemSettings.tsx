import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import AIConfig from './tabs/AIConfig';
import ReportTemplates from './tabs/ReportTemplates';
import UserManagement from './tabs/UserManagement';
import RoleManagement from './tabs/RoleManagement';
import MilestoneTemplates from './tabs/MilestoneTemplates';
import GeneralConfig from './tabs/GeneralConfig';
import HotNewsConfig from './tabs/HotNewsConfig';
import { useAuth } from '../../context/AuthContext';

const SystemSettings = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="flex space-x-1 rounded-xl bg-gray-100 p-1 overflow-x-auto">
          <TabsTrigger
            value="users"
            className="flex-1 min-w-[100px] rounded-lg py-2.5 text-sm font-medium leading-5 text-gray-700 ring-white ring-opacity-60 ring-offset-2 focus:outline-none focus:ring-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow transition-all"
          >
            用户管理
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="flex-1 min-w-[100px] rounded-lg py-2.5 text-sm font-medium leading-5 text-gray-700 ring-white ring-opacity-60 ring-offset-2 focus:outline-none focus:ring-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow transition-all"
          >
            角色权限
          </TabsTrigger>
          <TabsTrigger
            value="milestone-templates"
            className="flex-1 min-w-[100px] rounded-lg py-2.5 text-sm font-medium leading-5 text-gray-700 ring-white ring-opacity-60 ring-offset-2 focus:outline-none focus:ring-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow transition-all"
          >
            里程碑模板
          </TabsTrigger>
          <TabsTrigger
            value="report-templates"
            className="flex-1 min-w-[100px] rounded-lg py-2.5 text-sm font-medium leading-5 text-gray-700 ring-white ring-opacity-60 ring-offset-2 focus:outline-none focus:ring-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow transition-all"
          >
            报告模板
          </TabsTrigger>
          <TabsTrigger
            value="ai-config"
            className="flex-1 min-w-[100px] rounded-lg py-2.5 text-sm font-medium leading-5 text-gray-700 ring-white ring-opacity-60 ring-offset-2 focus:outline-none focus:ring-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow transition-all"
          >
            AI配置
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="hot-news"
              className="flex-1 min-w-[100px] rounded-lg py-2.5 text-sm font-medium leading-5 text-gray-700 ring-white ring-opacity-60 ring-offset-2 focus:outline-none focus:ring-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow transition-all"
            >
              热点配置
            </TabsTrigger>
          )}
          <TabsTrigger
            value="general"
            className="flex-1 min-w-[100px] rounded-lg py-2.5 text-sm font-medium leading-5 text-gray-700 ring-white ring-opacity-60 ring-offset-2 focus:outline-none focus:ring-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow transition-all"
          >
            通用设置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-4 outline-none">
          <UserManagement />
        </TabsContent>

        <TabsContent value="roles" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-4 outline-none">
          <RoleManagement />
        </TabsContent>

        <TabsContent value="milestone-templates" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-4 outline-none">
          <MilestoneTemplates />
        </TabsContent>

        <TabsContent value="report-templates" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-4 outline-none">
          <ReportTemplates />
        </TabsContent>

        <TabsContent value="ai-config" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-4 outline-none">
          <AIConfig />
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="hot-news" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-4 outline-none">
            <HotNewsConfig />
          </TabsContent>
        )}

        <TabsContent value="general" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-4 outline-none">
          <GeneralConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemSettings;
