-- 添加文件管理模块的权限配置

-- 为 admin 角色添加 files 模块权限
INSERT INTO role_permissions (role_key, module_key)
SELECT 'admin', 'files'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions WHERE role_key = 'admin' AND module_key = 'files'
);

-- 为 user 角色添加 files 模块权限
INSERT INTO role_permissions (role_key, module_key)
SELECT 'user', 'files'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions WHERE role_key = 'user' AND module_key = 'files'
);

-- 确保所有现有角色都有 files 权限
INSERT INTO role_permissions (role_key, module_key)
SELECT DISTINCT role_key, 'files'
FROM role_permissions
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp2 
    WHERE rp2.role_key = role_permissions.role_key 
    AND rp2.module_key = 'files'
);
