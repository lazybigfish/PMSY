-- 创建 app_roles 表（应用角色）
CREATE TABLE IF NOT EXISTS app_roles (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建 role_permissions 表（角色权限）
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_key TEXT REFERENCES app_roles(key) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(role_key, module_key)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_key ON role_permissions(role_key);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module_key ON role_permissions(module_key);

-- 插入默认角色
INSERT INTO app_roles (key, name, description) VALUES
    ('admin', '管理员', '系统超级管理员，拥有所有权限'),
    ('manager', '项目经理', '负责项目管理和团队协作'),
    ('user', '普通用户', '参与项目执行的团队成员')
ON CONFLICT (key) DO NOTHING;

-- 插入角色权限
-- Admin: 所有模块
INSERT INTO role_permissions (role_key, module_key) VALUES
    ('admin', 'dashboard'),
    ('admin', 'projects'),
    ('admin', 'tasks'),
    ('admin', 'suppliers'),
    ('admin', 'analysis'),
    ('admin', 'water'),
    ('admin', 'files'),
    ('admin', 'system')
ON CONFLICT (role_key, module_key) DO NOTHING;

-- Manager: 除系统设置外的所有模块
INSERT INTO role_permissions (role_key, module_key) VALUES
    ('manager', 'dashboard'),
    ('manager', 'projects'),
    ('manager', 'tasks'),
    ('manager', 'suppliers'),
    ('manager', 'analysis'),
    ('manager', 'water'),
    ('manager', 'files')
ON CONFLICT (role_key, module_key) DO NOTHING;

-- User: 基础模块
INSERT INTO role_permissions (role_key, module_key) VALUES
    ('user', 'dashboard'),
    ('user', 'projects'),
    ('user', 'tasks'),
    ('user', 'suppliers'),
    ('user', 'water'),
    ('user', 'files')
ON CONFLICT (role_key, module_key) DO NOTHING;
