-- 修复系统模板标记迁移脚本
-- 创建日期: 2026-03-06
-- 说明: 将初始安装的系统模板正确标记为系统模板和公开模板

-- ============================================
-- 1. 更新 template_versions 表中的系统模板
-- ============================================

-- 将标准项目里程碑模板标记为系统模板和公开模板
UPDATE template_versions 
SET is_system = true,
    is_public = true
WHERE id = '26001b88-f99b-4784-9300-4f2b5f650274'
   OR name LIKE '%标准%' 
   OR name LIKE '%系统%';

-- ============================================
-- 2. 更新 milestone_templates 表中的系统模板
-- ============================================

-- 将关联到系统版本的里程碑模板标记为系统模板
UPDATE milestone_templates 
SET is_system = true,
    is_public = true
WHERE version_id = '26001b88-f99b-4784-9300-4f2b5f650274';

-- ============================================
-- 3. 验证更新结果
-- ============================================

-- 检查 template_versions 表的系统模板
DO $$
DECLARE
    v_system_count INTEGER;
    v_public_count INTEGER;
    v_total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_count FROM template_versions;
    SELECT COUNT(*) INTO v_system_count FROM template_versions WHERE is_system = true;
    SELECT COUNT(*) INTO v_public_count FROM template_versions WHERE is_public = true;
    
    RAISE NOTICE 'template_versions 表: 总计 % 条记录, 系统模板 % 条, 公开模板 % 条', v_total_count, v_system_count, v_public_count;
END $$;

-- 检查 milestone_templates 表的系统模板
DO $$
DECLARE
    v_system_count INTEGER;
    v_public_count INTEGER;
    v_total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_count FROM milestone_templates;
    SELECT COUNT(*) INTO v_system_count FROM milestone_templates WHERE is_system = true;
    SELECT COUNT(*) INTO v_public_count FROM milestone_templates WHERE is_public = true;
    
    RAISE NOTICE 'milestone_templates 表: 总计 % 条记录, 系统模板 % 条, 公开模板 % 条', v_total_count, v_system_count, v_public_count;
END $$;

-- 迁移完成提示
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '系统模板标记修复完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '已将标准项目里程碑模板标记为系统模板';
    RAISE NOTICE '========================================';
END $$;
