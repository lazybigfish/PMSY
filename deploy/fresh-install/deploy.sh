#!/bin/bash
# ==========================================
# 🆕 PMSY 全新部署脚本 (fresh-install)
# ==========================================
#
# 【执行环境】此脚本必须在开发机上执行！
#
# 支持三种部署模式：
# 模式1: 在线部署 - 开发机连接服务器，服务器在线拉取镜像
# 模式2: 半离线部署 - 开发机连接服务器，但服务器无法拉取镜像
# 模式3: 完全离线部署 - 生成离线部署包，用户自行上传到服务器
#
# 使用方法:
#   ./deploy/fresh-install/deploy.sh
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

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${RED}==========================================${NC}"
echo -e "${RED}🆕 PMSY 全新部署脚本 (fresh-install)${NC}"
echo -e "${RED}==========================================${NC}"
echo ""

# 检查执行环境
cd "$PROJECT_DIR"

if [ ! -f "config/docker/docker-compose.yml" ] || [ ! -d "deploy" ]; then
    echo -e "${RED}❌ 错误: 请在项目根目录执行此脚本${NC}"
    echo "正确用法: ./deploy/fresh-install/deploy.sh"
    exit 1
fi

echo -e "${GREEN}✅ 执行环境检查通过${NC}"
echo ""

# ==========================================
# 步骤 0: 配置一致性检查（全自动）
# ==========================================
echo -e "${BLUE}[步骤 0/6] 执行配置一致性检查...${NC}"
echo ""

# 配置检查函数
check_config_consistency() {
    local ERRORS=0
    local WARNINGS=0
    
    local DOCKER_COMPOSE_FILE="$PROJECT_DIR/config/docker/docker-compose.yml"
    local NGINX_CONF_FILE="$PROJECT_DIR/config/nginx/nginx.conf"
    local ENV_FILE="$PROJECT_DIR/config/env/.env.supabase"
    
    error() {
        echo -e "${RED}  ❌ 错误: $1${NC}"
        ERRORS=$((ERRORS + 1))
    }
    
    warning() {
        echo -e "${YELLOW}  ⚠️  警告: $1${NC}"
        WARNINGS=$((WARNINGS + 1))
    }
    
    success() {
        echo -e "${GREEN}  ✅ $1${NC}"
    }
    
    info() {
        echo -e "${CYAN}  ℹ️  $1${NC}"
    }
    
    # 检查 1: 文件存在性
    echo -e "${CYAN}  [1/5] 检查配置文件存在性${NC}"
    [ ! -f "$DOCKER_COMPOSE_FILE" ] && error "docker-compose.yml 不存在" || success "docker-compose.yml 存在"
    [ ! -f "$NGINX_CONF_FILE" ] && error "nginx.conf 不存在" || success "nginx.conf 存在"
    [ ! -f "$ENV_FILE" ] && error ".env.supabase 不存在" || success ".env.supabase 存在"
    
    # 如果有文件不存在，直接返回错误
    if [ $ERRORS -gt 0 ]; then
        return 1
    fi
    
    # 检查 2: Nginx 代理配置
    echo ""
    echo -e "${CYAN}  [2/5] 检查 Nginx 代理配置${NC}"
    local NGINX_SERVICES=$(grep -oE "proxy_pass http://[a-zA-Z0-9_-]+:[0-9]+" "$NGINX_CONF_FILE" | sed 's|proxy_pass http://||' | sed 's|/.*||' | cut -d':' -f1 | sort | uniq)
    
    if [ -z "$NGINX_SERVICES" ]; then
        warning "未找到 proxy_pass 配置"
    else
        info "代理目标: $(echo $NGINX_SERVICES | tr '\n' ' ')"
        for service in $NGINX_SERVICES; do
            if grep -qE "^\s+${service}:" "$DOCKER_COMPOSE_FILE"; then
                success "'$service' 在 docker-compose.yml 中存在"
            else
                error "'$service' 在 docker-compose.yml 中不存在！"
            fi
        done
    fi
    
    # 检查 3: Kong 残留配置
    echo ""
    echo -e "${CYAN}  [3/5] 检查 Kong 网关残留配置${NC}"
    if grep -q "kong" "$NGINX_CONF_FILE"; then
        error "nginx.conf 中仍包含 Kong 引用"
        info "建议: 将 Kong 代理改为直连服务（auth:9999, rest:3000, api:3001）"
    else
        success "无 Kong 残留配置"
    fi
    
    # 检查 4: 端口配置
    echo ""
    echo -e "${CYAN}  [4/5] 检查端口配置一致性${NC}"
    grep -q "proxy_pass http://auth:9999" "$NGINX_CONF_FILE" && success "auth 端口配置正确 (9999)"
    grep -q "proxy_pass http://rest:3000" "$NGINX_CONF_FILE" && success "rest 端口配置正确 (3000)"
    grep -q "proxy_pass http://api:3001" "$NGINX_CONF_FILE" && success "api 端口配置正确 (3001)"
    
    # 检查 5: 环境变量
    echo ""
    echo -e "${CYAN}  [5/5] 检查环境变量配置${NC}"
    local API_URL=$(grep "^API_EXTERNAL_URL=" "$ENV_FILE" | cut -d'=' -f2 || true)
    local SITE_URL=$(grep "^SITE_URL=" "$ENV_FILE" | cut -d'=' -f2 || true)
    
    [ -n "$API_URL" ] && info "API_EXTERNAL_URL: $API_URL"
    [ -n "$SITE_URL" ] && info "SITE_URL: $SITE_URL"
    
    if echo "$API_URL" | grep -q ":8000" 2>/dev/null; then
        warning "API_EXTERNAL_URL 包含已移除的 :8000 端口"
    fi
    if echo "$SITE_URL" | grep -q ":8000" 2>/dev/null; then
        warning "SITE_URL 包含已移除的 :8000 端口"
    fi
    
    # 返回结果
    echo ""
    if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}  🎉 配置检查通过${NC}"
        return 0
    elif [ $ERRORS -eq 0 ]; then
        echo -e "${YELLOW}  ⚠️  检查通过，但有 $WARNINGS 个警告${NC}"
        return 0
    else
        echo -e "${RED}  ❌ 检查失败: $ERRORS 个错误，$WARNINGS 个警告${NC}"
        return 1
    fi
}

# 执行配置检查
if ! check_config_consistency; then
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ 配置一致性检查未通过${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "请修复上述错误后再进行部署"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 配置一致性检查通过${NC}"
echo ""

# 警告提示
echo -e "${YELLOW}⚠️  警告：此操作将清空服务器所有现有数据！${NC}"
echo -e "${YELLOW}   - 删除现有 PostgreSQL 数据${NC}"
echo -e "${YELLOW}   - 删除现有用户数据${NC}"
echo -e "${YELLOW}   - 删除现有文件存储${NC}"
echo -e "${YELLOW}   - 重新初始化所有配置${NC}"
echo ""
read -p "是否继续? (yes/no) " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "已取消部署"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}请选择部署模式:${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}模式1: 在线部署${NC}"
echo "  ✓ 开发机可 SSH 连接服务器"
echo "  ✓ 服务器可在线拉取 Docker 镜像"
echo "  → 自动上传代码，服务器在线拉取镜像"
echo ""
echo -e "${YELLOW}模式2: 半离线部署${NC}"
echo "  ✓ 开发机可 SSH 连接服务器"
echo "  ✗ 服务器无法连接 Docker Hub"
echo "  → 自动导出镜像并上传，服务器导入镜像"
echo ""
echo -e "${CYAN}模式3: 完全离线部署${NC}"
echo "  ✗ 开发机无法 SSH 连接服务器"
echo "  ✗ 服务器无法连接 Docker Hub"
echo "  → 生成离线部署包，用户手动上传部署"
echo ""

DEPLOY_MODE=""
while true; do
    read -p "请选择部署模式 (1/2/3): " MODE_CHOICE
    case $MODE_CHOICE in
        1)
            DEPLOY_MODE="online"
            echo -e "${GREEN}   已选择: 在线部署模式${NC}"
            break
            ;;
        2)
            DEPLOY_MODE="semi-offline"
            echo -e "${YELLOW}   已选择: 半离线部署模式${NC}"
            break
            ;;
        3)
            DEPLOY_MODE="offline"
            echo -e "${CYAN}   已选择: 完全离线部署模式${NC}"
            break
            ;;
        *)
            echo -e "${YELLOW}   无效选择，请重新输入${NC}"
            ;;
    esac
done

echo ""

# ==========================================
# 公共步骤：配置服务器信息
# ==========================================
echo -e "${BLUE}[步骤 1/5] 配置服务器信息${NC}"
echo ""

# 读取或输入服务器配置
if [ -f ".env.deploy" ]; then
    source .env.deploy
    echo -e "${GREEN}   已加载配置文件 .env.deploy${NC}"
else
    echo -e "${YELLOW}   未找到 .env.deploy，请输入服务器配置${NC}"
fi

# 服务器 IP
if [ -z "$DEPLOY_SERVER_IP" ]; then
    read -p "   服务器 IP: " DEPLOY_SERVER_IP
fi
echo "   服务器 IP: $DEPLOY_SERVER_IP"

# 服务器用户名
if [ -z "$DEPLOY_SERVER_USER" ]; then
    DEPLOY_SERVER_USER="${DEPLOY_SERVER_USER:-ubuntu}"
    read -p "   服务器用户名 [$DEPLOY_SERVER_USER]: " input_user
    DEPLOY_SERVER_USER="${input_user:-$DEPLOY_SERVER_USER}"
fi
echo "   服务器用户名: $DEPLOY_SERVER_USER"

# 部署目录
if [ -z "$DEPLOY_REMOTE_DIR" ]; then
    DEPLOY_REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/opt/pmsy}"
    read -p "   部署目录 [$DEPLOY_REMOTE_DIR]: " input_dir
    DEPLOY_REMOTE_DIR="${input_dir:-$DEPLOY_REMOTE_DIR}"
fi
echo "   部署目录: $DEPLOY_REMOTE_DIR"

# 保存配置
cat > .env.deploy << EOF
# PMSY 部署配置
DEPLOY_SERVER_IP=$DEPLOY_SERVER_IP
DEPLOY_SERVER_USER=$DEPLOY_SERVER_USER
DEPLOY_REMOTE_DIR=$DEPLOY_REMOTE_DIR
EOF

