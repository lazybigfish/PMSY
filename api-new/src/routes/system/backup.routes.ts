/**
 * 系统备份路由
 * 提供备份管理、恢复、定时备份配置等接口
 */

import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import { requireAuth, requireAdmin as requireAdminMiddleware } from '../../middleware/auth';
import {
  createBackup,
  getBackupList,
  getBackupById,
  deleteBackup,
  getBackupFilePath,
  backupFileExists,
} from '../../services/backup/BackupService';
import {
  previewRestore,
  restoreBackup,
  verifyBackup,
} from '../../services/backup/RestoreService';
import { query, updateById } from '../../services/dbService';
import { BackupScheduleConfig } from '../../types/backup.types';

const router = Router();

// 临时上传目录
const uploadDir = path.join(process.cwd(), 'uploads', 'temp');

// 确保上传目录存在
(async () => {
  await fs.mkdir(uploadDir, { recursive: true });
})();

// 配置 multer
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `backup-${uniqueSuffix}.zip`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 ZIP 格式的备份文件'));
    }
  },
});

// 使用中间件
const authenticate = requireAuth;

/**
 * POST /api/system/backup
 * 创建备份
 */
router.post('/', authenticate, requireAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, options } = req.body;
    const userId = req.user!.sub;

    // 异步执行备份，立即返回备份ID
    const backup = await createBackup(userId, name, description, options);

    res.status(201).json({
      id: backup.id,
      status: backup.status,
      message: '备份任务已创建',
    });
  } catch (error) {
    console.error('创建备份失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '创建备份失败',
    });
  }
});

/**
 * GET /api/system/backup
 * 获取备份列表
 */
router.get('/', authenticate, requireAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const backups = await getBackupList();
    res.json({ backups, total: backups.length });
  } catch (error) {
    console.error('获取备份列表失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取备份列表失败',
    });
  }
});

/**
 * GET /api/system/backup/schedule
 * 获取定时备份配置
 * 注意：此路由必须在 /:id 路由之前定义，否则会被误匹配为 id 参数
 */
router.get('/schedule', authenticate, requireAdminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const configs = await query('system_settings', {
      eq: { key: 'backup_schedule' },
      limit: 1,
    });

    if (configs.length === 0) {
      res.status(404).json({ error: '定时备份配置不存在' });
      return;
    }

    res.json({ config: configs[0].value });
  } catch (error) {
    console.error('获取定时备份配置失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取定时备份配置失败',
    });
  }
});

/**
 * PUT /api/system/backup/schedule
 * 更新定时备份配置
 * 注意：此路由必须在 /:id 路由之前定义，否则会被误匹配为 id 参数
 */
router.put('/schedule', authenticate, requireAdminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const config: BackupScheduleConfig = req.body;

    // 验证配置
    if (typeof config.enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled 必须是布尔值' });
      return;
    }

    if (!config.cron || typeof config.cron !== 'string') {
      res.status(400).json({ error: 'cron 必须是字符串' });
      return;
    }

    if (typeof config.keepCount !== 'number' || config.keepCount < 1) {
      res.status(400).json({ error: 'keepCount 必须是大于0的数字' });
      return;
    }

    // 更新配置
    const configs = await query('system_settings', {
      eq: { key: 'backup_schedule' },
      limit: 1,
    });

    if (configs.length === 0) {
      res.status(404).json({ error: '定时备份配置不存在' });
      return;
    }

    await updateById('system_settings', configs[0].id, {
      value: config,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('更新定时备份配置失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '更新定时备份配置失败',
    });
  }
});

/**
 * GET /api/system/backup/:id
 * 获取备份详情
 */
router.get('/:id', authenticate, requireAdminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const backup = await getBackupById(id);

    if (!backup) {
      res.status(404).json({ error: '备份不存在' });
      return;
    }

    res.json({ backup });
  } catch (error) {
    console.error('获取备份详情失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '获取备份详情失败',
    });
  }
});

/**
 * GET /api/system/backup/:id/download
 * 下载备份文件
 */
router.get('/:id/download', authenticate, requireAdminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const backup = await getBackupById(id);

    if (!backup) {
      res.status(404).json({ error: '备份不存在' });
      return;
    }

    if (backup.status !== 'completed') {
      res.status(400).json({ error: '备份未完成，无法下载' });
      return;
    }

    const filePath = getBackupFilePath(backup.filePath);

    // 检查文件是否存在
    if (!(await backupFileExists(backup.filePath))) {
      res.status(404).json({ error: '备份文件不存在' });
      return;
    }

    // 设置下载头
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.filePath}"`);

    // 流式传输文件
    const fileStream = await fs.readFile(filePath);
    res.send(fileStream);
  } catch (error) {
    console.error('下载备份失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '下载备份失败',
    });
  }
});

/**
 * DELETE /api/system/backup/:id
 * 删除备份
 */
router.delete('/:id', authenticate, requireAdminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await deleteBackup(id);

    if (!success) {
      res.status(404).json({ error: '备份不存在' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除备份失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '删除备份失败',
    });
  }
});

/**
 * POST /api/system/backup/:id/verify
 * 验证备份包完整性
 */
router.post('/:id/verify', authenticate, requireAdminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const backup = await getBackupById(id);

    if (!backup) {
      res.status(404).json({ error: '备份不存在' });
      return;
    }

    const filePath = getBackupFilePath(backup.filePath);
    const result = await verifyBackup(filePath);

    res.json(result);
  } catch (error) {
    console.error('验证备份失败:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '验证备份失败',
    });
  }
});

/**
 * POST /api/system/restore/preview
 * 预览备份包
 */
router.post(
  '/restore/preview',
  authenticate,
  requireAdminMiddleware,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: '请上传备份文件' });
        return;
      }

      const filePath = req.file.path;
      const preview = await previewRestore(filePath);

      // 删除临时文件
      await fs.unlink(filePath).catch(() => {});

      res.json({ preview });
    } catch (error) {
      // 删除临时文件
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      console.error('预览备份失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '预览备份失败',
      });
    }
  }
);

/**
 * POST /api/system/restore
 * 执行恢复
 */
router.post(
  '/restore',
  authenticate,
  requireAdminMiddleware,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: '请上传备份文件' });
        return;
      }

      const { mode = 'full', conflictResolution = 'skip' } = req.body;
      const filePath = req.file.path;

      // 执行恢复
      const result = await restoreBackup(filePath, mode, conflictResolution);

      // 删除临时文件
      await fs.unlink(filePath).catch(() => {});

      res.json({ result });
    } catch (error) {
      // 删除临时文件
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      console.error('恢复备份失败:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '恢复备份失败',
      });
    }
  }
);

export default router;
