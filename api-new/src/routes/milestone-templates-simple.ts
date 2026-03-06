/**
 * 简化的里程碑模板路由 - 用于测试
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import dbService from '../services/dbService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/milestone-templates/available
 * 获取当前用户可用的模板列表（简化版）
 */
router.get('/available', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.sub;
    
    logger.info(`[MilestoneTemplates] 获取可用模板列表 - userId: ${userId}`);

    // 最简单的查询，只查询基本字段
    const templates = await dbService.getDb()('template_versions')
      .where('is_active', true)
      .select('id', 'name', 'version_number as version', 'description', 'created_at');

    logger.info(`[MilestoneTemplates] 查询成功: ${templates.length} 条记录`);

    // 添加默认值
    const templatesWithDefaults = templates.map((t: any) => ({
      ...t,
      is_system: false,
      is_public: true,
      tags: [],
      use_count: 0,
      phaseCount: 0,
      taskCount: 0,
    }));

    res.json({
      success: true,
      data: templatesWithDefaults,
      total: templatesWithDefaults.length,
    });
  } catch (error: any) {
    logger.error(`[MilestoneTemplates] 获取可用模板列表失败: ${error.message}`, error);
    res.status(500).json({
      success: false,
      message: error.message || '获取模板列表失败',
    });
  }
});

export default router;