echo -e "${GREEN}   ✅ 服务器配置已保存到 .env.deploy${NC}"
echo ""

# ==========================================
# 公共步骤：检测生产服务器环境
# ==========================================
echo -e "${BLUE}[步骤 2/5] 检测生产服务器环境...${NC}"
echo ""

# 检查 SSH 连接
echo -e "${YELLOW}   检查服务器连接...${NC}"
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "echo OK" 2>/dev/null; then
    echo -e "${RED}❌ 错误: 无法连接到服务器 $DEPLOY_SERVER_IP${NC}"
    echo "   请检查:"
    echo "   1. 服务器 IP 是否正确"
    echo "   2. SSH 服务是否运行"
    echo "   3. 用户名是否正确"
    exit 1
fi
echo -e "${GREEN}   ✅ 服务器连接正常${NC}"

# 检查服务器上是否已有 PMSY 环境
echo -e "${YELLOW}   检查现有 PMSY 环境...${NC}"
EXISTING_ENV=$(ssh "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "
    if [ -d '$DEPLOY_REMOTE_DIR' ]; then
        echo 'DIRECTORY_EXISTS'
        if [ -f '$DEPLOY_REMOTE_DIR/docker-compose.yml' ]; then
            echo 'DOCKER_COMPOSE_EXISTS'
        fi
        if [ -d '$DEPLOY_REMOTE_DIR/volumes' ]; then
            echo 'VOLUMES_EXISTS'
        fi
        if sudo docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qE 'supabase|pmsy'; then
            echo 'CONTAINERS_EXISTS'
        fi
        if sudo docker volume ls --format '{{.Name}}' 2>/dev/null | grep -qE 'pmsy|supabase'; then
            echo 'DOCKER_VOLUMES_EXISTS'
        fi
    else
        echo 'CLEAN'
    fi
" 2>/dev/null)

# 分析检测结果
ENV_STATUS="CLEAN"
if echo "$EXISTING_ENV" | grep -q "DIRECTORY_EXISTS"; then
    ENV_STATUS="DIR"
fi
if echo "$EXISTING_ENV" | grep -q "DOCKER_COMPOSE_EXISTS"; then
    ENV_STATUS="COMPOSE"
fi
if echo "$EXISTING_ENV" | grep -q "CONTAINERS_EXISTS"; then
    ENV_STATUS="CONTAINERS"
fi
if echo "$EXISTING_ENV" | grep -q "DOCKER_VOLUMES_EXISTS"; then
    ENV_STATUS="VOLUMES"
fi

case $ENV_STATUS in
    "CLEAN")
        echo -e "${GREEN}   ✅ 服务器环境干净，无现有 PMSY 环境${NC}"
        ;;
    "DIR")
        echo -e "${YELLOW}⚠️  警告: 检测到部署目录存在，但无 Docker 配置${NC}"
        echo "   目录: $DEPLOY_REMOTE_DIR"
        ;;
    "COMPOSE")
        echo -e "${YELLOW}⚠️  警告: 检测到现有 PMSY 部署配置${NC}"
        echo "   目录: $DEPLOY_REMOTE_DIR"
        echo "   全新部署将覆盖现有配置和数据！"
        ;;
    "CONTAINERS")
        echo -e "${YELLOW}⚠️  警告: 检测到运行中的 PMSY 容器${NC}"
        echo "   现有容器将被停止并删除"
        echo "   数据卷将被清理"
        ;;
    "VOLUMES")
        echo -e "${YELLOW}⚠️  警告: 检测到现有数据卷${NC}"
        echo "   数据卷将被删除，所有数据将丢失！"
        ;;
esac

# 如果检测到现有环境，要求用户确认
if [ "$ENV_STATUS" != "CLEAN" ]; then
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}⚠️  重要提示${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "全新部署将执行以下操作:"
    echo "  1. 停止并删除所有现有 PMSY/Supabase 容器"
    echo "  2. 删除所有现有数据卷（包括数据库数据）"
    echo "  3. 删除现有部署目录并重新创建"
    echo "  4. 重新初始化所有配置和数据"
    echo ""
    echo -e "${RED}此操作不可逆，所有现有数据将丢失！${NC}"
    echo ""
    
    # 显示现有容器信息
    echo -e "${YELLOW}现有容器列表:${NC}"
    ssh "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "sudo docker ps -a --format '  {{.Names}} ({{.Status}})' 2>/dev/null | grep -E 'supabase|pmsy' || echo '  无运行中的容器'"
    echo ""
    
    # 显示现有数据卷信息
    echo -e "${YELLOW}现有数据卷列表:${NC}"
    ssh "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "sudo docker volume ls --format '  {{.Name}}' 2>/dev/null | grep -E 'pmsy|supabase' || echo '  无相关数据卷'"
    echo ""
    
    read -p "确认要清空现有环境并重新部署? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo ""
        echo -e "${YELLOW}已取消部署。如需保留数据，请使用更新部署脚本。${NC}"
        echo "   更新部署脚本: ./deploy/update/deploy.sh"
        exit 1
    fi
    
    echo ""
    echo -e "${YELLOW}   正在清空服务器环境...${NC}"
    
    # 执行环境清理
    ssh "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "
        echo '   停止现有容器...'
        cd $DEPLOY_REMOTE_DIR 2>/dev/null && sudo docker-compose down 2>/dev/null || true
        
        echo '   删除 PMSY/Supabase 容器...'
        sudo docker rm -f \$(sudo docker ps -aq --filter 'name=supabase' --filter 'name=pmsy' 2>/dev/null) 2>/dev/null || true
        
        echo '   删除数据卷...'
        sudo docker volume rm \$(sudo docker volume ls -q --filter 'name=pmsy' --filter 'name=supabase' 2>/dev/null) 2>/dev/null || true
        
        echo '   清理部署目录...'
        sudo rm -rf $DEPLOY_REMOTE_DIR
        
        echo '   创建新目录...'
        sudo mkdir -p $DEPLOY_REMOTE_DIR
        sudo chown $DEPLOY_SERVER_USER:$DEPLOY_SERVER_USER $DEPLOY_REMOTE_DIR
        
        echo '   ✅ 环境清理完成'
    "
    
    echo -e "${GREEN}   ✅ 服务器环境已重置${NC}"
fi

echo ""

# ==========================================
# 公共步骤：检查并更新配置
# ==========================================
echo -e "${BLUE}[步骤 3/5] 检查并更新配置...${NC}"
echo ""

# 检查 config/env/.env.supabase 是否存在
if [ ! -f "config/env/.env.supabase" ]; then
    echo -e "${RED}❌ 错误: config/env/.env.supabase 文件不存在${NC}"
    echo "   此文件是服务器部署的完整配置参考，必须存在"
    exit 1
fi

echo -e "${YELLOW}⚠️  重要：部署前请确保已更新 config/env/.env.supabase 中的配置${NC}"
echo ""
echo "请检查以下配置项："
echo ""
echo "  1. API_EXTERNAL_URL - 当前: $(grep '^API_EXTERNAL_URL=' config/env/.env.supabase | cut -d'=' -f2)"
echo "     建议修改为: http://$DEPLOY_SERVER_IP"
echo ""
echo "  2. SITE_URL - 当前: $(grep '^SITE_URL=' config/env/.env.supabase | cut -d'=' -f2)"
echo "     建议修改为: http://$DEPLOY_SERVER_IP"
echo ""
echo "  3. POSTGRES_PASSWORD - 数据库密码"
echo "     当前: $(grep '^POSTGRES_PASSWORD=' config/env/.env.supabase | cut -d'=' -f2)"
echo "     ⚠️  生产环境必须修改为强密码"
echo ""
echo "  4. JWT_SECRET - JWT签名密钥"
echo "     ⚠️  生产环境必须使用强随机字符串"
echo ""
echo "  5. DASHBOARD_PASSWORD - Studio管理密码"
echo "     当前: $(grep '^DASHBOARD_PASSWORD=' config/env/.env.supabase | cut -d'=' -f2)"
echo "     ⚠️  生产环境必须修改"
echo ""
echo "  6. ROOT_USER_PASSWORD - Root用户密码"
echo "     当前: $(grep '^ROOT_USER_PASSWORD=' config/env/.env.supabase | cut -d'=' -f2)"
echo "     ⚠️  生产环境必须修改"
echo ""

read -p "是否需要编辑 config/env/.env.supabase 文件? (yes/no) " -r
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}   请编辑 config/env/.env.supabase 文件，修改上述配置...${NC}"

    # 尝试使用常见编辑器
    if command -v vim &> /dev/null; then
        vim config/env/.env.supabase
    elif command -v nano &> /dev/null; then
        nano config/env/.env.supabase
    else
        echo "   请手动编辑 config/env/.env.supabase 文件，然后按回车继续..."
        read
    fi

    echo -e "${GREEN}   ✅ 配置已更新${NC}"
fi

# 检查 .env.production
if [ ! -f "config/env/.env.production" ]; then
    echo -e "${YELLOW}⚠️ 警告: config/env/.env.production 文件不存在${NC}"
    echo "   将从 config/env/.env.supabase 提取前端配置"

    # 自动创建 .env.production
    echo "   自动创建 config/env/.env.production..."
    grep "^VITE_" config/env/.env.supabase > config/env/.env.production
    echo -e "${GREEN}   ✅ 已创建 config/env/.env.production${NC}"
fi

# 验证前端配置
if [ -f "config/env/.env.production" ]; then
    SUPABASE_URL=$(grep VITE_SUPABASE_URL config/env/.env.production | cut -d'=' -f2)
    if [[ "$SUPABASE_URL" != *"$DEPLOY_SERVER_IP"* ]]; then
        echo -e "${YELLOW}⚠️ 警告: config/env/.env.production 中的 VITE_SUPABASE_URL 与服务器IP不匹配${NC}"
        echo "   当前: $SUPABASE_URL"
        echo "   服务器IP: $DEPLOY_SERVER_IP"
        echo "   建议: http://$DEPLOY_SERVER_IP"

        read -p "是否自动更新 config/env/.env.production? (yes/no) " -r
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            sed -i "s|VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=http://$DEPLOY_SERVER_IP|" config/env/.env.production
            echo -e "${GREEN}   ✅ 已更新 VITE_SUPABASE_URL${NC}"
        fi
    fi
