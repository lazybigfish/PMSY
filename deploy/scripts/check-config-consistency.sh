#!/bin/bash
# ==========================================
# PMSY 配置一致性检查脚本
# ==========================================
#
# 此脚本用于检查部署相关配置的一致性
#
# 使用方法:
#   ./deploy/scripts/check-config-consistency.sh
#
# ==========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

DOCKER_COMPOSE_FILE="$PROJECT_DIR/config/docker/docker-compose.yml"
NGINX_CONF_FILE="$PROJECT_DIR/config/nginx/nginx.conf"
ENV_FILE="$PROJECT_DIR/config/env/.env.supabase"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PMSY 配置一致性检查${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

ERRORS=0
WARNINGS=0

error() {
    echo -e "${RED}❌ 错误: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

warning() {
    echo -e "${YELLOW}⚠️  警告: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

check_file_exists() {
    local file="$1"
    local name="$2"
    if [ ! -f "$file" ]; then
        error "$name 文件不存在: $file"
        return 1
    fi
    success "$name 文件存在"
    return 0
}

# 检查 1: 文件存在性
echo -e "${BLUE}[检查 1/5] 检查配置文件存在性${NC}"
echo ""
check_file_exists "$DOCKER_COMPOSE_FILE" "docker-compose.yml"
check_file_exists "$NGINX_CONF_FILE" "nginx.conf"
check_file_exists "$ENV_FILE" ".env.supabase"
echo ""

# 检查 2: nginx.conf 中的代理配置
echo -e "${BLUE}[检查 2/5] 检查 Nginx 代理配置${NC}"
echo ""

# 提取 nginx 中的 proxy_pass 目标服务（支持 http://service:port/ 格式）
NGINX_SERVICES=$(grep -oE "proxy_pass http://[a-zA-Z0-9_-]+:[0-9]+" "$NGINX_CONF_FILE" | sed 's|proxy_pass http://||' | sed 's|/.*||' | cut -d':' -f1 | sort | uniq)

if [ -z "$NGINX_SERVICES" ]; then
    warning "未在 nginx.conf 中找到 proxy_pass 配置"
else
    info "Nginx 代理目标服务:"
    for service in $NGINX_SERVICES; do
        echo "  - $service"
    done
    echo ""

    # 检查每个代理目标是否在 docker-compose 中
    for service in $NGINX_SERVICES; do
        if grep -qE "^\s+${service}:" "$DOCKER_COMPOSE_FILE"; then
            success "代理目标 '$service' 在 docker-compose.yml 中存在"
        else
            error "代理目标 '$service' 在 docker-compose.yml 中不存在！"
            info "请检查 nginx.conf 中的 proxy_pass 配置，或确保 docker-compose.yml 中定义了该服务"
        fi
    done
fi
echo ""

# 检查 3: Kong 相关配置检查
echo -e "${BLUE}[检查 3/5] 检查 Kong 网关残留配置${NC}"
echo ""

KONG_REFERENCES=$(grep -n "kong" "$NGINX_CONF_FILE" || true)
if [ -n "$KONG_REFERENCES" ]; then
    error "nginx.conf 中仍包含 Kong 的引用:"
    echo "$KONG_REFERENCES" | while read -r line; do
        echo "  $line"
    done
    info "建议: 将 Kong 代理改为直连服务（auth:9999, rest:3000, api:3001）"
else
    success "nginx.conf 中没有 Kong 相关配置"
fi
echo ""

# 检查 4: 端口配置一致性
echo -e "${BLUE}[检查 4/5] 检查端口配置一致性${NC}"
echo ""

# 检查关键端口
info "检查关键服务端口..."

# auth 服务端口 - 内部服务检查容器端口
if grep -q "proxy_pass http://auth:9999" "$NGINX_CONF_FILE"; then
    if grep -A 10 "^\s\+auth:" "$DOCKER_COMPOSE_FILE" | grep -q '9999:9999'; then
        success "auth 服务端口配置一致 (9999)"
    elif grep -A 10 "^\s\+auth:" "$DOCKER_COMPOSE_FILE" | grep -q '"9999'; then
        success "auth 服务端口配置一致 (9999)"
    else
        info "auth 服务使用内部网络通信（端口 9999），无需主机端口映射"
    fi
fi

# rest 服务端口
if grep -q "proxy_pass http://rest:3000" "$NGINX_CONF_FILE"; then
    if grep -A 10 "^\s\+rest:" "$DOCKER_COMPOSE_FILE" | grep -q '3000:3000'; then
        success "rest 服务端口配置一致 (3000)"
    elif grep -A 10 "^\s\+rest:" "$DOCKER_COMPOSE_FILE" | grep -q '"3000'; then
        success "rest 服务端口配置一致 (3000)"
    else
        info "rest 服务使用内部网络通信（端口 3000），无需主机端口映射"
    fi
fi

# api 服务端口
if grep -q "proxy_pass http://api:3001" "$NGINX_CONF_FILE"; then
    if grep -A 10 "^\s\+api:" "$DOCKER_COMPOSE_FILE" | grep -q '3001:3001'; then
        success "api 服务端口配置一致 (3001)"
    elif grep -A 10 "^\s\+api:" "$DOCKER_COMPOSE_FILE" | grep -q '"3001'; then
        success "api 服务端口配置一致 (3001)"
    else
        info "api 服务使用内部网络通信（端口 3001），无需主机端口映射"
    fi
fi
echo ""

# 检查 5: 环境变量配置
echo -e "${BLUE}[检查 5/5] 检查环境变量配置${NC}"
echo ""

if [ -f "$ENV_FILE" ]; then
    # 检查关键环境变量
    API_URL=$(grep "^API_EXTERNAL_URL=" "$ENV_FILE" | cut -d'=' -f2 || true)
    if [ -n "$API_URL" ]; then
        info "API_EXTERNAL_URL: $API_URL"
        if echo "$API_URL" | grep -q ":8000"; then
            warning "API_EXTERNAL_URL 包含 :8000 端口，如果已移除 Kong，建议改为 :80 或不指定端口"
        fi
    fi

    SITE_URL=$(grep "^SITE_URL=" "$ENV_FILE" | cut -d'=' -f2 || true)
    if [ -n "$SITE_URL" ]; then
        info "SITE_URL: $SITE_URL"
        if echo "$SITE_URL" | grep -q ":8000"; then
            warning "SITE_URL 包含 :8000 端口，如果已移除 Kong，建议改为 :80 或不指定端口"
        fi
    fi
else
    warning ".env.supabase 文件不存在"
fi
echo ""

# 总结
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}检查完成${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有检查通过，配置一致性良好！${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  检查完成，发现 $WARNINGS 个警告${NC}"
    echo -e "${YELLOW}建议处理警告后再进行部署${NC}"
    exit 0
else
    echo -e "${RED}❌ 检查完成，发现 $ERRORS 个错误，$WARNINGS 个警告${NC}"
    echo -e "${RED}请先修复错误后再进行部署${NC}"
    exit 1
fi
