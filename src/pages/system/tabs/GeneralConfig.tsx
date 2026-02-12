import React from 'react';
import { Settings, Bell } from 'lucide-react';

export default function GeneralConfig() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">系统通用配置</h3>
      
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <Settings className="w-5 h-5 text-gray-500 mr-2" />
            <h4 className="text-base font-medium text-gray-900">基础设置</h4>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">系统名称</label>
              <input type="text" defaultValue="PMSY 项目管理系统" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">默认语言</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                <option>简体中文</option>
                <option>英文</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-gray-500 mr-2" />
            <h4 className="text-base font-medium text-gray-900">通知设置</h4>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">启用邮件通知</span>
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">启用系统消息通知</span>
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          保存配置
        </button>
      </div>
    </div>
  );
}
