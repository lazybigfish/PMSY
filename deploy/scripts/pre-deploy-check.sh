#!/bin/bash
# ==========================================
# PMSY 部署前检查脚本
# ==========================================
#
# 此脚本在部署前执行，检查所有配置是否正确
# 确保 Key 匹配、配置正确，避免部署后出现问题
#
# 使用方法:
#   ./deploy/scripts/pre-deploy-check.sh
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

ERRORS=0
WARNINGS=0

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}PMSY 部署前检查脚本${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# 检查文件是否存在
check_file() {
    local file="$1"
    local required="$2"
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file 存在${NC}"
        return 0
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}❌ $file 不存在（必需）${NC}"
            ((ERRORS++))
            return 1
        else
            echo -e "${YELLOW}⚠️  $file 不存在（可选）${NC}"
            ((WARNINGS++))
            return 1
        fi
    fi
}

# 检查环境变量
check_env_var() {
    local file="$1"
    local var="$2"
    local required="$3"
    
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    local value=$(grep "^$var=" "$file" 2>/dev/null | cut -d'=' -f2)
    
    if [ -n "$value" ]; then
        if [ "$var" = "JWT_SECRET" ] || [ "$var" = "POSTGRES_PASSWORD" ] || [ "$var" = "DASHBOARD_PASSWORD" ] || [ "$var" = "ROOT_USER_PASSWORD" ]; then
            echo -e "${GREEN}✅ $var 已设置 (${value:0:10}...)${NC}"
        else
            echo -e "${GREEN}✅ $var=$value${NC}"
        fi
        return 0
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}❌ $var 未设置（必需）${NC}"
            ((ERRORS++))
            return 1
        else
            echo -e "${YELLOW}⚠️  $var 未设置${NC}"
            ((WARNINGS++))
            return 1
        fi
    fi
}

# 验证 JWT Token
verify_jwt() {
    local token="$1"
    local secret="$2"
    local name="$3"
    
    if [ -z "$token" ] || [ -z "$secret" ]; then
        return 1
    fi
    
    # 提取 header 和 payload
    local header_b64=$(echo "$token" | cut -d'.' -f1)
    local payload_b64=$(echo "$token" | cut -d'.' -f2)
    local signature=$(echo "$token" | cut -d'.' -f3)
    
    # 重新计算签名
    local expected_signature=$(echo -n "${header_b64}.${payload_b64}" | openssl dgst -sha256 -hmac "$secret" -binary | base64 | tr '+/' '-_' | tr -d '=')
    
    if [ "$signature" = "$expected_signature" ]; then
        echo -e "${GREEN}✅ $name 签名验证通过${NC}"
        return 0
    else
        echo -e "${RED}❌ $name 签名验证失败${NC}"
        echo -e "${YELLOW}   原因: Token 与 JWT_SECRET 不匹配${NC}"
        ((ERRORS++))
        return 1
    fi
}

# ==========================================
# 1. 检查必需文件
# ==========================================
echo -e "${BLUE}[1/6] 检查必需文件...${NC}"
echo ""

check_file "config/docker/docker-compose.yml" "required"
check_file "config/env/.env.supabase" "required"
check_file "nginx.conf" "required"
check_file "config/env/.env.production" "required"

echo ""

# ==========================================
# 2. 检查 .env.supabase 配置
# ==========================================
echo -e "${BLUE}[2/6] 检查 .env.supabase 配置...${NC}"
echo ""

if [ -f "config/env/.env.supabase" ]; then
    check_env_var "config/env/.env.supabase" "JWT_SECRET" "required"
    check_env_var "config/env/.env.supabase" "VITE_SUPABASE_ANON_KEY" "required"
    check_env_var "config/env/.env.supabase" "SUPABASE_SERVICE_ROLE_KEY" "required"
    check_env_var "config/env/.env.supabase" "POSTGRES_PASSWORD" "required"
    check_env_var "config/env/.env.supabase" "API_EXTERNAL_URL" "required"
    check_env_var "config/env/.env.supabase" "SITE_URL" "required"
    check_env_var "config/env/.env.supabase" "DASHBOARD_PASSWORD" "required"
    check_env_var "config/env/.env.supabase" "ROOT_USER_PASSWORD" "required"
fi

echo ""

# ==========================================
# 3. 检查 .env.production 配置
# ==========================================
echo -e "${BLUE}[3/6] 检查 .env.production 配置...${NC}"
echo ""

if [ -f "config/env/.env.production" ]; then
    check_env_var "config/env/.env.production" "VITE_SUPABASE_URL" "required"
    check_env_var "config/env/.env.production" "VITE_SUPABASE_ANON_KEY" "required"
    
    # 检查 URL 是否包含端口
    local url=$(grep "^VITE_SUPABASE_URL=" config/env/.env.production | cut -d'=' -f2)
    if [[ "$url" == *":8000"* ]] || [[ "$url" == *":3000"* ]]; then
        echo -e "${YELLOW}⚠️  VITE_SUPABASE_URL 包含端口 ($url)${NC}"
        echo -e "${YELLOW}   建议: 使用 http://<IP> 格式（通过 Nginx 代理）${NC}"
        ((WARNINGS++))
    fi
