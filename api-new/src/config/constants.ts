/**
 * 常量定义
 */

// 服务器配置
export const PORT = process.env.PORT || 3001;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const API_URL = process.env.API_URL || `http://localhost:${PORT}`;

// JWT 配置
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  issuer: process.env.JWT_ISSUER || 'pmsy-api',
  audience: process.env.JWT_AUDIENCE || 'pmsy-client',
};

// 数据库配置
export const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'pmsy',
  password: process.env.DB_PASSWORD || 'pmsy_dev_password',
  database: process.env.DB_NAME || 'pmsy_dev',
};

// Redis 配置
export const REDIS_CONFIG = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
};

// MinIO 配置
const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost:9000';
const [minioHost, minioPort] = minioEndpoint.includes(':') 
  ? minioEndpoint.split(':') 
  : [minioEndpoint, '9000'];

export const MINIO_CONFIG = {
  endPoint: minioHost,
  port: parseInt(minioPort),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  bucketName: process.env.MINIO_BUCKET_NAME || 'files',
};

// 日志配置
export const LOG_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
};

// 密码加密配置
export const BCRYPT_SALT_ROUNDS = 10;

// 分页配置
export const PAGINATION_CONFIG = {
  defaultLimit: 20,
  maxLimit: 100,
};

// 文件上传配置
export const UPLOAD_CONFIG = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
};
