import { contextBridge, ipcRenderer } from 'electron';

/**
 * Electron Preload 脚本
 * 在渲染进程中暴露安全的 API
 */

// 定义 API 接口
export interface ElectronAPI {
  // 应用信息
  getAppInfo: () => Promise<{
    version: string;
    name: string;
    userDataPath: string;
  }>;

  // 服务器端口
  getServerPort: () => Promise<number>;

  // 数据库操作
  backupDatabase: () => Promise<{ success: boolean; path?: string; error?: string }>;
  restoreDatabase: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
  listBackups: () => Promise<Array<{
    name: string;
    path: string;
    size: number;
    createdAt: Date;
  }>>;

  // 对话框
  selectFile: (options?: any) => Promise<{ canceled: boolean; filePaths?: string[] }>;
  selectSavePath: (options?: any) => Promise<{ canceled: boolean; filePath?: string }>;
  selectDirectory: (options?: any) => Promise<{ canceled: boolean; filePaths?: string[] }>;

  // 系统操作
  openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  showItemInFolder: (filePath: string) => Promise<{ success: boolean }>;

  // 数据导入导出
  exportData: (params: {
    data: any;
    filename: string;
    type: 'json' | 'csv' | 'excel';
  }) => Promise<{ success: boolean; path?: string; error?: string; canceled?: boolean }>;
  importData: (params: {
    type: 'json' | 'csv';
  }) => Promise<{ success: boolean; data?: any; path?: string; error?: string; canceled?: boolean }>;
}

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),

  // 服务器端口
  getServerPort: () => ipcRenderer.invoke('server:getPort'),

  // 数据库操作
  backupDatabase: () => ipcRenderer.invoke('database:backup'),
  restoreDatabase: (backupPath: string) => ipcRenderer.invoke('database:restore', backupPath),
  listBackups: () => ipcRenderer.invoke('database:listBackups'),

  // 对话框
  selectFile: (options?: any) => ipcRenderer.invoke('dialog:selectFile', options),
  selectSavePath: (options?: any) => ipcRenderer.invoke('dialog:selectSavePath', options),
  selectDirectory: (options?: any) => ipcRenderer.invoke('dialog:selectDirectory', options),

  // 系统操作
  openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),

  // 数据导入导出
  exportData: (params: any) => ipcRenderer.invoke('data:export', params),
  importData: (params: any) => ipcRenderer.invoke('data:import', params),
} as ElectronAPI);

// 声明全局类型
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
