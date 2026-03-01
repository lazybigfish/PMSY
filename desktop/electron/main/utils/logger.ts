import winston from 'winston';
import { app } from 'electron';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

// 日志文件路径
const logDir = isDev 
  ? path.join(process.cwd(), 'logs')
  : path.join(app.getPath('userData'), 'logs');

// 创建日志记录器
export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'pmsy-desktop' },
  transports: [
    // 错误日志
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 所有日志
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// 开发环境同时输出到控制台
if (isDev) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// 日志级别说明：
// error: 错误信息
// warn: 警告信息
// info: 一般信息
// debug: 调试信息（仅开发环境）
