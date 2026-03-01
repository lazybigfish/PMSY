/**
 * 桌面版 API 适配层
 * 自动检测运行环境并配置 API 基础 URL
 */

// 检测是否在 Electron 环境中运行
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

// 获取 API 基础 URL
export const getApiBaseUrl = async (): Promise<string> => {
  if (isElectron()) {
    // 桌面版：获取本地服务器端口
    const port = await window.electronAPI.getServerPort();
    return `http://127.0.0.1:${port}`;
  }
  
  // Web 版：使用环境变量或默认配置
  return import.meta.env.VITE_API_URL || '';
};

// 获取认证 Token
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// 设置认证 Token
export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
};

// 清除认证 Token
export const clearAuthToken = (): void => {
  localStorage.removeItem('token');
};

// 通用的 API 请求函数
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const baseUrl = await getApiBaseUrl();
  const token = getAuthToken();
  
  const url = `${baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Unknown Error',
      message: `HTTP ${response.status}`,
    }));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }
  
  // 处理空响应
  if (response.status === 204) {
    return undefined as T;
  }
  
  return response.json();
};

// REST API 快捷方法
export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) => {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return apiRequest<T>(`${endpoint}${queryString}`, { method: 'GET' });
  },
  
  post: <T>(endpoint: string, data: any) => {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  patch: <T>(endpoint: string, data: any) => {
    return apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  delete: <T>(endpoint: string) => {
    return apiRequest<T>(endpoint, { method: 'DELETE' });
  },
};

// 桌面版特有的 API
export const desktopApi = {
  // 应用信息
  getAppInfo: () => {
    if (!isElectron()) throw new Error('Not in Electron environment');
    return window.electronAPI.getAppInfo();
  },
  
  // 数据库备份
  backupDatabase: () => {
    if (!isElectron()) throw new Error('Not in Electron environment');
    return window.electronAPI.backupDatabase();
  },
  
  // 数据库恢复
  restoreDatabase: (backupPath: string) => {
    if (!isElectron()) throw new Error('Not in Electron environment');
    return window.electronAPI.restoreDatabase(backupPath);
  },
  
  // 获取备份列表
  listBackups: () => {
    if (!isElectron()) throw new Error('Not in Electron environment');
    return window.electronAPI.listBackups();
  },
  
  // 选择文件
  selectFile: (options?: any) => {
    if (!isElectron()) throw new Error('Not in Electron environment');
    return window.electronAPI.selectFile(options);
  },
  
  // 选择保存路径
  selectSavePath: (options?: any) => {
    if (!isElectron()) throw new Error('Not in Electron environment');
    return window.electronAPI.selectSavePath(options);
  },
  
  // 打开文件
  openPath: (filePath: string) => {
    if (!isElectron()) throw new Error('Not in Electron environment');
    return window.electronAPI.openPath(filePath);
  },
  
  // 在文件夹中显示
  showItemInFolder: (filePath: string) => {
    if (!isElectron()) throw new Error('Not in Electron environment');
    return window.electronAPI.showItemInFolder(filePath);
  },
  
  // 导出数据
  exportData: (params: { data: any; filename: string; type: 'json' | 'csv' | 'excel' }) => {
    if (!isElectron()) throw new Error('Not in Electron environment');
    return window.electronAPI.exportData(params);
  },
  
  // 导入数据
  importData: (params: { type: 'json' | 'csv' }) => {
    if (!isElectron()) throw new Error('Not in Electron environment');
    return window.electronAPI.importData(params);
  },
};
