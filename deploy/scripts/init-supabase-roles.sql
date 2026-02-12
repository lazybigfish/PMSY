-- ==========================================
-- Supabase 角色初始化脚本
-- ==========================================
-- 此脚本在全新部署时创建必需的 Supabase 角色
-- 必须在创建扩展之前执行

-- 创建 supabase_admin 角色（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE ROLE supabase_admin WITH LOGIN SUPERUSER PASSWORD 'admin';
        COMMENT ON ROLE supabase_admin IS 'Supabase 管理员角色';
    END IF;
END
$$;

-- 创建 anon 角色（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
        COMMENT ON ROLE anon IS '匿名用户角色';
    END IF;
END
$$;

-- 创建 authenticated 角色（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
        COMMENT ON ROLE authenticated IS '已认证用户角色';
    END IF;
END
$$;

-- 创建 service_role 角色（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
        COMMENT ON ROLE service_role IS '服务角色';
    END IF;
END
$$;

-- 验证角色创建
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole
FROM pg_roles 
WHERE rolname IN ('supabase_admin', 'anon', 'authenticated', 'service_role')
ORDER BY rolname;
