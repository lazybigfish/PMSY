import { Router } from 'express';
import { testConnection as testDbConnection } from '../config/database';
import { testConnection as testRedisConnection } from '../config/redis';
import { testConnection as testMinioConnection } from '../config/minio';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * 获取公开的系统配置
 * GET /health/public-config
 * 无需认证，供登录页等公开页面使用
 */
router.get('/public-config', async (req, res) => {
  try {
    const { db } = await import('../config/database');

    // 获取登录页主题配置
    const themeConfig = await db('system_configs')
      .where('key', 'login_page_theme')
      .select('value')
      .first();

    // 获取登录页标题配置
    const titleConfig = await db('system_configs')
      .where('key', 'login_page_title')
      .select('value')
      .first();

    // 获取登录页副标题配置
    const subtitleConfig = await db('system_configs')
      .where('key', 'login_page_subtitle')
      .select('value')
      .first();

    res.json({
      login_page_theme: themeConfig?.value || 'v1',
      login_page_title: titleConfig?.value || 'PMSY 项目管理系统',
      login_page_subtitle: subtitleConfig?.value || '提升团队协作效率，管理每一个精彩项目',
    });
  } catch (error) {
    console.error('获取公开配置失败:', error);
    // 返回默认配置
    res.json({
      login_page_theme: 'v1',
      login_page_title: 'PMSY 项目管理系统',
      login_page_subtitle: '提升团队协作效率，管理每一个精彩项目',
    });
  }
});

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

/**
 * 更新系统配置（管理员权限）
 * POST /health/admin/config
 * 用于更新登录页主题等系统配置
 */
router.post('/admin/config', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { db } = await import('../config/database');
    const { key, value } = req.body;

    if (!key || value === undefined) {
      res.status(400).json({ error: '缺少必要参数: key, value' });
      return;
    }

    // 检查记录是否存在
    const existing = await db('system_configs')
      .where('key', key)
      .first();

    if (existing) {
      // 更新现有记录
      await db('system_configs')
        .where('key', key)
        .update({
          value,
          updated_at: new Date().toISOString(),
        });
    } else {
      // 插入新记录
      await db('system_configs').insert({
        key,
        value,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: '配置已更新' });
  } catch (error) {
    console.error('更新系统配置失败:', error);
    res.status(500).json({ error: '更新配置失败' });
  }
});

export default router;
