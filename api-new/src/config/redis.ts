import Redis from 'ioredis';
import { REDIS_CONFIG } from './constants';

/**
 * Redis 客户端实例
 */
export const redis = new Redis(REDIS_CONFIG.url, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

/**
 * Redis 错误处理
 */
redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

/**
 * 测试 Redis 连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
}

/**
 * 关闭 Redis 连接
 */
export async function closeConnection(): Promise<void> {
  await redis.quit();
}

export default redis;
