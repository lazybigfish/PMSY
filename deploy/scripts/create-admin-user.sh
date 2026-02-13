#!/bin/bash

# 创建 PMSY 初始管理员用户
# 默认账号: admin@pmsy.com
# 默认密码: Willyou@2026

set -e

echo "========================================="
echo "     创建 PMSY 初始管理员用户"
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

# 默认账号信息
DEFAULT_EMAIL="admin@pmsy.com"
DEFAULT_PASSWORD="Willyou@2026"
DEFAULT_USERNAME="admin"

echo -e "${BLUE}将创建以下管理员账号:${NC}"
echo "  邮箱: $DEFAULT_EMAIL"
echo "  用户名: $DEFAULT_USERNAME"
echo "  密码: $DEFAULT_PASSWORD"
echo ""

read -p "是否使用默认设置? (y/n): " USE_DEFAULT
if [ "$USE_DEFAULT" != "y" ] && [ "$USE_DEFAULT" != "Y" ]; then
    read -p "请输入邮箱: " DEFAULT_EMAIL
    read -p "请输入用户名: " DEFAULT_USERNAME
    read -s -p "请输入密码: " DEFAULT_PASSWORD
    echo ""
fi

echo ""
echo -e "${YELLOW}创建用户...${NC}"

# 使用 Supabase Auth API 创建用户
# 首先获取当前 auth 容器的 IP
AUTH_CONTAINER=$(docker-compose ps -q auth)
if [ -z "$AUTH_CONTAINER" ]; then
    echo -e "${RED}错误: auth 服务未运行${NC}"
    exit 1
fi

# 通过数据库直接创建用户（绕过 API）
# 注意：这是初始化脚本，用于创建第一个管理员

# 生成 UUID
USER_ID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "$(cat /proc/sys/kernel/random/uuid 2>/dev/null || date +%s%N)")

# 加密密码（使用 bcrypt）
# 注意：这里使用一个预计算的 bcrypt hash，对应密码 'Willyou@2026'
# 实际生产环境应该使用更安全的密码
ENCRYPTED_PASSWORD='\$2a\$10\$abcdefghijklmnopqrstuvwxycdefghijklmnopqrstu'  # 占位符

# 创建用户 SQL
SQL="
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
) VALUES (
    '$USER_ID',
    '$DEFAULT_EMAIL',
    crypt('$DEFAULT_PASSWORD', gen_salt('bf')),
    now(),
    '{\"provider\":\"email\",\"providers\":[\"email\"]}',
    '{\"username\":\"$DEFAULT_USERNAME\",\"role\":\"admin\"}',
    now(),
    now(),
    'authenticated',
    '',
    '',
    '',
    ''
)
ON CONFLICT (email) DO NOTHING
RETURNING id;
"

RESULT=$(docker-compose exec -T db psql -U postgres -c "$SQL" 2>/dev/null | grep -E '^[0-9a-f]{8}-' || echo "")

if [ -n "$RESULT" ]; then
    echo -e "${GREEN}✓ 用户创建成功!${NC}"
    echo ""
    echo "用户ID: $RESULT"
    echo ""
    
    # 创建 profile
    PROFILE_SQL="
    INSERT INTO public.profiles (id, username, full_name, role, department, created_at, updated_at)
    VALUES ('$RESULT', '$DEFAULT_USERNAME', '系统管理员', 'admin', '技术部', now(), now())
    ON CONFLICT (id) DO UPDATE SET 
        username = EXCLUDED.username,
        role = EXCLUDED.role,
        updated_at = now();
    "
    
    docker-compose exec -T db psql -U postgres -c "$PROFILE_SQL" 2>/dev/null
    echo -e "${GREEN}✓ 用户资料已创建${NC}"
    echo ""
else
    # 检查用户是否已存在
    EXISTING_USER=$(docker-compose exec -T db psql -U postgres -c "SELECT id FROM auth.users WHERE email = '$DEFAULT_EMAIL';" 2>/dev/null | grep -E '^[0-9a-f]{8}-' || echo "")
    if [ -n "$EXISTING_USER" ]; then
        echo -e "${YELLOW}用户已存在，跳过创建${NC}"
        echo ""
    else
        echo -e "${RED}用户创建失败${NC}"
        exit 1
    fi
fi

echo "========================================="
echo -e "${GREEN}     管理员账号信息${NC}"
echo "========================================="
echo ""
echo -e "${YELLOW}登录地址:${NC} http://<服务器IP>/login"
echo ""
echo -e "${YELLOW}账号信息:${NC}"
echo "  邮箱: $DEFAULT_EMAIL"
echo "  密码: $DEFAULT_PASSWORD"
echo ""
echo -e "${YELLOW}建议:${NC}"
echo "  首次登录后请立即修改密码"
echo ""
