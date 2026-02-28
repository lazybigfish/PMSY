import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import * as storageService from '../services/storageService';
import { UPLOAD_CONFIG } from '../config/constants';

/**
 * Storage API 路由
 * 兼容 Supabase Storage API 格式
 * 基础路径: /storage/v1
 */

const router = Router();

// 配置 multer 内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    if (UPLOAD_CONFIG.allowedMimeTypes.length === 0) {
      cb(null, true);
      return;
    }
    
    if (UPLOAD_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    }
  },
});

/**
 * POST /storage/v1/object/:bucket/:path(*)
 * 上传文件（兼容 Supabase 格式）
 */
router.post(
  '/object/:bucket/:path(*)',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bucket, path: filePath } = req.params;
      const file = req.file;

      if (!file) {
        throw new ValidationError('未提供文件');
      }

      // 生成唯一文件名
      const uniqueFilename = storageService.generateUniqueFilename(file.originalname);
      const fullPath = filePath ? `${filePath}/${uniqueFilename}` : uniqueFilename;

      // 上传文件
      const metadata = await storageService.uploadFile(
        bucket,
        fullPath,
        file.buffer,
        {
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          uploadedBy: req.user?.sub,
        }
      );

      res.status(201).json({
        Key: fullPath,
        bucket,
        path: fullPath,
        url: metadata.url,
        size: metadata.size,
        mimetype: metadata.mimetype,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /storage/v1/object/:bucket/:path(*)
 * 下载文件
 */
router.get(
  '/object/:bucket/:path(*)',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bucket, path: filePath } = req.params;

      // 检查文件是否存在
      const exists = await storageService.fileExists(bucket, filePath);
      if (!exists) {
        throw new NotFoundError('文件不存在');
      }

      // 获取文件元数据
      const stat = await storageService.getFileStat(bucket, filePath);

      // 设置响应头
      res.setHeader('Content-Type', stat.metaData['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${filePath.split('/').pop()}"`);

      // 获取文件流并返回
      const stream = await storageService.downloadFile(bucket, filePath);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /storage/v1/object/public/:bucket/:path(*)
 * 公开访问文件（不需要认证）
 */
router.get(
  '/object/public/:bucket/:path(*)',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bucket, path: filePath } = req.params;

      // 检查文件是否存在
      const exists = await storageService.fileExists(bucket, filePath);
      if (!exists) {
        throw new NotFoundError('文件不存在');
      }

      // 获取文件元数据
      const stat = await storageService.getFileStat(bucket, filePath);

      // 设置响应头
      res.setHeader('Content-Type', stat.metaData['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Access-Control-Allow-Origin', '*');

      // 获取文件流并返回
      const stream = await storageService.downloadFile(bucket, filePath);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /storage/v1/object/:bucket/:path(*)
 * 删除文件
 */
router.delete(
  '/object/:bucket/:path(*)',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bucket, path: filePath } = req.params;

      // 检查文件是否存在
      const exists = await storageService.fileExists(bucket, filePath);
      if (!exists) {
        throw new NotFoundError('文件不存在');
      }

      // 删除文件
      await storageService.deleteFile(bucket, filePath);

      res.json({
        message: '文件删除成功',
        bucket,
        path: filePath,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /storage/v1/object/delete/:bucket
 * 批量删除文件
 */
router.post(
  '/object/delete/:bucket',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bucket } = req.params;
      const { prefixes } = req.body;

      if (!prefixes || !Array.isArray(prefixes) || prefixes.length === 0) {
        throw new ValidationError('请提供要删除的文件路径列表');
      }

      // 删除文件
      await storageService.deleteFiles(bucket, prefixes);

      res.json({
        message: '文件删除成功',
        bucket,
        deleted: prefixes.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /storage/v1/bucket
 * 列出所有存储桶
 */
router.get(
  '/bucket',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 这里可以从数据库获取存储桶列表
      // 暂时返回空列表
      res.json({
        buckets: [],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /storage/v1/bucket/:bucket
 * 获取存储桶信息
 */
router.get(
  '/bucket/:bucket',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bucket } = req.params;

      // 列出存储桶中的文件
      const files = await storageService.listFiles(bucket, '', true);

      res.json({
        name: bucket,
        files: files.map(f => ({
          name: f.name,
          size: f.size,
          lastModified: f.lastModified,
        })),
        totalFiles: files.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /storage/v1/bucket/:bucket/:prefix(*)
 * 列出存储桶中的文件（带前缀）
 */
router.get(
  '/bucket/:bucket/:prefix(*)',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bucket, prefix } = req.params;

      // 列出存储桶中的文件
      const files = await storageService.listFiles(bucket, prefix, false);

      res.json({
        bucket,
        prefix,
        files: files.map(f => ({
          name: f.name,
          size: f.size,
          lastModified: f.lastModified,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /storage/v1/sign/:bucket/:path(*)
 * 生成预签名 URL
 */
router.post(
  '/sign/:bucket/:path(*)',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bucket, path: filePath } = req.params;
      const { expiry = 3600, method = 'GET' } = req.body;

      let signedUrl: string;

      if (method === 'PUT') {
        // 预签名上传 URL
        signedUrl = await storageService.getPresignedPutUrl(bucket, filePath, expiry);
      } else {
        // 预签名下载 URL
        signedUrl = await storageService.getPresignedUrl(bucket, filePath, expiry);
      }

      res.json({
        signedURL: signedUrl,
        path: filePath,
        bucket,
        expiresIn: expiry,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
