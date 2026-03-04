/**
 * 文件访问路由
 * 支持后端代理访问文件（用于需要权限控制的场景）
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { NotFoundError } from '../middleware/errorHandler';
import * as storageService from '../services/storageService';
import { db } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/files/:bucket/:path(*)
 * 通过后端代理访问文件（需要认证，支持权限控制）
 */
router.get(
  '/:bucket/:path(*)',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bucket } = req.params;
      // * 通配符匹配的内容在 req.params[0]
      const filePath = req.params[0];

      if (!filePath) {
        throw new NotFoundError('文件路径不能为空');
      }

      logger.info(`[Files] Accessing file: ${bucket}/${filePath}, user: ${req.user?.sub}`);

      // 检查文件是否存在
      const exists = await storageService.fileExists(bucket, filePath);
      if (!exists) {
        throw new NotFoundError('文件不存在');
      }

      // 获取文件元数据
      const stat = await storageService.getFileStat(bucket, filePath);

      // 获取原始文件名
      const originalFilename = filePath.split('/').pop() || 'download';

      // 获取文件内容类型
      const contentType = stat.metaData['content-type'] || 'application/octet-stream';

      // 设置响应头
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 缓存1年
      res.setHeader('Access-Control-Allow-Origin', '*');

      // 对于图片和PDF，设置 inline 以便浏览器直接显示
      const isInlineDisplayable = contentType.startsWith('image/') ||
                                   contentType === 'application/pdf' ||
                                   contentType.startsWith('text/');

      if (!isInlineDisplayable || req.query.download === 'true') {
        // 对文件名进行 UTF-8 编码以支持中文
        const encodedFilename = encodeURIComponent(originalFilename);
        res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
      } else {
        res.setHeader('Content-Disposition', `inline; filename="${originalFilename}"`);
      }

      // 获取文件流并返回
      const stream = await storageService.downloadFile(bucket, filePath);
      stream.pipe(res);

      // 异步更新访问记录
      try {
        await db('files')
          .where({ storage_path: `${bucket}/${filePath}` })
          .increment('view_count', 1)
          .update({ last_accessed_at: new Date().toISOString() });
      } catch (error) {
        logger.warn('[Files] Failed to update view count:', error);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/files/presigned-urls
 * 批量获取预签名 URL
 */
router.post(
  '/presigned-urls',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { files, expirySeconds = 3600 } = req.body;

      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: '请提供文件列表' },
        });
      }

      const results = await Promise.all(
        files.map(async (file: { bucket: string; filePath: string }) => {
          try {
            const url = await storageService.getPresignedUrl(
              file.bucket,
              file.filePath,
              expirySeconds
            );
            return {
              bucket: file.bucket,
              filePath: file.filePath,
              url,
              success: true,
            };
          } catch (error) {
            logger.error(`[Files] Failed to generate presigned URL: ${file.bucket}/${file.filePath}`, error);
            return {
              bucket: file.bucket,
              filePath: file.filePath,
              url: null,
              success: false,
              error: '生成 URL 失败',
            };
          }
        })
      );

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/files/config
 * 获取文件访问配置
 */
router.get('/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      minioPublicUrl: process.env.MINIO_PUBLIC_URL || 'http://localhost:9000',
      publicBuckets: ['images', 'forum', 'avatars'],
      privateBuckets: ['documents', 'contracts', 'private'],
    },
  });
});

export default router;
