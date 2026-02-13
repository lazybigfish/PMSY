-- 将 suppliers 权限更新为 stakeholders
-- 因为导航栏从 "供应商" 改为 "相关方"，module_key 需要从 suppliers 改为 stakeholders

-- 1. 为所有角色添加 stakeholders 权限
INSERT INTO public.role_permissions (role_key, module_key)
SELECT role_key, 'stakeholders'
FROM public.role_permissions
WHERE module_key = 'suppliers'
ON CONFLICT (role_key, module_key) DO NOTHING;

-- 2. 删除旧的 suppliers 权限
DELETE FROM public.role_permissions WHERE module_key = 'suppliers';

-- 3. 确保所有角色都有 stakeholders 权限
DO $$
DECLARE
    v_role_record RECORD;
BEGIN
    FOR v_role_record IN SELECT key FROM public.app_roles LOOP
        INSERT INTO public.role_permissions (role_key, module_key)
        VALUES (v_role_record.key, 'stakeholders')
        ON CONFLICT (role_key, module_key) DO NOTHING;
    END LOOP;
END $$;

-- 4. 更新权限更新脚本中的模块列表
-- 注意：这只是一个记录，实际更新需要在应用代码中完成
