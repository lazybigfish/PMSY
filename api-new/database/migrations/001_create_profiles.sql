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

-- 插入默认管理员用户（密码: admin123）
-- 密码哈希使用 bcrypt 生成，salt rounds = 10
-- 生成命令: node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('admin123', 10));"
INSERT INTO profiles (id, email, username, password_hash, full_name, role, is_active, email_confirmed_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@pmsy.com',
    'admin',
    '$2b$10$X7oMyJxQ8X8X8X8X8X8X8O',  -- 占位符，需要在应用启动时通过脚本生成真实密码
    '系统管理员',
    'admin',
    true,
    NOW()
)
ON CONFLICT (id) DO NOTHING;
