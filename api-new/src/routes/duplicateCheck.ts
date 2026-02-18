/**
 * 查重路由
 * 处理名称查重API请求
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { checkDuplicate, DuplicateCheckType } from '../services/duplicateCheckService';
import { ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// 速率限制存储（简单实现，生产环境建议使用Redis）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // 每分钟最多10次
const RATE_WINDOW = 60 * 1000; // 1分钟

/**
 * 检查速率限制
 */
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + RATE_WINDOW,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * POST /api/duplicate-check
 * 检查名称是否重复
 */
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.sub;
    const userRole = req.user?.role;

    // 速率限制检查
    const rateLimitKey = `duplicate-check:${userId}`;
    if (!checkRateLimit(rateLimitKey)) {
      throw new ValidationError('请求过于频繁，请稍后再试');
    }

    const { type, name, excludeId, projectId } = req.body;

    // 参数校验
    if (!type || !name) {
      throw new ValidationError('缺少必要参数：type 和 name');
    }

    const validTypes: DuplicateCheckType[] = ['project', 'task', 'supplier', 'client'];
    if (!validTypes.includes(type)) {
      throw new ValidationError(`无效的查重类型: ${type}`);
    }

    // 任务查重需要projectId
    if (type === 'task' && !projectId) {
      throw new ValidationError('任务查重需要提供 projectId');
    }

    const result = await checkDuplicate({
      type,
      name,
      excludeId,
      projectId,
      userId,
      userRole,
    });

    logger.debug(`[DuplicateCheck] 用户 ${userId} 检查 ${type} 名称: ${name}, 结果: ${result.exists}`);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
