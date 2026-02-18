-- 为 clients 表添加 location 字段
-- 修复前端保存客户时 location 字段不存在的错误

-- 添加 location 字段（地点）
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS location TEXT;

-- 添加注释
COMMENT ON COLUMN clients.location IS '客户地点';
