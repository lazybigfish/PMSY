import { Router } from 'express';
import { testConnection as testDbConnection } from '../config/database';
import { testConnection as testRedisConnection } from '../config/redis';
import { testConnection as testMinioConnection } from '../config/minio';

const router = Router();

/**
 * 健康检查接口
 * GET /health
 */
router.get('/', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    minio: false,
    timestamp: new Date().toISOString(),
  };

  try {
    checks.database = await testDbConnection();
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  try {
    checks.redis = await testRedisConnection();
  } catch (error) {
    console.error('Redis health check failed:', error);
  }

  try {
    checks.minio = await testMinioConnection();
  } catch (error) {
    console.error('MinIO health check failed:', error);
  }

  const allHealthy = checks.database && checks.redis && checks.minio;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'error',
    ...checks,
  });
});

/**
 * 简单健康检查（用于负载均衡）
 * GET /health/simple
 */
router.get('/simple', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