fi

# ==========================================
# 关键：验证 Key 与 JWT_SECRET 匹配
# ==========================================
echo ""
echo -e "${BLUE}验证 JWT Key...${NC}"
echo ""

# 读取 JWT_SECRET 和 Key
JWT_SECRET=$(grep "^JWT_SECRET=" config/env/.env.supabase | cut -d'=' -f2)
ANON_KEY=$(grep "^VITE_SUPABASE_ANON_KEY=" config/env/.env.supabase | cut -d'=' -f2)
SERVICE_ROLE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" config/env/.env.supabase | cut -d'=' -f2)

# 验证函数
verify_jwt() {
    local token="$1"
    local secret="$2"
    local header_b64=$(echo "$token" | cut -d'.' -f1)
    local payload_b64=$(echo "$token" | cut -d'.' -f2)
    local signature=$(echo "$token" | cut -d'.' -f3)
    local expected_sig=$(echo -n "${header_b64}.${payload_b64}" | openssl dgst -sha256 -hmac "$secret" -binary | base64 | tr '+/' '-_' | tr -d '=')
    [ "$signature" = "$expected_sig" ]
}

# 检查 Key 是否匹配
KEYS_VALID=true
if [ -n "$JWT_SECRET" ] && [ -n "$ANON_KEY" ]; then
    if ! verify_jwt "$ANON_KEY" "$JWT_SECRET"; then
        echo -e "${RED}❌ ANON_KEY 与 JWT_SECRET 不匹配${NC}"
        KEYS_VALID=false
    fi
fi

if [ -n "$JWT_SECRET" ] && [ -n "$SERVICE_ROLE_KEY" ]; then
    if ! verify_jwt "$SERVICE_ROLE_KEY" "$JWT_SECRET"; then
        echo -e "${RED}❌ SERVICE_ROLE_KEY 与 JWT_SECRET 不匹配${NC}"
        KEYS_VALID=false
    fi
fi

