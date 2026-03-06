-- 修复迷你系统版本的 is_system 字段
-- 创建日期: 2026-03-06
-- 说明: 将"迷你系统版本"标记为系统模板

UPDATE template_versions 
SET is_system = true
WHERE name = '迷你系统版本';

-- 迁移完成提示
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '迷你系统版本已标记为系统模板！';
    RAISE NOTICE '========================================';
END $$;
