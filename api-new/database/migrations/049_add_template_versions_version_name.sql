-- 添加 template_versions 表的 version_name 字段
-- 创建日期: 2026-03-06
-- 说明: 为模板版本表添加 version_name 字段，用于存储版本名称

-- 添加 version_name 字段
ALTER TABLE template_versions 
ADD COLUMN IF NOT EXISTS version_name TEXT;

-- 更新现有数据：将 name 字段的值复制到 version_name
UPDATE template_versions 
SET version_name = name 
WHERE version_name IS NULL;

-- 迁移完成提示
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'template_versions 表添加 version_name 字段完成！';
    RAISE NOTICE '========================================';
END $$;
