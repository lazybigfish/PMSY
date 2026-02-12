#!/bin/bash

# Supabase 数据库初始化脚本
# 首次部署后自动修复数据库 schema 和角色

set -e

echo "========================================="
echo "     Supabase 数据库初始化"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查是否在服务器上运行
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}错误: 未找到 docker-compose.yml${NC}"
    echo "请在服务器上的 /opt/pmsy 目录运行此脚本"
    exit 1
fi

echo -e "${BLUE}检查数据库状态...${NC}"
echo ""

# 检查数据库是否健康
DB_HEALTH=$(docker-compose ps db | grep -c "healthy" || echo "0")
if [ "$DB_HEALTH" = "0" ]; then
    echo -e "${RED}错误: 数据库未就绪${NC}"
    echo "请等待数据库启动完成后再运行此脚本"
    exit 1
fi

echo -e "${GREEN}✓ 数据库已就绪${NC}"
echo ""

# 函数：执行 SQL
exec_sql() {
    docker-compose exec -T db psql -U postgres -c "$1" 2>/dev/null
}

# 1. 检查并创建 auth schema
echo -e "${YELLOW}[1/5] 检查 auth schema...${NC}"
AUTH_SCHEMA_EXISTS=$(exec_sql "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth';" | grep -c "auth" || echo "0")

if [ "$AUTH_SCHEMA_EXISTS" = "0" ]; then
    echo "  创建 auth schema..."
    exec_sql "CREATE SCHEMA IF NOT EXISTS auth;"
    echo -e "${GREEN}  ✓ auth schema 已创建${NC}"
else
    echo -e "${GREEN}  ✓ auth schema 已存在${NC}"
fi
echo ""

# 2. 检查并创建数据库角色
echo -e "${YELLOW}[2/5] 检查数据库角色...${NC}"

for role in anon authenticated service_role; do
    ROLE_EXISTS=$(exec_sql "SELECT 1 FROM pg_roles WHERE rolname = '$role';" | grep -c "1" || echo "0")
    if [ "$ROLE_EXISTS" = "0" ]; then
        echo "  创建角色: $role..."
        exec_sql "CREATE ROLE $role;"
        echo -e "${GREEN}  ✓ 角色 $role 已创建${NC}"
    else
        echo -e "${GREEN}  ✓ 角色 $role 已存在${NC}"
    fi
done
echo ""

# 3. 检查并创建 MFA 相关类型
echo -e "${YELLOW}[3/5] 检查 MFA 类型...${NC}"

FACTOR_TYPE_EXISTS=$(exec_sql "SELECT 1 FROM pg_type WHERE typname = 'factor_type' AND typnamespace = 'auth'::regnamespace;" | grep -c "1" || echo "0")
if [ "$FACTOR_TYPE_EXISTS" = "0" ]; then
    echo "  创建 factor_type 类型..."
    exec_sql "CREATE TYPE auth.factor_type AS ENUM ('totp', 'phone');"
    echo -e "${GREEN}  ✓ factor_type 类型已创建${NC}"
else
    echo -e "${GREEN}  ✓ factor_type 类型已存在${NC}"
fi

FACTOR_STATUS_EXISTS=$(exec_sql "SELECT 1 FROM pg_type WHERE typname = 'factor_status' AND typnamespace = 'auth'::regnamespace;" | grep -c "1" || echo "0")
if [ "$FACTOR_STATUS_EXISTS" = "0" ]; then
    echo "  创建 factor_status 类型..."
    exec_sql "CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');"
    echo -e "${GREEN}  ✓ factor_status 类型已创建${NC}"
else
    echo -e "${GREEN}  ✓ factor_status 类型已存在${NC}"
fi
echo ""

# 4. 检查并创建 MFA 相关表
echo -e "${YELLOW}[4/5] 检查 MFA 表...${NC}"

