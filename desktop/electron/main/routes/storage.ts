import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { getDatabase } from '../database.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * 获取存储目录路径
 */
function getStoragePath(): string {
  const userDataPath = app.getPath('userData');
  const storagePath = path.join(userDataPath, 'storage');
  
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }
  
  return storagePath;
}

/**
 * 确保 bucket 目录存在
 */
function ensureBucket(bucket: string): string {
  const bucketPath = path.join(getStoragePath(), bucket);
  if (!fs.existsSync(bucketPath)) {
    fs.mkdirSync(bucketPath, { recursive: true });
  }
  return bucketPath;
}

/**
 * 上传文件
 * POST /storage/v1/object/:bucket/:path
 */
router.post('/object/:bucket/*', async (req, res) => {
  try {
    const { bucket } = req.params;
    const filePath = req.params[0] || '';
    const { filename, content, contentType } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'filename and content are required'
      });
    }
    
    // 确保 bucket 存在
    const bucketPath = ensureBucket(bucket);
    
    // 构建文件路径
    const targetDir = path.join(bucketPath, path.dirname(filePath));
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const targetPath = path.join(bucketPath, filePath, filename);
    
    // 解码 base64 内容
    const buffer = Buffer.from(content, 'base64');
    
    // 写入文件
    fs.writeFileSync(targetPath, buffer);
    
    // 保存文件记录到数据库
    const db = getDatabase();
    const user = (req as any).user;
    const now = new Date().toISOString();
    const fileId = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO files (id, name, bucket, path, size, mime_type, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fileId,
      filename,
      bucket,
      path.join(filePath, filename),
      buffer.length,
      contentType || 'application/octet-stream',
      user?.id,
      now,
      now
    );
    
    logger.info(`File uploaded: ${bucket}/${filePath}/${filename}`);
    
    res.status(201).json({
      id: fileId,
      name: filename,
      bucket,
      path: path.join(filePath, filename),
      size: buffer.length,
      mime_type: contentType,
    });
  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload file'
    });
  }
});

/**
 * 下载文件
 * GET /storage/v1/object/:bucket/:path
 */
router.get('/object/:bucket/*', async (req, res) => {
  try {
    const { bucket } = req.params;
    const filePath = req.params[0] || '';
    
    const bucketPath = path.join(getStoragePath(), bucket);
    const targetPath = path.join(bucketPath, filePath);
    
    // 安全检查：确保路径在存储目录内
    if (!targetPath.startsWith(getStoragePath())) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid path'
      });
    }
    
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'File not found'
      });
    }
    
    const stat = fs.statSync(targetPath);
    
    if (stat.isDirectory()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Path is a directory'
      });
    }
    
    // 读取文件
    const content = fs.readFileSync(targetPath);
    
    // 获取文件信息
    const db = getDatabase();
    const fileRecord = db.prepare(`
      SELECT * FROM files WHERE bucket = ? AND path = ?
    `).get(bucket, filePath) as any;
    
    // 设置响应头
    if (fileRecord?.mime_type) {
      res.setHeader('Content-Type', fileRecord.mime_type);
    }
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    
    res.send(content);
  } catch (error) {
    logger.error('File download error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to download file'
    });
  }
});

/**
 * 删除文件
 * DELETE /storage/v1/object/:bucket/:path
 */
router.delete('/object/:bucket/*', async (req, res) => {
  try {
    const { bucket } = req.params;
    const filePath = req.params[0] || '';
    
    const bucketPath = path.join(getStoragePath(), bucket);
    const targetPath = path.join(bucketPath, filePath);
    
    // 安全检查
    if (!targetPath.startsWith(getStoragePath())) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid path'
      });
    }
    
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'File not found'
      });
    }
    
    // 删除文件
    fs.unlinkSync(targetPath);
    
    // 删除数据库记录
    const db = getDatabase();
    db.prepare('DELETE FROM files WHERE bucket = ? AND path = ?').run(bucket, filePath);
    
    logger.info(`File deleted: ${bucket}/${filePath}`);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    logger.error('File delete error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete file'
    });
  }
});

/**
 * 获取文件列表
 * GET /storage/v1/bucket/:bucket
 */
router.get('/bucket/:bucket', async (req, res) => {
  try {
    const { bucket } = req.params;
    const { prefix = '' } = req.query;
    
    const bucketPath = path.join(getStoragePath(), bucket);
    
    if (!fs.existsSync(bucketPath)) {
      return res.json([]);
    }
    
    const db = getDatabase();
    
    // 从数据库获取文件列表
    const files = db.prepare(`
      SELECT id, name, bucket, path, size, mime_type, created_at
      FROM files
      WHERE bucket = ? AND path LIKE ?
    `).all(bucket, `${prefix}%`) as any[];
    
    res.json(files);
  } catch (error) {
    logger.error('List files error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list files'
    });
  }
});

/**
 * 获取文件元数据
 * HEAD /storage/v1/object/:bucket/:path
 */
router.head('/object/:bucket/*', async (req, res) => {
  try {
    const { bucket } = req.params;
    const filePath = req.params[0] || '';
    
    const db = getDatabase();
    const fileRecord = db.prepare(`
      SELECT * FROM files WHERE bucket = ? AND path = ?
    `).get(bucket, filePath) as any;
    
    if (!fileRecord) {
      return res.status(404).end();
    }
    
    res.setHeader('Content-Type', fileRecord.mime_type);
    res.setHeader('Content-Length', fileRecord.size);
    res.end();
  } catch (error) {
    logger.error('File head error:', error);
    res.status(500).end();
  }
});

export function setupStorageRoutes(): Router {
  return router;
}
