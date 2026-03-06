-- 为 task_attachments 表添加 storage_type 字段
-- 用于标识附件存储类型（minio/local/url）

ALTER TABLE task_attachments
ADD COLUMN IF NOT EXISTS storage_type TEXT DEFAULT 'minio';

-- 更新现有记录的存储类型为 minio（因为现有附件都存储在 MinIO）
UPDATE task_attachments
SET storage_type = 'minio'
WHERE storage_type IS NULL;

-- 添加注释
COMMENT ON COLUMN task_attachments.storage_type IS '附件存储类型: minio(默认)/local/url';