MFA_FACTORS_EXISTS=$(exec_sql "SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'mfa_factors';" | grep -c "1" || echo "0")
if [ "$MFA_FACTORS_EXISTS" = "0" ]; then
    echo "  创建 mfa_factors 表..."
    exec_sql "
    CREATE TABLE IF NOT EXISTS auth.mfa_factors (
        id uuid NOT NULL PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        friendly_name text NULL,
        factor_type auth.factor_type NOT NULL,
        status auth.factor_status NOT NULL,
        secret text NULL,
        phone text NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS unique_verified_phone_factor ON auth.mfa_factors (user_id, phone);
    "
    echo -e "${GREEN}  ✓ mfa_factors 表已创建${NC}"
else
    echo -e "${GREEN}  ✓ mfa_factors 表已存在${NC}"
    # 检查 phone 列是否存在
    PHONE_COLUMN_EXISTS=$(exec_sql "SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'mfa_factors' AND column_name = 'phone';" | grep -c "1" || echo "0")
    if [ "$PHONE_COLUMN_EXISTS" = "0" ]; then
        echo "  添加 phone 列..."
        exec_sql "ALTER TABLE auth.mfa_factors ADD COLUMN phone text UNIQUE;"
        echo -e "${GREEN}  ✓ phone 列已添加${NC}"
    fi
fi

MFA_CHALLENGES_EXISTS=$(exec_sql "SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'mfa_challenges';" | grep -c "1" || echo "0")
if [ "$MFA_CHALLENGES_EXISTS" = "0" ]; then
    echo "  创建 mfa_challenges 表..."
    exec_sql "
    CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
        id uuid NOT NULL PRIMARY KEY,
        factor_id uuid NOT NULL REFERENCES auth.mfa_factors(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        verified_at timestamptz NULL,
        ip_address inet NULL,
        otp_code text NULL
    );
    "
    echo -e "${GREEN}  ✓ mfa_challenges 表已创建${NC}"
else
    echo -e "${GREEN}  ✓ mfa_challenges 表已存在${NC}"
fi
echo ""

# 5. 创建 auth 函数
echo -e "${YELLOW}[5/5] 检查 auth 函数...${NC}"

UID_FUNC_EXISTS=$(exec_sql "SELECT 1 FROM pg_proc WHERE proname = 'uid' AND pronamespace = 'auth'::regnamespace;" | grep -c "1" || echo "0")
if [ "$UID_FUNC_EXISTS" = "0" ]; then
    echo "  创建 auth.uid() 函数..."
    exec_sql "
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS \$\$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    \$\$ LANGUAGE sql stable;
    "
    echo -e "${GREEN}  ✓ auth.uid() 函数已创建${NC}"
else
    echo -e "${GREEN}  ✓ auth.uid() 函数已存在${NC}"
fi

ROLE_FUNC_EXISTS=$(exec_sql "SELECT 1 FROM pg_proc WHERE proname = 'role' AND pronamespace = 'auth'::regnamespace;" | grep -c "1" || echo "0")
if [ "$ROLE_FUNC_EXISTS" = "0" ]; then
    echo "  创建 auth.role() 函数..."
    exec_sql "
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS \$\$
      SELECT nullif(current_setting('request.jwt.claim.role', true), '')::text;
    \$\$ LANGUAGE sql stable;
    "
    echo -e "${GREEN}  ✓ auth.role() 函数已创建${NC}"
else
    echo -e "${GREEN}  ✓ auth.role() 函数已存在${NC}"
fi
echo ""

# 6. 重启相关服务
echo -e "${YELLOW}重启相关服务...${NC}"
echo ""

echo "  重启 auth 服务..."
docker-compose restart auth >/dev/null 2>&1
echo -e "${GREEN}  ✓ auth 服务已重启${NC}"

sleep 5

echo "  重启 storage 服务..."
docker-compose restart storage >/dev/null 2>&1
echo -e "${GREEN}  ✓ storage 服务已重启${NC}"

echo ""
echo "========================================="
echo -e "${GREEN}     数据库初始化完成!${NC}"
echo "========================================="
echo ""
echo "请等待 30 秒后检查服务状态:"
echo "  docker-compose ps"
echo ""
