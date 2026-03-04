import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

import { PORT, NODE_ENV } from './config/constants';
import { testConnection as testDbConnection } from './config/database';
import { testConnection as testRedisConnection } from './config/redis';
import { testConnection as testMinioConnection, ensureBucketExists } from './config/minio';
import { logger } from './utils/logger';

// 导入路由
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import restRouter from './routes/rest';
import storageRouter from './routes/storage';
import projectsRouter from './routes/projects';
import projectSuppliersRouter from './routes/projectSuppliers';
import duplicateCheckRouter from './routes/duplicateCheck';
import taskDependenciesRouter from './routes/taskDependencies';
import backupRouter from './routes/system/backup.routes';
import uploadRouter from './routes/upload';
import filesRouter from './routes/files';

// 导入定时备份调度器
import { initBackupScheduler } from './jobs/backup.scheduler';

// 导入中间件
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// 中间件
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 日志中间件
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}

// 路由（兼容直接访问）
app.use('/health', healthRouter);
app.use('/auth/v1', authRouter);
app.use('/rest/v1', restRouter);
app.use('/storage/v1', storageRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/project-suppliers', projectSuppliersRouter);
app.use('/api/duplicate-check', duplicateCheckRouter);
app.use('/api/task-dependencies', taskDependenciesRouter);
app.use('/api/system/backup', backupRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/files', filesRouter);

// 路由（带 /api 前缀，兼容 Nginx 代理配置）
app.use('/api/health', healthRouter);
app.use('/api/auth/v1', authRouter);
app.use('/api/rest/v1', restRouter);
app.use('/api/storage/v1', storageRouter);

// 路由（带双 /api 前缀，兼容 Nginx 代理后的自定义 API）
app.use('/api/api/projects', projectsRouter);
app.use('/api/api/project-suppliers', projectSuppliersRouter);
app.use('/api/api/duplicate-check', duplicateCheckRouter);
app.use('/api/api/task-dependencies', taskDependenciesRouter);

// 根路由
app.get('/', (req, res) => {
  res.json({
    name: 'PMSY API',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// 404 处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    const dbConnected = await testDbConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    logger.info('Database connected successfully');

    // 测试 Redis 连接
    const redisConnected = await testRedisConnection();
    if (!redisConnected) {
      throw new Error('Redis connection failed');
    }
    logger.info('Redis connected successfully');

    // 测试 MinIO 连接
    const minioConnected = await testMinioConnection();
    if (!minioConnected) {
      throw new Error('MinIO connection failed');
    }
    logger.info('MinIO connected successfully');

    // 确保存储桶存在
    await ensureBucketExists();

    // 初始化定时备份调度器
    await initBackupScheduler();

    // 启动 HTTP 服务
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT} in ${NODE_ENV} mode`);
      console.log(`🚀 Server ready at http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// 启动
startServer();
