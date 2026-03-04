/**
 * 统一上传 API 路由
 * 提供文件/图片上传的统一接口
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { ValidationError } from '../middleware/errorHandler';
import * as storageService from '../services/storageService';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const router = Router();

// 配置 multer 内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

/**
 * 生成唯一文件名
 */
function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const basename = path.basename(originalName, ext);
  const timestamp = Date.now();
  const uniqueId = uuidv4().split('-')[0];
  return `${timestamp}_${uniqueId}_${basename}${ext}`;
}

/**
 * POST /api/upload
 * 统一文件上传接口
 */
router.post(
  '/',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        throw new ValidationError('未提供文件');
      }

      // 获取上传参数
      const bucket = req.body.bucket || 'files';
      const folder = req.body.folder || '';
      const customFileName = req.body.fileName;
      const metadataStr = req.body.metadata || '{}';
      
      let metadata: any = {};
      try {
        metadata = JSON.parse(metadataStr);
      } catch (e) {
        logger.warn('[Upload] Invalid metadata JSON:', metadataStr);
      }

      // 生成文件名
      const fileName = customFileName || generateUniqueFilename(file.originalname);
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      logger.info(`[Upload] Uploading file to ${bucket}/${filePath}, size: ${file.size}`);

      // 使用数据库事务确保原子性
      const result = await db.transaction(async (trx) => {
        // 1. 上传文件到 MinIO
        const storageResult = await storageService.uploadFile(
          bucket,
          filePath,
          file.buffer,
          {
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            uploadedBy: req.user?.sub,
          }
        );

        // 2. 创建数据库记录
        const fileRecord = {
          id: uuidv4(),
          name: file.originalname,
          original_name: file.originalname,
          mime_type: file.mimetype,
          size: file.size,
          extension: path.extname(file.originalname).toLowerCase().replace('.', ''),
          storage_type: 'minio' as const,
          storage_path: storageResult.path,
          storage_config_id: null,
          url: storageResult.url,
          thumbnail_url: null,
          category: getCategoryFromMimeType(file.mimetype),
          tags: [],
          uploader_id: req.user?.sub || null,
          uploader_name: req.user?.email || null,
          version: 1,
          parent_id: null,
          is_latest: true,
          download_count: 0,
          view_count: 0,
          last_accessed_at: null,
          checksum: null,
          is_scanned: false,
          scan_result: null,
          status: 'active' as const,
          deleted_at: null,
          deleted_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await trx('files').insert(fileRecord);

        // 3. 如果有上下文关联，创建关联记录
        if (metadata.taskId) {
          await trx('task_attachments').insert({
            id: uuidv4(),
            task_id: metadata.taskId,
            file_id: fileRecord.id,
            file_name: file.originalname,
            file_url: storageResult.url,
            file_type: file.mimetype,
            file_size: file.size,
            created_by: req.user?.sub,
            created_at: new Date().toISOString(),
          });
        }

        if (metadata.projectId) {
          await trx('project_files').insert({
            id: uuidv4(),
            project_id: metadata.projectId,
            file_id: fileRecord.id,
            file_type: metadata.moduleType || 'attachment',
            uploaded_by: req.user?.sub,
            uploaded_at: new Date().toISOString(),
          });
        }

        return {
          id: fileRecord.id,
          fileName: fileRecord.name,
          originalName: file.originalname,
          fileUrl: storageResult.url,
          fileSize: file.size,
          mimeType: file.mimetype,
          createdAt: fileRecord.created_at,
        };
      });

      logger.info(`[Upload] File uploaded successfully: ${result.id}`);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('[Upload] Upload failed:', error);
      next(error);
    }
  }
);

/**
 * GET /api/upload/config
 * 获取上传配置
 */
router.get('/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: [
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
      ],
      imageCompress: {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
      },
    },
  });
});

/**
 * DELETE /api/upload/:fileId
 * 删除上传的文件
 */
router.delete(
  '/:fileId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileId } = req.params;

      // 查询文件记录
      const fileRecord = await db('files').where({ id: fileId }).first();
      if (!fileRecord) {
        throw new ValidationError('文件不存在');
      }

      // 检查权限（上传者或管理员可以删除）
      if (fileRecord.uploader_id !== req.user?.sub && req.user?.role !== 'admin') {
        throw new ValidationError('无权删除此文件');
      }

      await db.transaction(async (trx) => {
        // 1. 从 MinIO 删除文件
        const bucket = fileRecord.storage_path.split('/')[0];
        const filePath = fileRecord.storage_path.substring(bucket.length + 1);
        await storageService.deleteFile(bucket, filePath);

        // 2. 删除数据库记录
        await trx('files').where({ id: fileId }).update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deleted_by: req.user?.sub,
        });

        // 3. 删除关联记录
        await trx('task_attachments').where({ file_id: fileId }).delete();
        await trx('project_files').where({ file_id: fileId }).delete();
      });

      logger.info(`[Upload] File deleted: ${fileId}`);

      res.json({
        success: true,
        message: '文件删除成功',
      });
    } catch (error) {
      logger.error('[Upload] Delete failed:', error);
      next(error);
    }
  }
);

/**
 * 根据 MIME 类型获取文件分类
 */
function getCategoryFromMimeType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || 
      mimeType.includes('word') || 
      mimeType.includes('excel') ||
      mimeType.includes('text/')) return 'document';
  if (mimeType.includes('zip') || 
      mimeType.includes('rar') || 
      mimeType.includes('7z')) return 'archive';
  return 'other';
}

export default router;
