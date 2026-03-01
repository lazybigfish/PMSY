import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupDatabase } from './database.js';
import { setupServer } from './server.js';
import { setupIpcHandlers } from './ipc-handlers.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let server: { close: () => void } | null = null;

const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  logger.info('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'PMSY 项目管理',
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  // 加载页面
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // 处理新窗口打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  logger.info('Main window created successfully');
}

async function initializeApp() {
  try {
    logger.info('Initializing PMSY Desktop...');
    logger.info(`App version: ${app.getVersion()}`);
    logger.info(`User data path: ${app.getPath('userData')}`);

    // 1. 初始化数据库
    logger.info('Setting up database...');
    await setupDatabase();
    logger.info('Database setup completed');

    // 2. 启动本地服务器
    logger.info('Starting local server...');
    server = await setupServer();
    logger.info('Local server started');

    // 3. 设置 IPC 处理器
    setupIpcHandlers();
    logger.info('IPC handlers registered');

    // 4. 创建主窗口
    await createWindow();

    logger.info('PMSY Desktop initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize app:', error);
    throw error;
  }
}

// 应用生命周期
app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  logger.info('All windows closed');
  if (server) {
    server.close();
    logger.info('Server closed');
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  logger.info('App is quitting...');
  if (server) {
    server.close();
  }
});

// 安全：阻止新的窗口创建
app.on('web-contents-created', (_, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  app.quit();
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});
