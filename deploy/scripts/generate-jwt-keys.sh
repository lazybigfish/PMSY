#!/bin/bash
# ==========================================
# PMSY JWT Key 生成脚本
# ==========================================
#
# 此脚本用于生成与 JWT_SECRET 匹配的 Supabase Key
# 包括: ANON_KEY, SERVICE_ROLE_KEY
#
# 使用方法:
#   ./deploy/scripts/generate-jwt-keys.sh [JWT_SECRET]
#
# 如果不提供 JWT_SECRET，将从 .env 文件读取
#
# ==========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}PMSY JWT Key 生成脚本${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# 获取 JWT_SECRET
JWT_SECRET="$1"

if [ -z "$JWT_SECRET" ]; then
    # 尝试从 .env 文件读取
    if [ -f ".env" ]; then
        JWT_SECRET=$(grep '^JWT_SECRET=' .env | cut -d'=' -f2)
        echo -e "${GREEN}✅ 从 .env 文件读取 JWT_SECRET${NC}"
    elif [ -f "config/env/.env.supabase" ]; then
        JWT_SECRET=$(grep '^JWT_SECRET=' config/env/.env.supabase | cut -d'=' -f2)
        echo -e "${GREEN}✅ 从 config/env/.env.supabase 读取 JWT_SECRET${NC}"
    fi
fi

if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}❌ 错误: 未提供 JWT_SECRET${NC}"
    echo "使用方法:"
    echo "  ./deploy/scripts/generate-jwt-keys.sh 'your-jwt-secret'"
    echo ""
    echo "或在项目根目录执行（自动读取 .env 文件）:"
    echo "  ./deploy/scripts/generate-jwt-keys.sh"
    exit 1
fi

echo -e "${CYAN}JWT_SECRET: ${JWT_SECRET:0:20}...${NC}"
echo ""

# 检查 openssl 是否安装
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ 错误: openssl 未安装${NC}"
    echo "请先安装 openssl:"
    echo "  Ubuntu/Debian: sudo apt-get install openssl"
    echo "  macOS: brew install openssl"
    exit 1
fi

# Base64 URL 编码函数（不填充）
base64url_encode() {
    echo -n "$1" | base64 | tr '+/' '-_' | tr -d '='
}

# 生成 JWT
generate_jwt() {
    local role="$1"
    local iat="1770863694"
    local exp="2086223694"
    
    # Header
    local header='{"alg":"HS256","typ":"JWT"}'
    local header_b64=$(base64url_encode "$header")
    
    # Payload
    local payload="{\"iss\":\"supabase\",\"ref\":\"pmsy\",\"role\":\"$role\",\"iat\":$iat,\"exp\":$exp}"
    local payload_b64=$(base64url_encode "$payload")
    
    # Signature
    local signature=$(echo -n "${header_b64}.${payload_b64}" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | base64 | tr '+/' '-_' | tr -d '=')
    
    # 组合 JWT
    echo "${header_b64}.${payload_b64}.${signature}"
}

echo -e "${YELLOW}生成 Key...${NC}"
echo ""

# 生成 ANON_KEY
echo -e "${CYAN}1. 生成 ANON_KEY...${NC}"
ANON_KEY=$(generate_jwt "anon")
echo -e "${GREEN}✅ ANON_KEY 生成完成${NC}"
echo ""

# 生成 SERVICE_ROLE_KEY
echo -e "${CYAN}2. 生成 SERVICE_ROLE_KEY...${NC}"
SERVICE_ROLE_KEY=$(generate_jwt "service_role")
echo -e "${GREEN}✅ SERVICE_ROLE_KEY 生成完成${NC}"
echo ""

# 显示结果
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}生成的 Key${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo -e "${CYAN}VITE_SUPABASE_ANON_KEY:${NC}"
echo "$ANON_KEY"
echo ""
echo -e "${CYAN}SUPABASE_SERVICE_ROLE_KEY:${NC}"
echo "$SERVICE_ROLE_KEY"
echo ""

# 更新配置文件
UPDATE_FILES=()

# 更新 .env.supabase
if [ -f "config/env/.env.supabase" ]; then
    echo -e "${YELLOW}更新 config/env/.env.supabase...${NC}"
    sed -i.bak "s|VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$ANON_KEY|g" config/env/.env.supabase
    sed -i.bak "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY|g" config/env/.env.supabase
    rm -f config/env/.env.supabase.bak
    UPDATE_FILES+=("config/env/.env.supabase")
    echo -e "${GREEN}✅ 已更新${NC}"
fi

# 更新 .env.production
if [ -f "config/env/.env.production" ]; then
    echo -e "${YELLOW}更新 config/env/.env.production...${NC}"
    sed -i.bak "s|VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$ANON_KEY|g" config/env/.env.production
    rm -f config/env/.env.production.bak
    UPDATE_FILES+=("config/env/.env.production")
    echo -e "${GREEN}✅ 已更新${NC}"
fi

# 更新 .env（如果存在）
if [ -f ".env" ]; then
    echo -e "${YELLOW}更新 .env...${NC}"
    sed -i.bak "s|VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$ANON_KEY|g" .env
    sed -i.bak "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY|g" .env
    rm -f .env.bak
    UPDATE_FILES+=(".env")
    echo -e "${GREEN}✅ 已更新${NC}"
fi

echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}✅ Key 生成完成${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

if [ ${#UPDATE_FILES[@]} -gt 0 ]; then
    echo -e "${GREEN}已更新以下文件:${NC}"
    for file in "${UPDATE_FILES[@]}"; do
        echo "  - $file"
    done
    echo ""
    echo -e "${YELLOW}⚠️  重要提示:${NC}"
    echo "由于 Anon Key 被硬编码在前端代码中，你需要重新构建前端:"
    echo ""
    echo -e "${CYAN}  npm run build${NC}"
    echo ""
    echo "然后重新上传到服务器:"
    echo -e "${CYAN}  rsync -avz --delete dist/ ubuntu@服务器IP:/opt/pmsy/dist/${NC}"
else
    echo -e "${YELLOW}⚠️  未找到配置文件，请手动更新以下 Key:${NC}"
    echo ""
    echo "VITE_SUPABASE_ANON_KEY=$ANON_KEY"
    echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
fi

echo ""
