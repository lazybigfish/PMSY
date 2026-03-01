/**
 * 桌面版类型声明
 */

// Electron API 接口
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

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
