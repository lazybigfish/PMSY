-- 为 app_roles 和 role_permissions 表添加 updated_at 字段
-- 修复角色权限更新时的 500 错误

-- 为 app_roles 表添加 updated_at 字段
ALTER TABLE app_roles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- 为 role_permissions 表添加 updated_at 字段
ALTER TABLE role_permissions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- 更新现有数据的 updated_at 字段为 created_at 的值
UPDATE app_roles SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE role_permissions SET updated_at = created_at WHERE updated_at IS NULL;