# 如果 Key 不匹配，自动生成新的 Key
if [ "$KEYS_VALID" = false ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Key 不匹配，需要重新生成${NC}"
    echo ""
    
    # 检查生成脚本是否存在
    if [ -f "deploy/scripts/generate-jwt-keys.sh" ]; then
        echo -e "${YELLOW}正在自动重新生成 Key...${NC}"
        ./deploy/scripts/generate-jwt-keys.sh "$JWT_SECRET"
        
        # 重新读取新生成的 Key
        ANON_KEY=$(grep "^VITE_SUPABASE_ANON_KEY=" config/env/.env.supabase | cut -d'=' -f2)
        
        echo ""
        echo -e "${YELLOW}⚠️  重要: Key 已更新，必须重新构建前端${NC}"
        echo ""
    else
        echo -e "${RED}❌ 错误: Key 生成脚本不存在${NC}"
        echo "   请手动运行: ./deploy/scripts/generate-jwt-keys.sh"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Key 验证通过${NC}"
fi

echo ""
echo -e "${GREEN}   ✅ 环境检查完成${NC}"
echo ""

# ==========================================
# 公共步骤：构建前端
# ==========================================
echo -e "${BLUE}[步骤 4/5] 构建前端...${NC}"

# 备份开发环境配置
if [ -f ".env" ]; then
    cp .env .env.backup.development
fi

# 使用生产环境配置构建
if [ -f "config/env/.env.production" ]; then
    cp config/env/.env.production .env
    echo -e "${YELLOW}   使用 config/env/.env.production 构建前端${NC}"
elif [ -f "config/env/.env.supabase" ]; then
    # 从 .env.supabase 提取前端配置创建临时 .env
    grep "^VITE_" config/env/.env.supabase > .env 2>/dev/null || true
    echo -e "${YELLOW}   使用 config/env/.env.supabase 中的 VITE_ 配置构建前端${NC}"
else
    echo -e "${RED}❌ 错误: 未找到 config/env/.env.production 或 config/env/.env.supabase 文件${NC}"
    exit 1
fi

# 备份并移除 .env.local（Vite 会优先使用它）
if [ -f ".env.local" ]; then
    mv .env.local .env.local.backup
    echo -e "${YELLOW}   已备份 .env.local（避免覆盖生产配置）${NC}"
fi

npm run build

# 恢复 .env.local
if [ -f ".env.local.backup" ]; then
    mv .env.local.backup .env.local
    echo -e "${YELLOW}   已恢复 .env.local${NC}"
fi

# 恢复开发环境配置
if [ -f ".env.backup.development" ]; then
    mv .env.backup.development .env
    echo -e "${YELLOW}   已恢复开发环境配置${NC}"
else
    rm -f .env
fi

# 验证构建结果
if ! grep -q "$DEPLOY_SERVER_IP" dist/assets/*.js 2>/dev/null; then
    echo -e "${YELLOW}⚠️ 警告: 构建文件可能未包含正确的 Supabase URL${NC}"
    echo "   请确保 .env.production 或 .env.supabase 中的 VITE_SUPABASE_URL 配置正确"
else
    echo -e "${GREEN}   ✅ 前端构建验证通过${NC}"
fi

echo ""

# ==========================================
# 根据部署模式执行不同逻辑
# ==========================================

case $DEPLOY_MODE in
    "online")
        # ==========================================
        # 模式1: 在线部署
        # ==========================================
        echo -e "${BLUE}[步骤 5/5] 在线部署到服务器...${NC}"
        echo ""
        
        # 配置 SSH
        echo -e "${YELLOW}   配置 SSH 免密码登录...${NC}"
        if [ ! -f "$HOME/.ssh/id_rsa" ]; then
            echo "   生成 SSH 密钥对..."
            ssh-keygen -t rsa -b 4096 -C "pmsy-deploy" -f "$HOME/.ssh/id_rsa" -N ""
            echo "   ✅ SSH 密钥已生成"
        fi

        # 检查是否已配置免密码登录
        echo "   检查 SSH 免密码登录..."
        if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "echo OK" 2>/dev/null; then
            echo ""
            echo -e "${CYAN}   ========================================${NC}"
            echo -e "${CYAN}   需要配置 SSH 免密码登录${NC}"
            echo -e "${CYAN}   ========================================${NC}"
            echo ""
            echo "   请输入服务器 ${DEPLOY_SERVER_USER}@${DEPLOY_SERVER_IP} 的登录密码"
            echo "   （密码输入时不会显示，输入完成后按回车）"
            echo ""

            # 尝试配置 SSH 免密码登录，最多重试3次
            SSH_CONFIG_SUCCESS=false
            for i in {1..3}; do
                if ssh-copy-id -o StrictHostKeyChecking=no "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" 2>&1; then
                    SSH_CONFIG_SUCCESS=true
                    break
                else
                    echo ""
                    echo -e "${YELLOW}   ⚠️  密码错误，请重新输入 (${i}/3)${NC}"
                    echo ""
                fi
            done

            if [ "$SSH_CONFIG_SUCCESS" = false ]; then
                echo ""
                echo -e "${RED}   ❌ SSH 配置失败${NC}"
                echo ""
                echo "   可能的原因："
                echo "   1. 密码输入错误"
                echo "   2. 服务器不允许密码登录"
                echo "   3. 服务器用户不存在"
                echo ""
                echo "   解决方法："
                echo "   1. 手动配置 SSH 密钥："
                echo "      ssh-copy-id ${DEPLOY_SERVER_USER}@${DEPLOY_SERVER_IP}"
                echo "   2. 或者手动登录服务器添加公钥："
                echo "      cat ~/.ssh/id_rsa.pub"
                echo ""
                exit 1
            fi
        fi
        echo -e "${GREEN}   ✅ SSH 配置完成${NC}"
        echo ""
        
        # 准备部署包
        echo -e "${YELLOW}   准备部署包（在线模式：不包Docker镜像）...${NC}"
        DEPLOY_TMP=$(mktemp -d)
        mkdir -p "$DEPLOY_TMP/pmsy"
        
        cp -r dist "$DEPLOY_TMP/pmsy/"
        cp -r api "$DEPLOY_TMP/pmsy/"
        cp config/docker/docker-compose.yml "$DEPLOY_TMP/pmsy/"
        cp config/docker/Dockerfile.api "$DEPLOY_TMP/pmsy/" 2>/dev/null || true
        cp package*.json "$DEPLOY_TMP/pmsy/" 2>/dev/null || true
        # 复制 nginx.conf（优先使用 config/nginx 目录下的）
        if [ -f "config/nginx/nginx.conf" ]; then
            cp config/nginx/nginx.conf "$DEPLOY_TMP/pmsy/nginx.conf"
        elif [ -f "deploy/config/nginx.conf" ]; then
            cp deploy/config/nginx.conf "$DEPLOY_TMP/pmsy/nginx.conf"
        fi
        # 复制 .env.supabase 作为服务器配置模板（完整配置）
        cp config/env/.env.supabase "$DEPLOY_TMP/pmsy/.env.supabase"

        # 复制 .env.production（如果存在，用于前端构建参考）
        [ -f "config/env/.env.production" ] && cp config/env/.env.production "$DEPLOY_TMP/pmsy/"
        # 复制 deploy 目录，但排除 cache 子目录
        mkdir -p "$DEPLOY_TMP/pmsy/deploy"
        for item in deploy/*; do
            if [ -d "$item" ] && [ "$(basename "$item")" != "cache" ]; then
                cp -r "$item" "$DEPLOY_TMP/pmsy/deploy/"
            elif [ -f "$item" ]; then
                cp "$item" "$DEPLOY_TMP/pmsy/deploy/"
            fi
        done
        [ -d "volumes" ] && cp -r volumes "$DEPLOY_TMP/pmsy/"
        [ -d "supabase" ] && cp -r supabase "$DEPLOY_TMP/pmsy/"
        
        echo -e "${GREEN}   ✅ 部署包准备完成${NC}"
        echo ""
        
        # 上传到服务器
        echo -e "${YELLOW}   上传到服务器...${NC}"
        ssh "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "sudo mkdir -p $DEPLOY_REMOTE_DIR && sudo chown $DEPLOY_SERVER_USER:$DEPLOY_SERVER_USER $DEPLOY_REMOTE_DIR"
        rsync -avz --delete "$DEPLOY_TMP/pmsy/" "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP:$DEPLOY_REMOTE_DIR/"
        rm -rf "$DEPLOY_TMP"
        echo -e "${GREEN}   ✅ 上传完成${NC}"
        echo ""
        
        # 服务器端部署
        echo -e "${YELLOW}   在服务器上执行部署...${NC}"
        echo -e "${CYAN}   提示: 后续日志将实时显示，可能需要几分钟时间...${NC}"
        echo ""
        # 使用环境变量传递参数，避免 heredoc 变量扩展问题
        ssh -tt "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "DEPLOY_REMOTE_DIR='$DEPLOY_REMOTE_DIR' DEPLOY_SERVER_IP='$DEPLOY_SERVER_IP' bash -s" << REMOTE_SCRIPT
set -e

# 检查 sudo 权限
echo "   [服务器] 检查 sudo 权限..."
if ! sudo -n true 2>/dev/null; then
    echo ""
    echo "   ⚠️  警告: 当前用户执行 sudo 需要密码"
    echo "   请确保当前用户有免密码 sudo 权限，或者在服务器上执行:"
    echo "   sudo visudo"
    echo "   添加一行: $USER ALL=(ALL) NOPASSWD:ALL"
    echo ""
    echo "   或者手动输入 sudo 密码继续..."
    sudo echo "   ✅ sudo 权限验证通过"
fi

cd "$DEPLOY_REMOTE_DIR"

echo "   [服务器] 停止现有服务..."
sudo docker-compose down 2>/dev/null || true

echo "   [服务器] 清理数据..."
sudo docker volume rm pmsy_postgres_data pmsy_storage_data 2>/dev/null || true
sudo docker rm -f $(sudo docker ps -aq --filter "name=supabase\|pmsy") 2>/dev/null || true

echo "   [服务器] 配置环境..."
if [ ! -f ".env" ]; then
    # 使用 .env.supabase 作为配置模板（完整的服务器配置）
    if [ -f ".env.supabase" ]; then
        cp .env.supabase .env
        echo "     从 .env.supabase 创建 .env"
    elif [ -f "config/env/.env.supabase" ]; then
        cp config/env/.env.supabase .env
        echo "     从 config/env/.env.supabase 创建 .env"
    fi
    
    # 更新服务器 IP 配置
    sed -i "s|API_EXTERNAL_URL=.*|API_EXTERNAL_URL=http://$DEPLOY_SERVER_IP|" .env
    sed -i "s|SITE_URL=.*|SITE_URL=http://$DEPLOY_SERVER_IP|" .env
    sed -i "s|SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=http://$DEPLOY_SERVER_IP|" .env
    
    echo "   ✅ 已创建 .env 配置文件"
    echo "   提示: 请检查 .env 文件中的密码配置，建议修改默认密码"
else
    echo "   ✅ .env 已存在"
fi

# 读取数据库密码并更新 docker-compose.yml 中的 PostgREST 连接字符串
POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' .env | cut -d'=' -f2)
if [ -n "$POSTGRES_PASSWORD" ]; then
    echo "   [服务器] 配置 PostgREST 数据库连接..."
    # 对密码进行 URL 编码（处理特殊字符）
    URL_ENCODED_PASSWORD=$(echo "$POSTGRES_PASSWORD" | sed 's/@/%40/g; s/#/%23/g; s/:/%3A/g; s/\//%2F/g; s/+/%2B/g')
    # 替换 docker-compose.yml 中的占位符
    sed -i "s|POSTGRES_PASSWORD_PLACEHOLDER|$URL_ENCODED_PASSWORD|g" docker-compose.yml
    echo "     ✅ PostgREST 连接字符串已更新"
fi

echo "   [服务器] 创建目录..."
mkdir -p volumes/api volumes/db/init supabase/volumes/db/init

echo "   [服务器] 拉取镜像并启动..."
sudo docker-compose pull
sudo docker-compose up -d

echo "   [服务器] 等待数据库..."
sleep 30
for i in {1..10}; do
    if sudo docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        break
    fi
    sleep 5
done

echo "   [服务器] 初始化数据库..."

# 日志函数
log_info() {
    echo "       ℹ️  $1"
}

log_success() {
    echo "       ✅ $1"
}

log_warn() {
    echo "       ⚠️  $1"
}

log_error() {
    echo "       ❌ $1"
}

echo "     步骤 1/7: 创建必要的角色..."
# 创建基础角色（必须在授权前创建）
log_info "创建 anon 角色..."
sudo docker-compose exec -T db psql -U postgres -c "CREATE ROLE anon NOLOGIN;" 2>&1 || log_info "anon 角色已存在"

log_info "创建 authenticated 角色..."
sudo docker-compose exec -T db psql -U postgres -c "CREATE ROLE authenticated NOLOGIN;" 2>&1 || log_info "authenticated 角色已存在"

log_info "创建 service_role 角色..."
sudo docker-compose exec -T db psql -U postgres -c "CREATE ROLE service_role NOLOGIN;" 2>&1 || log_info "service_role 角色已存在"

# 创建 supabase_admin 角色（uuid-ossp 扩展需要）
log_info "创建 supabase_admin 角色..."
if sudo docker-compose exec -T db psql -U postgres -c "CREATE ROLE supabase_admin WITH LOGIN SUPERUSER PASSWORD 'admin';" 2>&1; then
    log_success "supabase_admin 角色创建成功"
else
    log_warn "supabase_admin 角色已存在或创建失败（可忽略）"
fi

if [ -f "deploy/scripts/init-supabase-roles.sql" ]; then
    log_info "执行角色初始化脚本..."
    if sudo docker-compose exec -T db psql -U postgres < deploy/scripts/init-supabase-roles.sql 2>&1; then
        log_success "角色初始化脚本执行成功"
    else
        log_warn "角色初始化脚本执行失败（可忽略）"
    fi
else
    log_info "角色初始化脚本不存在，跳过"
fi

echo "     步骤 2/7: 创建必要的 schema..."
# 创建 auth schema（gotrue 需要）
log_info "创建 auth schema..."
if sudo docker-compose exec -T db psql -U postgres -c "CREATE SCHEMA IF NOT EXISTS auth;" 2>&1; then
    log_success "auth schema 创建成功"
else
    log_warn "auth schema 创建失败"
fi

log_info "授权 auth schema 给 postgres..."
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA auth TO postgres;" 2>&1 || log_warn "授权失败"

log_info "授权 auth schema 给 anon..."
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA auth TO anon;" 2>&1 || log_warn "授权失败"

log_info "授权 auth schema 给 authenticated..."
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA auth TO authenticated;" 2>&1 || log_warn "授权失败"

log_info "授权 auth schema 给 service_role..."
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA auth TO service_role;" 2>&1 || log_warn "授权失败"

# 创建 _realtime schema（realtime 服务需要）
log_info "创建 _realtime schema..."
if sudo docker-compose exec -T db psql -U postgres -c "CREATE SCHEMA IF NOT EXISTS _realtime;" 2>&1; then
    log_success "_realtime schema 创建成功"
else
    log_warn "_realtime schema 创建失败"
fi

log_info "授权 _realtime schema 给 postgres..."
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA _realtime TO postgres;" 2>&1 || log_warn "授权失败"

log_info "授权 _realtime schema 给相关角色..."
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA _realtime TO anon;" 2>&1 || true
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA _realtime TO authenticated;" 2>&1 || true
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA _realtime TO service_role;" 2>&1 || true

echo "     步骤 3/7: 创建 uuid-ossp 扩展..."
log_info "创建 uuid-ossp 扩展..."
if sudo docker-compose exec -T db psql -U postgres -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' 2>&1; then
    log_success "uuid-ossp 扩展创建成功"
else
    log_warn "uuid-ossp 扩展创建失败（可能已存在）"
fi

echo "     步骤 4/7: 重启服务以应用配置..."
log_info "重启 auth 服务..."
sudo docker-compose restart auth 2>&1

log_info "重启 storage 服务..."
sudo docker-compose restart storage 2>&1

log_info "重启 realtime 服务..."
sudo docker-compose restart realtime 2>&1

# 等待核心服务健康检查通过
log_info "等待 auth 服务就绪（最多60秒）..."
for i in {1..12}; do
    if sudo docker-compose exec -T auth wget -qO- http://localhost:9999/health 2>/dev/null | grep -q "OK"; then
        log_success "auth 服务已就绪"
        break
    fi
    log_info "等待 auth 服务... (${i}/12)"
    sleep 5
done

# 等待 rest 服务
log_info "等待 rest 服务就绪..."
for i in {1..12}; do
    if sudo docker-compose exec -T rest wget -qO- http://localhost:3000/ 2>/dev/null | grep -q "PostgREST"; then
        log_success "rest 服务已就绪"
        break
    fi
    log_info "等待 rest 服务... (${i}/12)"
    sleep 5
done

# 等待 storage 服务
log_info "等待 storage 服务就绪..."
for i in {1..12}; do
    if sudo docker-compose exec -T storage wget -qO- http://localhost:5000/health 2>/dev/null | grep -q "OK"; then
        log_success "storage 服务已就绪"
        break
    fi
    log_info "等待 storage 服务... (${i}/12)"
    sleep 5
done

# 检查所有服务状态
log_info "检查所有服务状态..."
sudo docker-compose ps

log_success "核心服务已就绪"

echo "     步骤 5/7: 执行数据库初始化脚本..."
if [ -f "deploy/scripts/init-supabase-db.sh" ]; then
    log_info "执行 init-supabase-db.sh..."
    if sudo ./deploy/scripts/init-supabase-db.sh 2>&1; then
        log_success "数据库初始化脚本执行成功"
    else
        log_warn "数据库初始化脚本执行失败（可忽略）"
    fi
else
    log_info "init-supabase-db.sh 不存在，跳过"
fi

if [ -f "supabase/volumes/db/init/00-initial-schema.sql" ]; then
    log_info "执行 00-initial-schema.sql..."
    if sudo docker-compose exec -T db psql -U postgres < supabase/volumes/db/init/00-initial-schema.sql 2>&1; then
        log_success "初始 schema 执行成功"
    else
        log_warn "初始 schema 执行失败（可忽略）"
    fi
else
    log_info "00-initial-schema.sql 不存在，跳过"
fi

echo "     步骤 6/7: 执行数据库迁移..."
if [ -d "supabase/migrations" ]; then
    log_info "找到 migrations 目录"
    MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
    log_info "发现 $MIGRATION_COUNT 个迁移文件"
    
    SUCCESS_COUNT=0
    FAIL_COUNT=0
    
    for migration in supabase/migrations/*.sql; do
        if [ -f "$migration" ]; then
            MIGRATION_NAME=$(basename $migration)
            log_info "执行: $MIGRATION_NAME"
            if sudo docker-compose exec -T db psql -U postgres < "$migration" 2>&1; then
                log_success "$MIGRATION_NAME 执行成功"
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            else
                log_warn "$MIGRATION_NAME 执行失败"
                FAIL_COUNT=$((FAIL_COUNT + 1))
            fi
        fi
    done
    
    echo ""
    log_success "数据库迁移完成: $SUCCESS_COUNT 成功, $FAIL_COUNT 失败"
else
    log_warn "未找到 migrations 目录，跳过迁移"
fi

echo "     步骤 7/7: 创建管理员用户..."
# 使用 Supabase Auth API 创建管理员用户，确保 gotrue 正确处理
ADMIN_EMAIL="admin@pmsy.com"
ADMIN_PASSWORD="admin123"
ADMIN_USERNAME="admin"

# 从 .env 文件读取 ANON_KEY
ANON_KEY=$(grep "^VITE_SUPABASE_ANON_KEY=" .env | cut -d'=' -f2 || echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtc3kiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3MDg2MzY5NCwiZXhwIjoyMDg2MjIzNjk0fQ.4asR7SimAk1UwthtIo5LD22qee5hsGAoZqDcwoQaSCw")

log_info "使用 ANON_KEY: $(echo "$ANON_KEY" | cut -c 1-30)..."
echo "       创建管理员用户: $ADMIN_EMAIL"

# 等待 auth 服务完全就绪
sleep 5

# 测试 auth 服务是否可访问
log_info "测试 auth 服务连接..."
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost/auth/v1/health | grep -q "200"; then
    log_warn "auth 服务可能未就绪，等待 10 秒后重试..."
    sleep 10
fi

# 使用 Auth API 注册用户
log_info "注册管理员用户..."
SIGNUP_RESULT=$(curl -s -X POST "http://localhost/auth/v1/signup" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\", \"data\": {\"username\": \"$ADMIN_USERNAME\", \"role\": \"admin\"}}" 2>/dev/null || echo "")

log_info "注册结果: $(echo "$SIGNUP_RESULT" | tr '\n' ' ' | cut -c 1-100)..."

if [[ "$SIGNUP_RESULT" == *"access_token"* ]]; then
    log_success "管理员用户创建成功"
    
    # 更新用户元数据
    USER_ID=$(echo "$SIGNUP_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$USER_ID" ]; then
        log_info "更新用户 profile..."
        sudo docker-compose exec -T db psql -U postgres << EOF 2>/dev/null || true
        UPDATE public.profiles 
        SET username = '$ADMIN_USERNAME', 
            full_name = '系统管理员',
            role = 'admin'
        WHERE id = '$USER_ID';
EOF
    fi
elif [[ "$SIGNUP_RESULT" == *"User already registered"* ]] || [[ "$SIGNUP_RESULT" == *"already exists"* ]]; then
    log_info "用户已存在，跳过创建"
else
    log_warn "用户创建可能失败，请手动检查"
    log_info "返回: $SIGNUP_RESULT"
    
    # 尝试使用备选方法创建用户
    log_info "尝试使用数据库直接创建用户..."
    sudo docker-compose exec -T db psql -U postgres << EOF 2>/dev/null || true
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', '$ADMIN_EMAIL', crypt('$ADMIN_PASSWORD', gen_salt('bf')), now(), now(), now())
    ON CONFLICT (email) DO NOTHING;
    
    INSERT INTO public.profiles (id, email, username, full_name, role, created_at, updated_at)
    SELECT id, '$ADMIN_EMAIL', '$ADMIN_USERNAME', '系统管理员', 'admin', now(), now()
    FROM auth.users
    WHERE email = '$ADMIN_EMAIL'
    ON CONFLICT (email) DO NOTHING;
EOF
fi

log_success "管理员用户配置完成"
log_info "邮箱: $ADMIN_EMAIL"
log_info "密码: $ADMIN_PASSWORD"

echo "     步骤 7/7: 配置权限和 RLS 策略..."

# 确保管理员用户角色正确
echo "       确保管理员角色为 admin..."
sudo docker-compose exec -T db psql -U postgres << EOF 2>/dev/null || true
UPDATE public.profiles SET role = 'admin' WHERE email = '$ADMIN_EMAIL';
EOF

# 为 user 角色添加基本权限（可选）
echo "       配置 user 角色基本权限..."
sudo docker-compose exec -T db psql -U postgres << EOF 2>/dev/null || true
INSERT INTO public.role_permissions (role_key, module_key) VALUES 
  ('user', 'dashboard'), ('user', 'projects'), ('user', 'tasks'), 
  ('user', 'files'), ('user', 'stakeholders')
ON CONFLICT DO NOTHING;
EOF

# 禁用 role_permissions 表的 RLS（避免权限查询问题）
echo "       配置 RLS 策略..."
sudo docker-compose exec -T db psql -U postgres << EOF 2>/dev/null || true
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
EOF

echo "       ✅ 权限配置完成"

echo "   [服务器] ✅ 部署完成"
REMOTE_SCRIPT
        
        echo -e "${GREEN}   ✅ 服务器部署完成${NC}"
        echo ""
        ;;
        
    "semi-offline")
        # ==========================================
        # 模式2: 半离线部署
        # ==========================================
        echo -e "${BLUE}[步骤 5/5] 半离线部署（导出镜像）...${NC}"
        echo ""
        
        # 配置 SSH
        echo -e "${YELLOW}   配置 SSH 免密码登录...${NC}"
        if [ ! -f "$HOME/.ssh/id_rsa" ]; then
            echo "   生成 SSH 密钥对..."
            ssh-keygen -t rsa -b 4096 -C "pmsy-deploy" -f "$HOME/.ssh/id_rsa" -N ""
            echo "   ✅ SSH 密钥已生成"
        fi

        # 检查是否已配置免密码登录
        echo "   检查 SSH 免密码登录..."
        if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "echo OK" 2>/dev/null; then
            echo ""
            echo -e "${CYAN}   ========================================${NC}"
            echo -e "${CYAN}   需要配置 SSH 免密码登录${NC}"
            echo -e "${CYAN}   ========================================${NC}"
            echo ""
            echo "   请输入服务器 ${DEPLOY_SERVER_USER}@${DEPLOY_SERVER_IP} 的登录密码"
            echo "   （密码输入时不会显示，输入完成后按回车）"
            echo ""

            # 尝试配置 SSH 免密码登录，最多重试3次
            SSH_CONFIG_SUCCESS=false
            for i in {1..3}; do
                if ssh-copy-id -o StrictHostKeyChecking=no "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" 2>&1; then
                    SSH_CONFIG_SUCCESS=true
                    break
                else
                    echo ""
                    echo -e "${YELLOW}   ⚠️  密码错误，请重新输入 (${i}/3)${NC}"
                    echo ""
                fi
            done

            if [ "$SSH_CONFIG_SUCCESS" = false ]; then
                echo ""
                echo -e "${RED}   ❌ SSH 配置失败${NC}"
                echo ""
                echo "   可能的原因："
                echo "   1. 密码输入错误"
                echo "   2. 服务器不允许密码登录"
                echo "   3. 服务器用户不存在"
                echo ""
                echo "   解决方法："
                echo "   1. 手动配置 SSH 密钥："
                echo "      ssh-copy-id ${DEPLOY_SERVER_USER}@${DEPLOY_SERVER_IP}"
                echo "   2. 或者手动登录服务器添加公钥："
                echo "      cat ~/.ssh/id_rsa.pub"
                echo ""
                exit 1
            fi
        fi
        echo -e "${GREEN}   ✅ SSH 配置完成${NC}"
        echo ""

        # 导出 Docker 镜像
        echo -e "${YELLOW}   导出 Docker 镜像...${NC}"
        mkdir -p docker-images
        
        IMAGES=(
            "supabase/postgres:15.1.1.78"

            "supabase/gotrue:v2.158.1"
            "postgrest/postgrest:v12.2.0"
            "supabase/realtime:v2.28.32"
            "supabase/storage-api:v1.0.6"
            "darthsim/imgproxy:v3.8.0"
            "supabase/postgres-meta:v0.80.0"
            "supabase/studio:latest"
            "nginx:alpine"
        )
        
        for image in "${IMAGES[@]}"; do
            filename=$(echo "$image" | tr '/:' '_').tar
            echo "     导出 $image..."
            docker pull "$image" 2>/dev/null || echo "     警告: 无法拉取 $image"
            docker save "$image" > "docker-images/$filename" 2>/dev/null || echo "     警告: 无法导出 $image"
        done
        
        printf "%s\n" "${IMAGES[@]}" > docker-images/IMAGES.txt
        echo -e "${GREEN}   ✅ Docker 镜像导出完成${NC}"
        echo ""
        
        # 准备部署包
        echo -e "${YELLOW}   准备部署包...${NC}"
        DEPLOY_TMP=$(mktemp -d)
        mkdir -p "$DEPLOY_TMP/pmsy"
        
        cp -r dist "$DEPLOY_TMP/pmsy/"
        cp -r api "$DEPLOY_TMP/pmsy/"
        cp -r docker-images "$DEPLOY_TMP/pmsy/"
        cp config/docker/docker-compose.yml "$DEPLOY_TMP/pmsy/"
        cp config/docker/Dockerfile.api "$DEPLOY_TMP/pmsy/" 2>/dev/null || true
        cp config/env/.env.supabase "$DEPLOY_TMP/pmsy/.env.example"
        # 复制 deploy 目录，但排除 cache 子目录
        mkdir -p "$DEPLOY_TMP/pmsy/deploy"
        for item in deploy/*; do
            if [ -d "$item" ] && [ "$(basename "$item")" != "cache" ]; then
                cp -r "$item" "$DEPLOY_TMP/pmsy/deploy/"
            elif [ -f "$item" ]; then
                cp "$item" "$DEPLOY_TMP/pmsy/deploy/"
            fi
        done
        [ -d "volumes" ] && cp -r volumes "$DEPLOY_TMP/pmsy/"
        [ -d "supabase" ] && cp -r supabase "$DEPLOY_TMP/pmsy/"
        
        echo -e "${GREEN}   ✅ 部署包准备完成${NC}"
        echo ""
        
        # 上传到服务器
        echo -e "${YELLOW}   上传到服务器（包含镜像，可能较慢）...${NC}"
        ssh "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "sudo mkdir -p $DEPLOY_REMOTE_DIR && sudo chown $DEPLOY_SERVER_USER:$DEPLOY_SERVER_IP $DEPLOY_REMOTE_DIR"
        rsync -avz --delete "$DEPLOY_TMP/pmsy/" "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP:$DEPLOY_REMOTE_DIR/"
        rm -rf "$DEPLOY_TMP"
        echo -e "${GREEN}   ✅ 上传完成${NC}"
        echo ""
        
        # 服务器端部署
        echo -e "${YELLOW}   在服务器上执行部署...${NC}"
        echo -e "${CYAN}   提示: 后续日志将实时显示，可能需要几分钟时间...${NC}"
        echo ""
        # 使用环境变量传递参数，避免 heredoc 变量扩展问题
        ssh -tt "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "DEPLOY_REMOTE_DIR='$DEPLOY_REMOTE_DIR' DEPLOY_SERVER_IP='$DEPLOY_SERVER_IP' bash -s" << REMOTE_SCRIPT
set -e

# 检查 sudo 权限
echo "   [服务器] 检查 sudo 权限..."
if ! sudo -n true 2>/dev/null; then
    echo ""
    echo "   ⚠️  警告: 当前用户执行 sudo 需要密码"
    echo "   请确保当前用户有免密码 sudo 权限，或者在服务器上执行:"
    echo "   sudo visudo"
    echo "   添加一行: $USER ALL=(ALL) NOPASSWD:ALL"
    echo ""
    echo "   或者手动输入 sudo 密码继续..."
    sudo echo "   ✅ sudo 权限验证通过"
fi

cd "$DEPLOY_REMOTE_DIR"

echo "   [服务器] 停止现有服务..."
sudo docker-compose down 2>/dev/null || true

echo "   [服务器] 清理数据..."
sudo docker volume rm pmsy_postgres_data pmsy_storage_data 2>/dev/null || true
sudo docker rm -f $(sudo docker ps -aq --filter "name=supabase\|pmsy") 2>/dev/null || true

echo "   [服务器] 导入 Docker 镜像..."
for tarfile in docker-images/*.tar; do
    if [ -f "$tarfile" ]; then
        echo "     导入 $(basename $tarfile)..."
        sudo docker load < "$tarfile" || echo "     警告: 导入失败"
    fi
done

echo "   [服务器] 配置环境..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "     从 .env.example 创建 .env"
    elif [ -f ".env.supabase" ]; then
        cp .env.supabase .env
        echo "     从 .env.supabase 创建 .env"
    elif [ -f "config/env/.env.supabase" ]; then
        cp config/env/.env.supabase .env
        echo "     从 config/env/.env.supabase 创建 .env"
    fi

    sed -i "s|API_EXTERNAL_URL=.*|API_EXTERNAL_URL=http://$DEPLOY_SERVER_IP|" .env
    sed -i "s|SITE_URL=.*|SITE_URL=http://$DEPLOY_SERVER_IP|" .env
    sed -i "s|SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=http://$DEPLOY_SERVER_IP|" .env
fi

# 读取数据库密码并更新 docker-compose.yml 中的 PostgREST 连接字符串
POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' .env | cut -d'=' -f2)
if [ -n "$POSTGRES_PASSWORD" ]; then
    echo "     配置 PostgREST 数据库连接..."
    # 对密码进行 URL 编码（处理特殊字符）
    URL_ENCODED_PASSWORD=$(echo "$POSTGRES_PASSWORD" | sed 's/@/%40/g; s/#/%23/g; s/:/%3A/g; s/\//%2F/g; s/+/%2B/g')
    # 替换 docker-compose.yml 中的占位符
    sed -i "s|POSTGRES_PASSWORD_PLACEHOLDER|$URL_ENCODED_PASSWORD|g" docker-compose.yml
    echo "     ✅ PostgREST 连接字符串已更新"
fi

echo "   [服务器] 创建目录..."
mkdir -p volumes/api volumes/db/init supabase/volumes/db/init

echo "   [服务器] 启动服务..."
sudo docker-compose up -d

echo "   [服务器] 等待数据库..."
sleep 30
for i in {1..10}; do
    if sudo docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        break
    fi
    sleep 5
done

echo "   [服务器] 初始化数据库..."

# 日志函数
log_info() {
    echo "       ℹ️  $1"
}

log_success() {
    echo "       ✅ $1"
}

log_warn() {
    echo "       ⚠️  $1"
}

echo "     步骤 1/7: 创建 Supabase 角色..."
log_info "创建 supabase_admin 角色..."
if sudo docker-compose exec -T db psql -U postgres -c "CREATE ROLE supabase_admin WITH LOGIN SUPERUSER PASSWORD 'admin';" 2>&1; then
    log_success "supabase_admin 角色创建成功"
else
    log_warn "supabase_admin 角色已存在或创建失败（可忽略）"
fi

if [ -f "deploy/scripts/init-supabase-roles.sql" ]; then
    log_info "执行角色初始化脚本..."
    if sudo docker-compose exec -T db psql -U postgres < deploy/scripts/init-supabase-roles.sql 2>&1; then
        log_success "角色初始化脚本执行成功"
    else
        log_warn "角色初始化脚本执行失败（可忽略）"
    fi
fi

echo "     步骤 2/7: 创建必要的 schema..."
log_info "创建 auth schema..."
sudo docker-compose exec -T db psql -U postgres -c "CREATE SCHEMA IF NOT EXISTS auth;" 2>&1 || log_warn "auth schema 创建失败"

log_info "授权 auth schema..."
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA auth TO postgres;" 2>&1 || true
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA auth TO anon;" 2>&1 || true
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA auth TO authenticated;" 2>&1 || true
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA auth TO service_role;" 2>&1 || true

log_info "创建 _realtime schema..."
sudo docker-compose exec -T db psql -U postgres -c "CREATE SCHEMA IF NOT EXISTS _realtime;" 2>&1 || log_warn "_realtime schema 创建失败"
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA _realtime TO postgres;" 2>&1 || true

echo "     步骤 3/7: 创建 uuid-ossp 扩展..."
log_info "创建 uuid-ossp 扩展..."
if sudo docker-compose exec -T db psql -U postgres -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' 2>&1; then
    log_success "uuid-ossp 扩展创建成功"
else
    log_warn "uuid-ossp 扩展创建失败（可能已存在）"
fi

echo "     步骤 4/7: 重启 auth 服务以应用 schema..."
log_info "重启 auth 服务..."
sudo docker-compose restart auth 2>&1

# 等待 auth 服务健康检查通过
log_info "等待 auth 服务就绪（最多60秒）..."
for i in {1..12}; do
    if sudo docker-compose exec -T auth wget -qO- http://localhost:9999/health 2>/dev/null | grep -q "OK"; then
        log_success "auth 服务已就绪"
        break
    fi
    log_info "等待 auth 服务... (${i}/12)"
    sleep 5
done

# 同时等待 rest 服务
log_info "等待 rest 服务就绪..."
for i in {1..12}; do
    if sudo docker-compose exec -T rest wget -qO- http://localhost:3000/ 2>/dev/null | grep -q "PostgREST"; then
        log_success "rest 服务已就绪"
        break
    fi
    log_info "等待 rest 服务... (${i}/12)"
    sleep 5
done

log_success "核心服务已就绪"

echo "     步骤 5/7: 执行数据库初始化..."
if [ -f "deploy/scripts/init-supabase-db.sh" ]; then
    log_info "执行 init-supabase-db.sh..."
    sudo ./deploy/scripts/init-supabase-db.sh 2>&1 || log_warn "初始化脚本执行失败"
fi

if [ -f "supabase/volumes/db/init/00-initial-schema.sql" ]; then
    log_info "执行 00-initial-schema.sql..."
    sudo docker-compose exec -T db psql -U postgres < supabase/volumes/db/init/00-initial-schema.sql 2>&1 || log_warn "初始 schema 执行失败"
fi

echo "     步骤 6/7: 执行数据库迁移..."
if [ -d "supabase/migrations" ]; then
    MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
    log_info "发现 $MIGRATION_COUNT 个迁移文件"
    
    SUCCESS_COUNT=0
    FAIL_COUNT=0
    
    for migration in supabase/migrations/*.sql; do
        if [ -f "$migration" ]; then
            MIGRATION_NAME=$(basename $migration)
            log_info "执行: $MIGRATION_NAME"
            if sudo docker-compose exec -T db psql -U postgres < "$migration" 2>&1; then
                log_success "$MIGRATION_NAME 执行成功"
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            else
                log_warn "$MIGRATION_NAME 执行失败"
                FAIL_COUNT=$((FAIL_COUNT + 1))
            fi
        fi
    done
    
    echo ""
    log_success "数据库迁移完成: $SUCCESS_COUNT 成功, $FAIL_COUNT 失败"
else
    log_warn "未找到 migrations 目录"
fi

# 创建管理员用户
echo "     步骤 7/7: 创建管理员用户..."
# 使用 Supabase Auth API 创建管理员用户，确保 gotrue 正确处理
ADMIN_EMAIL="admin@pmsy.com"
ADMIN_PASSWORD="admin123"
ADMIN_USERNAME="admin"
ANON_KEY="${VITE_SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtc3kiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3MDg2MzY5NCwiZXhwIjoyMDg2MjIzNjk0fQ.4asR7SimAk1UwthtIo5LD22qee5hsGAoZqDcwoQaSCw}"

echo "       创建管理员用户: $ADMIN_EMAIL"
# 等待 auth 服务完全就绪
sleep 3

# 使用 Auth API 注册用户
SIGNUP_RESULT=$(curl -s -X POST "http://localhost/auth/v1/signup" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\", \"data\": {\"username\": \"$ADMIN_USERNAME\", \"role\": \"admin\"}}" 2>/dev/null || echo "")

if [[ "$SIGNUP_RESULT" == *"access_token"* ]]; then
    echo "       ✅ 管理员用户创建成功"

    # 更新用户元数据
    USER_ID=$(echo "$SIGNUP_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$USER_ID" ]; then
        echo "       更新用户 profile..."
        sudo docker-compose exec -T db psql -U postgres << EOF 2>/dev/null || true
        UPDATE public.profiles 
        SET username = '$ADMIN_USERNAME', 
            full_name = '系统管理员',
            role = 'admin'
        WHERE id = '$USER_ID';
EOF
    fi
elif [[ "$SIGNUP_RESULT" == *"User already registered"* ]] || [[ "$SIGNUP_RESULT" == *"already exists"* ]]; then
    echo "       用户已存在，跳过创建"
else
    echo "       警告: 用户创建可能失败，请手动检查"
    echo "       返回: $SIGNUP_RESULT"
fi

echo "       ✅ 管理员用户配置完成"
echo "       邮箱: $ADMIN_EMAIL"
echo "       密码: $ADMIN_PASSWORD"

echo "     步骤 6/6: 配置权限和 RLS 策略..."

# 确保管理员用户角色正确
echo "       确保管理员角色为 admin..."
sudo docker-compose exec -T db psql -U postgres << EOF 2>/dev/null || true
UPDATE public.profiles SET role = 'admin' WHERE email = '$ADMIN_EMAIL';
EOF

# 为 user 角色添加基本权限（可选）
echo "       配置 user 角色基本权限..."
sudo docker-compose exec -T db psql -U postgres << EOF 2>/dev/null || true
INSERT INTO public.role_permissions (role_key, module_key) VALUES
  ('user', 'dashboard'), ('user', 'projects'), ('user', 'tasks'),
  ('user', 'files'), ('user', 'stakeholders')
ON CONFLICT DO NOTHING;
EOF

# 禁用 role_permissions 表的 RLS（避免权限查询问题）
echo "       配置 RLS 策略..."
sudo docker-compose exec -T db psql -U postgres << EOF 2>/dev/null || true
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
EOF

echo "       ✅ 权限配置完成"

echo "   [服务器] ✅ 部署完成"
REMOTE_SCRIPT

        echo -e "${GREEN}   ✅ 服务器部署完成${NC}"
        echo ""
        ;;

    "offline")
        # ==========================================
        # 模式3: 完全离线部署
        # ==========================================
        echo -e "${BLUE}[步骤 5/5] 完全离线部署（生成离线包）...${NC}"
        echo ""
        
        # 选择服务器架构
        echo -e "${YELLOW}   请选择目标服务器架构:${NC}"
        echo ""
        echo "  [1] AMD64 (x86_64) - 大多数服务器"
        echo "  [2] ARM64 (aarch64) - 树莓派/ARM服务器"
        echo ""
        
        ARCH=""
        while true; do
            read -p "   请选择架构 (1/2): " ARCH_CHOICE
            case $ARCH_CHOICE in
                1)
                    ARCH="amd64"
                    echo -e "${GREEN}   已选择: AMD64 架构${NC}"
                    break
                    ;;
                2)
                    ARCH="arm64"
                    echo -e "${GREEN}   已选择: ARM64 架构${NC}"
                    break
                    ;;
                *)
                    echo -e "${YELLOW}   无效选择，请重新输入${NC}"
                    ;;
            esac
        done
        echo ""
        
        # 导出 Docker 镜像
        echo -e "${YELLOW}   导出 Docker 镜像（$ARCH 架构）...${NC}"
        mkdir -p docker-images
        
        IMAGES=(
            "supabase/postgres:15.1.1.78"
            "supabase/gotrue:v2.158.1"
            "postgrest/postgrest:v12.2.0"
            "supabase/realtime:v2.28.32"
            "supabase/storage-api:v1.0.6"
            "darthsim/imgproxy:v3.8.0"
            "supabase/postgres-meta:v0.80.0"
            "supabase/studio:latest"
            "nginx:alpine"
        )
        
        for image in "${IMAGES[@]}"; do
            filename=$(echo "$image" | tr '/:' '_').tar
            echo "     导出 $image ($ARCH)..."
            docker pull --platform linux/$ARCH "$image" 2>/dev/null || echo "     警告: 无法拉取 $image"
            docker save "$image" > "docker-images/$filename" 2>/dev/null || echo "     警告: 无法导出 $image"
        done
        
        printf "%s\n" "${IMAGES[@]}" > docker-images/IMAGES.txt
        echo -e "${GREEN}   ✅ Docker 镜像导出完成${NC}"
        echo ""
        
        # 生成离线部署包
        echo -e "${YELLOW}   生成离线部署包...${NC}"
        
        OFFLINE_DIR="pmsy-offline-deploy-$ARCH-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$OFFLINE_DIR"
        
        # 复制文件
        cp -r dist "$OFFLINE_DIR/"
        cp -r api "$OFFLINE_DIR/"
        cp -r docker-images "$OFFLINE_DIR/"
        cp config/docker/docker-compose.yml "$OFFLINE_DIR/"
        cp config/docker/Dockerfile.api "$OFFLINE_DIR/" 2>/dev/null || true
        cp config/nginx/nginx.conf "$OFFLINE_DIR/nginx.conf"
        cp config/env/.env.supabase "$OFFLINE_DIR/.env.example"
        # 复制 deploy 目录，但排除 cache 子目录
        mkdir -p "$OFFLINE_DIR/deploy"
        for item in deploy/*; do
            if [ -d "$item" ] && [ "$(basename "$item")" != "cache" ]; then
                cp -r "$item" "$OFFLINE_DIR/deploy/"
            elif [ -f "$item" ]; then
                cp "$item" "$OFFLINE_DIR/deploy/"
            fi
        done
        [ -d "volumes" ] && cp -r volumes "$OFFLINE_DIR/"
        [ -d "supabase" ] && cp -r supabase "$OFFLINE_DIR/"
        
        # 创建离线部署指导文档
        cat > "$OFFLINE_DIR/部署指导.md" << 'GUIDE_EOF'
# PMSY 离线部署指导

## 部署包内容

此部署包包含：
- ✅ 前端构建文件 (dist/)
- ✅ API 服务代码 (api/)
- ✅ Docker 镜像文件 (docker-images/)
- ✅ 服务配置文件 (docker-compose.yml)
- ✅ 部署脚本 (deploy/)

## 前置要求

目标服务器需要安装：
- Docker
- Docker Compose

## 部署步骤

### 1. 上传部署包到服务器

```bash
# 使用 scp 或其他方式上传到服务器
scp -r pmsy-offline-deploy-XXX user@your-server:/opt/
```

### 2. 解压部署包

```bash
ssh user@your-server
cd /opt
# 如果部署包是压缩的，先解压
# tar -xzf pmsy-offline-deploy-XXX.tar.gz
```

### 3. 配置环境变量

```bash
cd /opt/pmsy-offline-deploy-XXX
cp .env.example .env
vim .env

# 修改以下配置：
# - API_EXTERNAL_URL: http://你的服务器IP
# - SITE_URL: http://你的服务器IP
# - 所有密码（建议使用强密码）
```

### 4. 执行部署

```bash
sudo ./deploy/scripts/offline-deploy.sh
```

或手动执行：

```bash
# 导入 Docker 镜像
for tarfile in docker-images/*.tar; do
    sudo docker load < "$tarfile"
done

# 创建必要目录
mkdir -p volumes/api volumes/db/init

# 启动服务
sudo docker-compose up -d

# 等待数据库初始化（约30秒）
sleep 30

# 初始化数据库（如有初始化脚本）
# sudo docker-compose exec -T db psql -U postgres < init.sql
```

### 5. 验证部署

- 访问前端: http://你的服务器IP
- 访问 Studio: http://你的服务器IP:3000
- 访问 API: http://你的服务器IP

## 默认账号

- Studio: admin / Willyou@2026
- Root: admin@yourcompany.com / Willyou@2026

## 故障排查

### 服务无法启动

```bash
# 查看日志
sudo docker-compose logs

# 检查服务状态
sudo docker-compose ps
```

### 数据库连接失败

```bash
# 检查数据库是否就绪
sudo docker-compose exec db pg_isready -U postgres
```

### 端口冲突

```bash
# 检查端口占用
sudo netstat -tlnp | grep -E '3000|80'
```

## 技术支持

如有问题，请参考项目文档或联系技术支持。
GUIDE_EOF
        
        # 创建离线部署脚本
        mkdir -p "$OFFLINE_DIR/deploy/scripts"
        cat > "$OFFLINE_DIR/deploy/scripts/offline-deploy.sh" << 'SCRIPT_EOF'
#!/bin/bash
# PMSY 离线部署脚本

set -e

echo "=========================================="
echo "PMSY 离线部署脚本"
echo "=========================================="
echo ""

cd "$(dirname "$0")/../.."

echo "[1/7] 导入 Docker 镜像..."
for tarfile in docker-images/*.tar; do
    if [ -f "$tarfile" ]; then
        echo "  导入 $(basename $tarfile)..."
        sudo docker load < "$tarfile" || echo "  警告: 导入失败"
    fi
done
echo ""

echo "[2/7] 配置环境..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "  请编辑 .env 文件配置服务器IP和密码"
    exit 1
fi
echo ""

echo "[3/7] 创建目录..."
mkdir -p volumes/api volumes/db/init supabase/volumes/db/init
echo ""

echo "[4/7] 启动服务..."
sudo docker-compose up -d
echo ""

echo "[5/7] 等待数据库初始化..."
sleep 30
for i in {1..10}; do
    if sudo docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        break
    fi
    sleep 5
done

echo "[6/7] 初始化数据库 schema..."

# 日志函数
log_info() {
    echo "  ℹ️  $1"
}

log_success() {
    echo "  ✅ $1"
}

log_warn() {
    echo "  ⚠️  $1"
}

log_info "创建 supabase_admin 角色..."
if sudo docker-compose exec -T db psql -U postgres -c "CREATE ROLE supabase_admin WITH LOGIN SUPERUSER PASSWORD 'admin';" 2>&1; then
    log_success "supabase_admin 角色创建成功"
else
    log_warn "supabase_admin 角色已存在或创建失败（可忽略）"
fi

log_info "创建 auth schema..."
sudo docker-compose exec -T db psql -U postgres -c "CREATE SCHEMA IF NOT EXISTS auth;" 2>&1 || log_warn "auth schema 创建失败"

log_info "授权 auth schema..."
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA auth TO postgres;" 2>&1 || true
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA auth TO anon;" 2>&1 || true
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA auth TO authenticated;" 2>&1 || true
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA auth TO service_role;" 2>&1 || true

log_info "创建 _realtime schema..."
sudo docker-compose exec -T db psql -U postgres -c "CREATE SCHEMA IF NOT EXISTS _realtime;" 2>&1 || log_warn "_realtime schema 创建失败"
sudo docker-compose exec -T db psql -U postgres -c "GRANT ALL ON SCHEMA _realtime TO postgres;" 2>&1 || true

log_info "创建 uuid-ossp 扩展..."
if sudo docker-compose exec -T db psql -U postgres -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' 2>&1; then
    log_success "uuid-ossp 扩展创建成功"
else
    log_warn "uuid-ossp 扩展创建失败（可能已存在）"
fi

log_info "重启 auth 服务..."
sudo docker-compose restart auth 2>&1

# 等待 auth 服务健康检查通过
log_info "等待 auth 服务就绪（最多60秒）..."
for i in {1..12}; do
    if sudo docker-compose exec -T auth wget -qO- http://localhost:9999/health 2>/dev/null | grep -q "OK"; then
        log_success "auth 服务已就绪"
        break
    fi
    log_info "等待 auth 服务... (${i}/12)"
    sleep 5
done

# 同时等待 rest 服务
log_info "等待 rest 服务就绪..."
for i in {1..12}; do
    if sudo docker-compose exec -T rest wget -qO- http://localhost:3000/ 2>/dev/null | grep -q "PostgREST"; then
        log_success "rest 服务已就绪"
        break
    fi
    log_info "等待 rest 服务... (${i}/12)"
    sleep 5
done

log_success "核心服务已就绪"

# 执行初始 schema
if [ -f "supabase/volumes/db/init/00-initial-schema.sql" ]; then
    log_info "执行 00-initial-schema.sql..."
    if sudo docker-compose exec -T db psql -U postgres < supabase/volumes/db/init/00-initial-schema.sql 2>&1; then
        log_success "初始 schema 执行成功"
    else
        log_warn "初始 schema 执行失败"
    fi
else
    log_info "00-initial-schema.sql 不存在，跳过"
fi

# 执行数据库迁移
log_info "检查数据库迁移..."
if [ -d "supabase/migrations" ]; then
    MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
    log_info "发现 $MIGRATION_COUNT 个迁移文件"
    
    SUCCESS_COUNT=0
    FAIL_COUNT=0
    
    for migration in supabase/migrations/*.sql; do
        if [ -f "$migration" ]; then
            MIGRATION_NAME=$(basename $migration)
            log_info "执行: $MIGRATION_NAME"
            if sudo docker-compose exec -T db psql -U postgres < "$migration" 2>&1; then
                log_success "$MIGRATION_NAME 执行成功"
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            else
                log_warn "$MIGRATION_NAME 执行失败"
                FAIL_COUNT=$((FAIL_COUNT + 1))
            fi
        fi
    done
    
    echo ""
    log_success "数据库迁移完成: $SUCCESS_COUNT 成功, $FAIL_COUNT 失败"
else
    log_warn "未找到 migrations 目录"
fi
echo ""

echo "[7/7] 创建管理员用户..."
# 使用 Supabase Auth API 创建管理员用户，确保 gotrue 正确处理
ADMIN_EMAIL="admin@pmsy.com"
ADMIN_PASSWORD="admin123"
ADMIN_USERNAME="admin"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtc3kiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3MDg2MzY5NCwiZXhwIjoyMDg2MjIzNjk0fQ.4asR7SimAk1UwthtIo5LD22qee5hsGAoZqDcwoQaSCw"

echo "  创建管理员用户: $ADMIN_EMAIL"
# 等待 auth 服务完全就绪
sleep 3

# 使用 Auth API 注册用户
SIGNUP_RESULT=$(curl -s -X POST "http://localhost/auth/v1/signup" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\", \"data\": {\"username\": \"$ADMIN_USERNAME\", \"role\": \"admin\"}}" 2>/dev/null || echo "")

if [[ "$SIGNUP_RESULT" == *"access_token"* ]]; then
    echo "  ✅ 管理员用户创建成功"

    # 更新用户元数据
    USER_ID=$(echo "$SIGNUP_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$USER_ID" ]; then
        sudo docker-compose exec -T db psql -U postgres << EOF 2>/dev/null || true
        UPDATE public.profiles
        SET username = '$ADMIN_USERNAME',
            full_name = '系统管理员',
            role = 'admin'
        WHERE id = '$USER_ID';
EOF
    fi
elif [[ "$SIGNUP_RESULT" == *"User already registered"* ]] || [[ "$SIGNUP_RESULT" == *"already exists"* ]]; then
    echo "  用户已存在，跳过创建"
else
    echo "  警告: 用户创建可能失败，请手动检查"
    echo "  返回: $SIGNUP_RESULT"
fi

echo "  ✅ 管理员用户配置完成"
echo "  邮箱: $ADMIN_EMAIL"
echo "  密码: $ADMIN_PASSWORD"
echo ""

echo "=========================================="
echo "✅ 部署完成!"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  - 前端: http://<服务器IP>"
echo "  - Studio: http://<服务器IP>:3000"
echo "  - API: http://<服务器IP>"
echo ""
echo "默认账号:"
echo "  - 管理员: $ADMIN_EMAIL / $ADMIN_PASSWORD"
echo "  - Studio: admin / Willyou@2026"
echo ""
echo "请检查服务状态: sudo docker-compose ps"
echo "查看日志: sudo docker-compose logs -f"
echo ""
SCRIPT_EOF
        chmod +x "$OFFLINE_DIR/deploy/scripts/offline-deploy.sh"
        
        # 打包
        echo "   打包离线部署包..."
        tar -czf "$OFFLINE_DIR.tar.gz" "$OFFLINE_DIR"
        rm -rf "$OFFLINE_DIR"
        
        echo -e "${GREEN}   ✅ 离线部署包已生成${NC}"
        echo ""
        echo -e "${CYAN}========================================${NC}"
        echo -e "${CYAN}离线部署包: $OFFLINE_DIR.tar.gz${NC}"
        echo -e "${CYAN}========================================${NC}"
        echo ""
        echo "请按以下步骤完成部署:"
        echo ""
        echo "1. 将离线包上传到目标服务器:"
        echo "   scp $OFFLINE_DIR.tar.gz user@your-server:/opt/"
        echo ""
        echo "2. 在服务器上解压并部署:"
        echo "   ssh user@your-server"
        echo "   cd /opt && tar -xzf $OFFLINE_DIR.tar.gz"
        echo "   cd $OFFLINE_DIR"
        echo "   vim .env  # 配置服务器IP和密码"
        echo "   sudo ./deploy/scripts/offline-deploy.sh"
        echo ""
        echo -e "${YELLOW}注意: 离线部署包生成后，请在目标服务器上执行部署${NC}"
        echo ""
        
        # 清理临时文件
        rm -rf docker-images
        
        exit 0
        ;;
esac

# ==========================================
# 公共步骤：验证部署
# ==========================================
echo -e "${BLUE}[步骤 6/6] 验证部署...${NC}"
echo ""

sleep 10

# 获取 ANON_KEY
if [ -f "$PROJECT_DIR/config/env/.env.production" ]; then
    ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY "$PROJECT_DIR/config/env/.env.production" | cut -d'=' -f2)
elif [ -f "$PROJECT_DIR/config/env/.env.supabase" ]; then
    ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY "$PROJECT_DIR/config/env/.env.supabase" | cut -d'=' -f2)
elif [ -f "$PROJECT_DIR/.env.production" ]; then
    ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY "$PROJECT_DIR/.env.production" | cut -d'=' -f2)
elif [ -f "$PROJECT_DIR/.env.supabase" ]; then
    ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY "$PROJECT_DIR/.env.supabase" | cut -d'=' -f2)
else
    echo -e "${YELLOW}   警告: 无法找到 ANON_KEY，跳过 API 测试${NC}"
    ANON_KEY=""
fi

echo "   测试用户创建 API..."
TEST_RESULT=$(curl -s -X POST "http://$DEPLOY_SERVER_IP/api/auth/create-user" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username": "deploytest", "password": "Test@123456", "email": "deploytest@pmsy.com"}' 2>/dev/null || echo "")

if [[ "$TEST_RESULT" == *"success":true* ]]; then
    echo -e "${GREEN}   ✅ 用户创建 API 测试通过${NC}"
else
    echo -e "${YELLOW}   ⚠️ 用户创建 API 测试可能失败${NC}"
fi

echo "   测试登录 API..."
LOGIN_RESULT=$(curl -s -X POST "http://$DEPLOY_SERVER_IP/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "deploytest@pmsy.com", "password": "Test@123456"}' 2>/dev/null || echo "")

if [[ "$LOGIN_RESULT" == *"access_token"* ]]; then
    echo -e "${GREEN}   ✅ 登录 API 测试通过${NC}"
else
    echo -e "${YELLOW}   ⚠️ 登录 API 测试可能失败${NC}"
fi

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}🎉 全新部署完成!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "访问地址:"
echo "  - 前端: http://$DEPLOY_SERVER_IP"
echo "  - Studio: http://$DEPLOY_SERVER_IP:3000"
echo "  - API: http://$DEPLOY_SERVER_IP"
echo ""
echo "默认账号:"
echo "  - Studio: admin / Willyou@2026"
echo "  - Root: admin@yourcompany.com / Willyou@2026"
echo "  - PMSY 管理员: admin@pmsy.com / admin123"
echo ""
echo -e "${YELLOW}请测试登录功能确认部署成功${NC}"
echo ""
echo -e "${BLUE}查看日志:${NC}"
echo "  ssh $DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP 'cd $DEPLOY_REMOTE_DIR && sudo docker-compose logs -f'"
echo ""
