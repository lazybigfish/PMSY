-- 为 suppliers 表添加 address 和 category 字段
-- 修复前端保存供应商时字段不存在的错误

-- 添加 address 字段（地址）
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS address TEXT;

-- 添加 category 字段（类别）
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS category TEXT;

-- 添加注释
COMMENT ON COLUMN suppliers.address IS '供应商地址';
COMMENT ON COLUMN suppliers.category IS '供应商类别';
