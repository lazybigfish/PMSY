import express from 'express';
import cors from 'cors';
import path from 'path';
import { app } from 'electron';
import { logger } from './utils/logger.js';
import { setupAuthRoutes } from './routes/auth.js';
import { setupRestRoutes } from './routes/rest.js';
import { setupStorageRoutes } from './routes/storage.js';
import { setupProjectRoutes } from './routes/projects.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

let serverInstance: ReturnType<typeof express.application.listen> | null = null;

/**
 * 设置并启动 Express 服务器
 */
export async function setupServer(): Promise<{ close: () => void }> {
  const expressApp = express();
  
  // 基础中间件
  expressApp.use(cors({
    origin: true,
    credentials: true,
  }));
  expressApp.use(express.json({ limit: '50mb' }));
  expressApp.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // 请求日志
  expressApp.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
  
  // 健康检查
  expressApp.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // 认证路由（不需要 JWT）
  expressApp.use('/auth/v1', setupAuthRoutes());
  
  // 以下路由需要认证
  expressApp.use(authMiddleware);
  
  // REST API 路由
  expressApp.use('/rest/v1', setupRestRoutes());
  
  // 文件存储路由
  expressApp.use('/storage/v1', setupStorageRoutes());
  
  // 项目管理路由
  expressApp.use('/api/projects', setupProjectRoutes());
  
  // 错误处理
  expressApp.use(errorHandler);
  
  // 启动服务器（使用随机端口）
  return new Promise((resolve, reject) => {
    serverInstance = expressApp.listen(0, '127.0.0.1', () => {
      const address = serverInstance?.address();
      if (address && typeof address !== 'string') {
        const port = address.port;
        logger.info(`Express server running on port ${port}`);
        
        // 保存端口到全局，供 IPC 使用
        global.serverPort = port;
        
        resolve({
          close: () => {
            serverInstance?.close();
            logger.info('Express server closed');
          }
        });
      } else {
        reject(new Error('Failed to get server address'));
      }
    });
    
    serverInstance.on('error', (error) => {
      logger.error('Server error:', error);
      reject(error);
    });
  });
}

// 扩展全局对象类型
declare global {
  var serverPort: number;
}
