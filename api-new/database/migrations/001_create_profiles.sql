-- 创建 profiles 表（替代 Supabase auth.users）
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
    email_confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_sign_in_at TIMESTAMPTZ
);

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

-- ==========================================
-- 初始化系统管理员用户
-- ==========================================
-- 默认用户名: admin
-- 默认密码: Willyou@2026
-- 登录时可以使用用户名或邮箱

INSERT INTO profiles (id, email, username, password_hash, full_name, role, is_active, email_confirmed_at, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@pmsy.com',
    'admin',
    '$2a$10$za3UpLuxe/vK739nAMuRmOhcQyN5YNO5MY5KOk.nk1iNDH3G1W.Ai',  -- Willyou@2026 的 bcrypt 哈希
    '系统管理员',
    'admin',
    true,
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    updated_at = NOW();
