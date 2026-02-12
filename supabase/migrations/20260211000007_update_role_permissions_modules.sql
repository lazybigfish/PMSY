-- 更新角色权限，添加缺失的 water 和 files 模块

-- 为 admin 角色添加 water 和 files 权限
INSERT INTO public.role_permissions (role_key, module_key) VALUES
    ('admin', 'water'),
    ('admin', 'files')
ON CONFLICT (role_key, module_key) DO NOTHING;

-- 为 manager 角色添加 water 和 files 权限
INSERT INTO public.role_permissions (role_key, module_key) VALUES
    ('manager', 'water'),
    ('manager', 'files')
ON CONFLICT (role_key, module_key) DO NOTHING;

-- 为 user 角色添加 water 和 files 权限
INSERT INTO public.role_permissions (role_key, module_key) VALUES
    ('user', 'water'),
    ('user', 'files')
ON CONFLICT (role_key, module_key) DO NOTHING;

-- 确保所有现有角色都有所有模块的权限（如果之前缺少任何模块）
DO $$
DECLARE
    v_role_record RECORD;
    v_module TEXT;
    v_module_list TEXT[] := ARRAY['dashboard', 'projects', 'tasks', 'stakeholders', 'analysis', 'water', 'files', 'system'];
BEGIN
    FOR v_role_record IN SELECT key FROM public.app_roles LOOP
        FOREACH v_module IN ARRAY v_module_list LOOP
            INSERT INTO public.role_permissions (role_key, module_key)
            VALUES (v_role_record.key, v_module)
            ON CONFLICT (role_key, module_key) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
