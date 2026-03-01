import { ipcMain, app, dialog, shell } from 'electron';
import { getDatabase } from './database.js';
import { logger } from './utils/logger.js';
import path from 'path';
import fs from 'fs';

/**
 * 设置 IPC 处理器
 * 处理渲染进程与主进程之间的通信
 */
export function setupIpcHandlers(): void {
  // 获取应用信息
  ipcMain.handle('app:getInfo', () => {
    return {
      version: app.getVersion(),
      name: app.getName(),
      userDataPath: app.getPath('userData'),
    };
  });

  // 获取服务器端口（用于前端 API 调用）
  ipcMain.handle('server:getPort', () => {
    return global.serverPort || 0;
  });

  // 数据库备份
  ipcMain.handle('database:backup', async () => {
    try {
      const db = getDatabase();
      const backupPath = path.join(
        app.getPath('userData'),
        'backups',
        `pmsy_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`
      );

      // 确保备份目录存在
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // 执行备份
      db.backup(backupPath);

      logger.info(`Database backed up to: ${backupPath}`);
      return { success: true, path: backupPath };
    } catch (error) {
      logger.error('Database backup error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 数据库恢复
  ipcMain.handle('database:restore', async (_, backupPath: string) => {
    try {
      // 验证备份文件
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'Backup file not found' };
      }

      // 关闭当前数据库连接
      const db = getDatabase();
      db.close();

      // 复制备份文件到数据库位置
      const dbPath = path.join(app.getPath('userData'), 'database', 'pmsy.db');
      fs.copyFileSync(backupPath, dbPath);

      logger.info(`Database restored from: ${backupPath}`);
      return { success: true };
    } catch (error) {
      logger.error('Database restore error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 获取备份列表
  ipcMain.handle('database:listBackups', async () => {
    try {
      const backupDir = path.join(app.getPath('userData'), 'backups');

      if (!fs.existsSync(backupDir)) {
        return [];
      }

      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const stat = fs.statSync(path.join(backupDir, f));
          return {
            name: f,
            path: path.join(backupDir, f),
            size: stat.size,
            createdAt: stat.birthtime,
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return files;
    } catch (error) {
      logger.error('List backups error:', error);
      return [];
    }
  });

  // 选择文件对话框
  ipcMain.handle('dialog:selectFile', async (_, options) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      ...options,
    });
    return result;
  });

  // 选择保存路径对话框
  ipcMain.handle('dialog:selectSavePath', async (_, options) => {
    const result = await dialog.showSaveDialog(options);
    return result;
  });

  // 选择目录对话框
  ipcMain.handle('dialog:selectDirectory', async (_, options) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      ...options,
    });
    return result;
  });

  // 打开文件（使用系统默认程序）
  ipcMain.handle('shell:openPath', async (_, filePath: string) => {
    try {
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      logger.error('Open path error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 在文件夹中显示文件
  ipcMain.handle('shell:showItemInFolder', async (_, filePath: string) => {
    shell.showItemInFolder(filePath);
    return { success: true };
  });

  // 导出数据到文件
  ipcMain.handle('data:export', async (_, { data, filename, type }) => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: filename,
        filters: getFiltersByType(type),
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      let content: string | Buffer;

      switch (type) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          break;
        case 'csv':
          content = convertToCSV(data);
          break;
        case 'excel':
          // Excel 导出需要额外处理，这里先返回错误
          return { success: false, error: 'Excel export not implemented in IPC' };
        default:
          content = String(data);
      }

      fs.writeFileSync(result.filePath, content);

      logger.info(`Data exported to: ${result.filePath}`);
      return { success: true, path: result.filePath };
    } catch (error) {
      logger.error('Export error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // 导入数据
  ipcMain.handle('data:import', async (_, { type }) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: getFiltersByType(type),
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const content = fs.readFileSync(filePath, 'utf-8');

      let data: any;

      switch (type) {
        case 'json':
          data = JSON.parse(content);
          break;
        case 'csv':
          data = parseCSV(content);
          break;
        default:
          data = content;
      }

      return { success: true, data, path: filePath };
    } catch (error) {
      logger.error('Import error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  logger.info('IPC handlers registered');
}

/**
 * 根据文件类型获取过滤器
 */
function getFiltersByType(type: string) {
  const filters: Record<string, any[]> = {
    json: [{ name: 'JSON Files', extensions: ['json'] }],
    csv: [{ name: 'CSV Files', extensions: ['csv'] }],
    excel: [
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
      { name: 'CSV Files', extensions: ['csv'] },
    ],
    pdf: [{ name: 'PDF Files', extensions: ['pdf'] }],
    all: [{ name: 'All Files', extensions: ['*'] }],
  };

  return filters[type] || filters.all;
}

/**
 * 将数据转换为 CSV 格式
 */
function convertToCSV(data: any[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      // 处理包含逗号或引号的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * 解析 CSV 格式
 */
function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }

  return rows;
}