fi

echo ""

# ==========================================
# 4. 验证 Key 匹配
# ==========================================
echo -e "${BLUE}[4/6] 验证 Key 与 JWT_SECRET 匹配...${NC}"
echo ""

if [ -f "config/env/.env.supabase" ]; then
    JWT_SECRET=$(grep "^JWT_SECRET=" config/env/.env.supabase | cut -d'=' -f2)
    ANON_KEY=$(grep "^VITE_SUPABASE_ANON_KEY=" config/env/.env.supabase | cut -d'=' -f2)
    SERVICE_ROLE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" config/env/.env.supabase | cut -d'=' -f2)
    
    if [ -n "$JWT_SECRET" ] && [ -n "$ANON_KEY" ]; then
        verify_jwt "$ANON_KEY" "$JWT_SECRET" "ANON_KEY"
    fi
    
    if [ -n "$JWT_SECRET" ] && [ -n "$SERVICE_ROLE_KEY" ]; then
        verify_jwt "$SERVICE_ROLE_KEY" "$JWT_SECRET" "SERVICE_ROLE_KEY"
    fi
fi

echo ""

# ==========================================
# 5. 检查 docker-compose.yml
# ==========================================
echo -e "${BLUE}[5/6] 检查 docker-compose.yml...${NC}"
echo ""

if [ -f "config/docker/docker-compose.yml" ]; then
    # 检查 auth 服务端口映射
    if grep -q "9999:9999" config/docker/docker-compose.yml; then
        echo -e "${GREEN}✅ auth 服务端口映射已配置 (9999:9999)${NC}"
    else
        echo -e "${YELLOW}⚠️  auth 服务缺少端口映射 9999:9999${NC}"
        ((WARNINGS++))
    fi
    
    # 检查 PostgREST 密码配置
    if grep -q "POSTGRES_PASSWORD_PLACEHOLDER" config/docker/docker-compose.yml; then
        echo -e "${YELLOW}⚠️  PostgREST 使用密码占位符，部署时需要替换${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅ PostgREST 密码已配置${NC}"
    fi
    
    # 检查 API 服务依赖
    if grep -A 5 "api:" config/docker/docker-compose.yml | grep -q "kong:"; then
        echo -e "${YELLOW}⚠️  API 服务依赖 Kong，建议改为依赖 db${NC}"
        ((WARNINGS++))
    fi
fi

echo ""

# ==========================================
# 6. 检查 nginx.conf
# ==========================================
echo -e "${BLUE}[6/6] 检查 nginx.conf...${NC}"
echo ""

if [ -f "nginx.conf" ]; then
    # 检查 auth 代理
    if grep -q "location /auth/v1/" nginx.conf; then
        echo -e "${GREEN}✅ Nginx auth 代理已配置${NC}"
    else
        echo -e "${RED}❌ Nginx 缺少 auth 代理配置${NC}"
        ((ERRORS++))
    fi
    
    # 检查 rest 代理
    if grep -q "location /rest/" nginx.conf; then
        echo -e "${GREEN}✅ Nginx rest 代理已配置${NC}"
    else
        echo -e "${RED}❌ Nginx 缺少 rest 代理配置${NC}"
        ((ERRORS++))
    fi
    
    # 检查 api 代理
    if grep -q "location /api/" nginx.conf; then
        echo -e "${GREEN}✅ Nginx api 代理已配置${NC}"
    else
        echo -e "${RED}❌ Nginx 缺少 api 代理配置${NC}"
        ((ERRORS++))
    fi
fi

echo ""

# ==========================================
# 总结
# ==========================================
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}检查结果${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ 所有检查通过，可以进行部署${NC}"
    echo ""
    echo -e "${CYAN}建议执行:${NC}"
    echo "  1. ./deploy/fresh-install/deploy.sh"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  检查通过，但有 $WARNINGS 个警告${NC}"
    echo ""
    echo -e "${YELLOW}建议修复警告后再部署${NC}"
    exit 0
else
    echo -e "${RED}❌ 检查失败，发现 $ERRORS 个错误，$WARNINGS 个警告${NC}"
    echo ""
    echo -e "${RED}请先修复错误后再部署${NC}"
    echo ""
    echo -e "${CYAN}常见问题:${NC}"
    echo "  - Key 签名失败: 运行 ./deploy/scripts/generate-jwt-keys.sh"
    echo "  - 缺少配置: 检查 config/env/.env.supabase"
    exit 1
fi
