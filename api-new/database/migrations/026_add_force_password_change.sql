-- 添加 force_password_change 字段到 profiles 表
-- 用于标记用户是否需要强制修改密码

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;

-- 添加注释
COMMENT ON COLUMN profiles.force_password_change IS '是否强制用户修改密码，true表示用户下次登录时必须修改密码';
