-- 移除 template_versions 表的 version_number 唯一性约束
-- 创建日期: 2026-03-06
-- 说明: 不同模板可以有相同的版本号，版本号不应该全局唯一

-- 删除 version_number 的唯一性约束
ALTER TABLE template_versions 
DROP CONSTRAINT IF EXISTS template_versions_version_number_unique;

-- 迁移完成提示
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '已移除 version_number 唯一性约束！';
    RAISE NOTICE '========================================';
END $$;
