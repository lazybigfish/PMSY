-- 修复 template_versions 表的 created_by 字段
-- 创建日期: 2026-03-06
-- 说明: 为没有 created_by 的模板设置默认值

-- 获取第一个管理员用户ID
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- 查找第一个管理员用户
    SELECT id INTO admin_user_id FROM profiles WHERE role = 'admin' LIMIT 1;
    
    -- 如果没有找到管理员，使用系统默认用户
    IF admin_user_id IS NULL THEN
        admin_user_id := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    
    -- 更新所有没有 created_by 的模板
    UPDATE template_versions 
    SET created_by = admin_user_id
    WHERE created_by IS NULL;
    
    RAISE NOTICE '已更新 % 条记录的 created_by 字段', 
        (SELECT COUNT(*) FROM template_versions WHERE created_by = admin_user_id);
END $$;

-- 迁移完成提示
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'template_versions 表 created_by 字段修复完成！';
    RAISE NOTICE '========================================';
END $$;
