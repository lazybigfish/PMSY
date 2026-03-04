-- 创建 profiles 表（替代 Supabase auth.users）
-- 合并自 migrations/026_add_force_password_change.sql
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'manager', 'project_manager', 'team_member')),
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    force_password_change BOOLEAN DEFAULT false,
    email_confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_sign_in_at TIMESTAMPTZ
);

-- 添加字段注释
COMMENT ON COLUMN profiles.force_password_change IS '是否强制用户修改密码，true表示用户下次登录时必须修改密码';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入默认管理员用户
-- 默认用户名: admin，密码: Willyou@0813
-- 登录时可以使用用户名或邮箱
INSERT INTO profiles (id, email, username, password_hash, full_name, role, is_active, email_confirmed_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@pmsy.com',
    'admin',
    '$2a$10$nfN/j6WMa/z7QquHKcRm3uC7Jd5Ub1wF.3fZjqHb.hEf.MkpEmEyW',  -- Willyou@0813 的 bcrypt 哈希
    '系统管理员',
    'admin',
    true,
    NOW()
)
ON CONFLICT (id) DO NOTHING;
