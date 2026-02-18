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

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${RED}==========================================${NC}"
echo -e "${RED}🆕 PMSY 全新部署脚本 (fresh-install)${NC}"
echo -e "${RED}==========================================${NC}"
echo ""

cd "$PROJECT_DIR"

if [ ! -f "config/docker/docker-compose.yml" ] || [ ! -d "deploy" ]; then
    echo -e "${RED}❌ 错误: 请在项目根目录执行此脚本${NC}"
    echo "正确用法: ./deploy/fresh-install/deploy.sh"
    exit 1
fi

echo -e "${GREEN}✅ 执行环境检查通过${NC}"
echo ""

# ==========================================
# 步骤 0: 配置一致性检查
# ==========================================
echo -e "${BLUE}[步骤 0/6] 执行配置一致性检查...${NC}"
echo ""

check_config_consistency() {
    local ERRORS=0
    local WARNINGS=0
    
    local DOCKER_COMPOSE_FILE="$PROJECT_DIR/config/docker/docker-compose.yml"
    local NGINX_CONF_FILE="$PROJECT_DIR/config/nginx/nginx.conf"
    local ENV_FILE="$PROJECT_DIR/config/env/.env.production"
    
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
    
    echo -e "${CYAN}  [1/4] 检查配置文件存在性${NC}"
    [ ! -f "$DOCKER_COMPOSE_FILE" ] && error "docker-compose.yml 不存在" || success "docker-compose.yml 存在"
    [ ! -f "$NGINX_CONF_FILE" ] && error "nginx.conf 不存在" || success "nginx.conf 存在"
    [ ! -f "$ENV_FILE" ] && warning ".env.production 不存在（将使用 .env.example）" || success ".env.production 存在"
    
    if [ $ERRORS -gt 0 ]; then
        return 1
    fi
    
    echo ""
    echo -e "${CYAN}  [2/4] 检查 Nginx 代理配置${NC}"
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
    
    echo ""
    echo -e "${CYAN}  [3/4] 检查服务配置${NC}"
    grep -q "postgres:" "$DOCKER_COMPOSE_FILE" && success "PostgreSQL 服务配置存在"
    grep -q "redis:" "$DOCKER_COMPOSE_FILE" && success "Redis 服务配置存在"
    grep -q "minio:" "$DOCKER_COMPOSE_FILE" && success "MinIO 服务配置存在"
    grep -q "api:" "$DOCKER_COMPOSE_FILE" && success "API 服务配置存在"
    grep -q "nginx:" "$DOCKER_COMPOSE_FILE" && success "Nginx 服务配置存在"
    
    echo ""
    echo -e "${CYAN}  [4/4] 检查 api-new 目录${NC}"
    if [ -d "$PROJECT_DIR/api-new" ]; then
        success "api-new 目录存在"
        [ -f "$PROJECT_DIR/api-new/package.json" ] && success "api-new/package.json 存在"
        [ -d "$PROJECT_DIR/api-new/dist" ] && success "api-new/dist 目录存在（已构建）" || warning "api-new/dist 目录不存在（需要构建）"
    else
        error "api-new 目录不存在"
    fi
    
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

if ! check_config_consistency; then
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ 配置一致性检查未通过${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "请修复上述错误后再进行部署"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 配置一致性检查通过${NC}"
echo ""

echo -e "${YELLOW}⚠️  警告：此操作将清空服务器所有现有数据！${NC}"
echo -e "${YELLOW}   - 删除现有 PostgreSQL 数据${NC}"
echo -e "${YELLOW}   - 删除现有 Redis 数据${NC}"
echo -e "${YELLOW}   - 删除现有 MinIO 数据${NC}"
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

if [ -f ".env.deploy" ]; then
    source .env.deploy
    echo -e "${GREEN}   已加载配置文件 .env.deploy${NC}"
else
    echo -e "${YELLOW}   未找到 .env.deploy，请输入服务器配置${NC}"
fi

if [ -z "$DEPLOY_SERVER_IP" ]; then
    read -p "   服务器 IP: " DEPLOY_SERVER_IP
fi
echo "   服务器 IP: $DEPLOY_SERVER_IP"

if [ -z "$DEPLOY_SERVER_USER" ]; then
    DEPLOY_SERVER_USER="${DEPLOY_SERVER_USER:-ubuntu}"
    read -p "   服务器用户名 [$DEPLOY_SERVER_USER]: " input_user
    DEPLOY_SERVER_USER="${input_user:-$DEPLOY_SERVER_USER}"
fi
echo "   服务器用户名: $DEPLOY_SERVER_USER"

if [ -z "$DEPLOY_REMOTE_DIR" ]; then
    DEPLOY_REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/opt/pmsy}"
    read -p "   部署目录 [$DEPLOY_REMOTE_DIR]: " input_dir
    DEPLOY_REMOTE_DIR="${input_dir:-$DEPLOY_REMOTE_DIR}"
fi
echo "   部署目录: $DEPLOY_REMOTE_DIR"

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

echo -e "${YELLOW}   检查现有 PMSY 环境...${NC}"
EXISTING_ENV=$(ssh "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "
    if [ -d '$DEPLOY_REMOTE_DIR' ]; then
        echo 'DIRECTORY_EXISTS'
        if [ -f '$DEPLOY_REMOTE_DIR/docker-compose.yml' ]; then
            echo 'DOCKER_COMPOSE_EXISTS'
        fi
        if sudo docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qE 'pmsy'; then
            echo 'CONTAINERS_EXISTS'
        fi
        if sudo docker volume ls --format '{{.Name}}' 2>/dev/null | grep -qE 'pmsy'; then
            echo 'DOCKER_VOLUMES_EXISTS'
        fi
    else
        echo 'CLEAN'
    fi
" 2>/dev/null)

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

if [ "$ENV_STATUS" != "CLEAN" ]; then
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}⚠️  重要提示${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "全新部署将执行以下操作:"
    echo "  1. 停止并删除所有现有 PMSY 容器"
    echo "  2. 删除所有现有数据卷（包括数据库数据）"
    echo "  3. 删除现有部署目录并重新创建"
    echo "  4. 重新初始化所有配置和数据"
    echo ""
    echo -e "${RED}此操作不可逆，所有现有数据将丢失！${NC}"
    echo ""
    
    echo -e "${YELLOW}现有容器列表:${NC}"
    ssh "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "sudo docker ps -a --format '  {{.Names}} ({{.Status}})' 2>/dev/null | grep -E 'pmsy' || echo '  无运行中的容器'"
    echo ""
    
    echo -e "${YELLOW}现有数据卷列表:${NC}"
    ssh "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "sudo docker volume ls --format '  {{.Name}}' 2>/dev/null | grep -E 'pmsy' || echo '  无相关数据卷'"
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
    
    ssh "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "
        echo '   停止并删除所有 PMSY 相关容器...'
        cd $DEPLOY_REMOTE_DIR 2>/dev/null && sudo docker-compose down -v 2>/dev/null || true
        
        echo '   强制删除 PMSY 容器（包括未停止的）...'
        sudo docker rm -f \$(sudo docker ps -aq --filter 'name=pmsy' 2>/dev/null) 2>/dev/null || true
        
        echo '   强制删除 PMSY 数据卷...'
        # 先尝试正常删除
        sudo docker volume rm \$(sudo docker volume ls -q --filter 'name=pmsy' 2>/dev/null) 2>/dev/null || true
        # 如果还有残留，强制删除
        for vol in \$(sudo docker volume ls -q --filter 'name=pmsy' 2>/dev/null); do
            echo "   强制删除数据卷: \$vol"
            sudo docker volume rm -f \$vol 2>/dev/null || true
        done
        
        echo '   删除 PMSY 网络...'
        sudo docker network rm \$(sudo docker network ls -q --filter 'name=pmsy' 2>/dev/null) 2>/dev/null || true
        
        echo '   清理部署目录...'
        sudo rm -rf $DEPLOY_REMOTE_DIR
        
        echo '   清理 Docker 系统（可选）...'
        sudo docker system prune -f 2>/dev/null || true
        
        echo '   创建新目录...'
        sudo mkdir -p $DEPLOY_REMOTE_DIR
        sudo chown $DEPLOY_SERVER_USER:$DEPLOY_SERVER_USER $DEPLOY_REMOTE_DIR
        
        echo '   ✅ 环境清理完成'
        
        echo '   验证清理结果:'
        echo '   - 容器:' \$(sudo docker ps -a --filter 'name=pmsy' --format '{{.Names}}' 2>/dev/null | wc -l) '个'
        echo '   - 数据卷:' \$(sudo docker volume ls --filter 'name=pmsy' --format '{{.Name}}' 2>/dev/null | wc -l) '个'
        echo '   - 网络:' \$(sudo docker network ls --filter 'name=pmsy' --format '{{.Name}}' 2>/dev/null | wc -l) '个'
    "
    
    echo -e "${GREEN}   ✅ 服务器环境已重置${NC}"
fi

echo ""

# ==========================================
# 公共步骤：检查并更新配置
# ==========================================
echo -e "${BLUE}[步骤 3/5] 检查并更新配置...${NC}"
echo ""

if [ ! -f "config/env/.env.production" ] && [ ! -f "config/env/.env.example" ]; then
    echo -e "${RED}❌ 错误: config/env/.env.production 或 config/env/.env.example 文件不存在${NC}"
    exit 1
fi

ENV_SOURCE="config/env/.env.production"
if [ ! -f "config/env/.env.production" ]; then
    ENV_SOURCE="config/env/.env.example"
fi

echo -e "${YELLOW}⚠️  重要：部署前请确保已更新 $ENV_SOURCE 中的配置${NC}"
echo ""
echo "请检查以下配置项："
echo ""
echo "  1. DB_PASSWORD - 数据库密码"
echo "     当前: $(grep '^DB_PASSWORD=' $ENV_SOURCE 2>/dev/null | cut -d'=' -f2 || echo '未设置')"
echo "     ⚠️  生产环境必须修改为强密码"
echo ""
echo "  2. JWT_SECRET - JWT签名密钥"
echo "     当前: $(grep '^JWT_SECRET=' $ENV_SOURCE 2>/dev/null | cut -d'=' -f2 || echo '未设置')"
echo "     ⚠️  生产环境必须使用强随机字符串"
echo ""
echo "  3. MINIO_SECRET_KEY - MinIO 密钥"
echo "     当前: $(grep '^MINIO_SECRET_KEY=' $ENV_SOURCE 2>/dev/null | cut -d'=' -f2 || echo '未设置')"
echo "     ⚠️  生产环境必须修改"
echo ""
echo "  4. API_URL - API 访问地址"
echo "     当前: $(grep '^API_URL=' $ENV_SOURCE 2>/dev/null | cut -d'=' -f2 || echo '未设置')"
echo "     建议修改为: http://$DEPLOY_SERVER_IP"
echo ""

read -p "是否需要编辑配置文件? (yes/no) " -r
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}   请编辑 $ENV_SOURCE 文件，修改上述配置...${NC}"
    
    if command -v vim &> /dev/null; then
        vim "$ENV_SOURCE"
    elif command -v nano &> /dev/null; then
        nano "$ENV_SOURCE"
    else
        echo "   请手动编辑 $ENV_SOURCE 文件，然后按回车继续..."
        read
    fi
    
    echo -e "${GREEN}   ✅ 配置已更新${NC}"
fi

echo ""

# ==========================================
# 公共步骤：构建前端和后端
# ==========================================
echo -e "${BLUE}[步骤 4/5] 构建前端和后端...${NC}"
echo ""

echo -e "${YELLOW}   构建前端...${NC}"

# 保存原始 .env 文件内容（如果存在）
ORIGINAL_ENV=""
# 构建前端 - 使用 VITE_ENV_FILE 环境变量加载生产环境配置
# 不再覆盖 .env 文件，避免开发环境配置丢失
if [ -f "config/env/.env.production" ]; then
    echo "   使用 config/env/.env.production 进行构建"
    export VITE_ENV_FILE="config/env/.env.production"
else
    echo "   使用 config/env/.env.example 进行构建"
    export VITE_ENV_FILE="config/env/.env.example"
fi

# 使用 --mode production 构建，VITE_ENV_FILE 指定环境文件
npm run build -- --mode production

echo -e "${GREEN}   ✅ 前端构建完成${NC}"

echo -e "${YELLOW}   构建后端 API...${NC}"
cd "$PROJECT_DIR/api-new"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build 2>/dev/null || echo "   注意: API 可能已在 dist 目录中"
cd "$PROJECT_DIR"
echo -e "${GREEN}   ✅ 后端构建完成${NC}"
echo ""

# ==========================================
# 根据部署模式执行不同逻辑
# ==========================================

case $DEPLOY_MODE in
    "online")
        echo -e "${BLUE}[步骤 5/5] 在线部署到服务器...${NC}"
        echo ""
        
        echo -e "${YELLOW}   配置 SSH 免密码登录...${NC}"
        if [ ! -f "$HOME/.ssh/id_rsa" ]; then
            echo "   生成 SSH 密钥对..."
            ssh-keygen -t rsa -b 4096 -C "pmsy-deploy" -f "$HOME/.ssh/id_rsa" -N ""
            echo "   ✅ SSH 密钥已生成"
        fi

        echo "   检查 SSH 免密码登录..."
        if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "echo OK" 2>/dev/null; then
            echo ""
            echo -e "${CYAN}   ========================================${NC}"
            echo -e "${CYAN}   需要配置 SSH 免密码登录${NC}"
            echo -e "${CYAN}   ========================================${NC}"
            echo ""
            echo "   请输入服务器 ${DEPLOY_SERVER_USER}@${DEPLOY_SERVER_IP} 的登录密码"
            echo ""
            
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
                exit 1
            fi
        fi
        echo -e "${GREEN}   ✅ SSH 配置完成${NC}"
        echo ""
        
        echo -e "${YELLOW}   准备部署包...${NC}"
        DEPLOY_TMP=$(mktemp -d)
        mkdir -p "$DEPLOY_TMP/pmsy"
        
        # 前端构建产物
        cp -r dist "$DEPLOY_TMP/pmsy/"
        
        # 后端构建产物（只复制 dist，不复制整个 api-new）
        mkdir -p "$DEPLOY_TMP/pmsy/api-new"
        cp -r api-new/dist "$DEPLOY_TMP/pmsy/api-new/"
        cp api-new/package*.json "$DEPLOY_TMP/pmsy/api-new/"
        cp api-new/Dockerfile "$DEPLOY_TMP/pmsy/api-new/"
        
        # Docker 和 Nginx 配置
        cp config/docker/docker-compose.yml "$DEPLOY_TMP/pmsy/"
        cp config/nginx/nginx.conf "$DEPLOY_TMP/pmsy/nginx.conf"
        cp "$ENV_SOURCE" "$DEPLOY_TMP/pmsy/.env"
        
        # 【新增】数据库迁移文件（不再打包进镜像，独立上传）
        mkdir -p "$DEPLOY_TMP/pmsy/api-new/database/migrations"
        cp -r api-new/database/migrations/*.sql "$DEPLOY_TMP/pmsy/api-new/database/migrations/" 2>/dev/null || echo "   注意: 没有 SQL 迁移文件"
        cp api-new/knexfile.ts "$DEPLOY_TMP/pmsy/api-new/" 2>/dev/null || echo "   注意: knexfile.ts 不存在"
        
        # 部署脚本
        mkdir -p "$DEPLOY_TMP/pmsy/deploy"
        for item in deploy/*; do
            if [ -d "$item" ] && [ "$(basename "$item")" != "cache" ]; then
                cp -r "$item" "$DEPLOY_TMP/pmsy/deploy/"
            elif [ -f "$item" ]; then
                cp "$item" "$DEPLOY_TMP/pmsy/deploy/"
            fi
        done
        
        echo -e "${GREEN}   ✅ 部署包准备完成${NC}"
        echo ""
        
        echo -e "${YELLOW}   上传到服务器...${NC}"
        ssh "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "sudo mkdir -p $DEPLOY_REMOTE_DIR && sudo chown $DEPLOY_SERVER_USER:$DEPLOY_SERVER_USER $DEPLOY_REMOTE_DIR"
        rsync -avz --delete "$DEPLOY_TMP/pmsy/" "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP:$DEPLOY_REMOTE_DIR/"
        rm -rf "$DEPLOY_TMP"
        echo -e "${GREEN}   ✅ 上传完成${NC}"
        echo ""
        
        echo -e "${YELLOW}   在服务器上执行部署...${NC}"
        ssh -tt "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" << REMOTE_SCRIPT
set -e

export DEPLOY_REMOTE_DIR="$DEPLOY_REMOTE_DIR"
export DEPLOY_SERVER_IP="$DEPLOY_SERVER_IP"

echo "   [服务器] 检查 sudo 权限..."
if ! sudo -n true 2>/dev/null; then
    echo "   请确保当前用户有免密码 sudo 权限"
    sudo echo "   ✅ sudo 权限验证通过"
fi

cd "\$DEPLOY_REMOTE_DIR"

echo "   [服务器] 更新配置..."
sed -i "s|API_URL=.*|API_URL=http://\$DEPLOY_SERVER_IP|" .env

echo "   [服务器] 检查 PostgreSQL 数据卷状态..."
# 如果数据卷已存在，可能是之前失败的部署残留，需要清理
if sudo docker volume ls --format '{{.Name}}' | grep -q "pmsy_postgres_data"; then
    echo "   ⚠️  检测到已存在 PostgreSQL 数据卷"
    echo "   检查是否需要重新初始化..."
fi

echo "   [服务器] 启动 PostgreSQL..."
sudo docker-compose up -d postgres

echo "   [服务器] 等待 PostgreSQL 就绪..."
for i in {1..30}; do
    if sudo docker-compose exec -T postgres pg_isready -U "\${POSTGRES_USER:-pmsy}" -d "\${POSTGRES_DB:-pmsy}" > /dev/null 2>&1; then
        echo "   ✅ PostgreSQL 就绪"
        break
    fi
    echo "   等待 PostgreSQL... (\$i/30)"
    sleep 2
done

echo "   [服务器] 检查数据库初始化状态..."
# 等待几秒让 PostgreSQL 完成初始化脚本执行
sleep 5

DB_INITIALIZED=\$(sudo docker-compose exec -T postgres psql -U "\${POSTGRES_USER:-pmsy}" -d "\${POSTGRES_DB:-pmsy}" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles')" 2>/dev/null || echo "f")

echo "   数据库初始化状态: \$DB_INITIALIZED"

if [ "\$DB_INITIALIZED" = "t" ]; then
    echo "   ✅ 数据库已初始化"
    
    # 检查关键表是否存在
    TABLE_COUNT=\$(sudo docker-compose exec -T postgres psql -U "\${POSTGRES_USER:-pmsy}" -d "\${POSTGRES_DB:-pmsy}" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "0")
    echo "   数据库表数量: \$TABLE_COUNT"
    
    if [ "\$TABLE_COUNT" -lt 10 ]; then
        echo "   ⚠️  警告: 数据库表数量不足，可能初始化不完整"
        echo "   建议: 如果需要重新初始化，请清空数据卷后重新部署"
    fi
else
    echo "   ❌ 数据库未初始化或初始化失败"
    echo "   检查 PostgreSQL 日志..."
    sudo docker-compose logs postgres | tail -20
    echo ""
    echo "   可能原因:"
    echo "   1. 数据卷已存在，PostgreSQL 跳过了初始化"
    echo "   2. 迁移文件执行出错"
    echo ""
    echo "   解决方案: 清空数据卷后重新部署"
    exit 1
fi

echo "   [服务器] 拉取并启动其他服务..."
sudo docker-compose pull
sudo docker-compose up -d

echo "   [服务器] 等待 API 服务就绪..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "   ✅ API 服务就绪"
        break
    fi
    echo "   等待 API 服务... (\$i/30)"
    sleep 2
done

echo "   [服务器] 检查服务状态..."
sudo docker-compose ps

echo "   [服务器] ✅ 部署完成"
REMOTE_SCRIPT
        
        echo -e "${GREEN}   ✅ 服务器部署完成${NC}"
        echo ""
        ;;
        
    "semi-offline")
        echo -e "${BLUE}[步骤 5/5] 半离线部署（导出镜像）...${NC}"
        echo ""
        
        echo -e "${YELLOW}   配置 SSH 免密码登录...${NC}"
        if [ ! -f "$HOME/.ssh/id_rsa" ]; then
            ssh-keygen -t rsa -b 4096 -C "pmsy-deploy" -f "$HOME/.ssh/id_rsa" -N ""
        fi

        if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "echo OK" 2>/dev/null; then
            SSH_CONFIG_SUCCESS=false
            for i in {1..3}; do
                if ssh-copy-id -o StrictHostKeyChecking=no "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" 2>&1; then
                    SSH_CONFIG_SUCCESS=true
                    break
                fi
            done
            if [ "$SSH_CONFIG_SUCCESS" = false ]; then
                echo -e "${RED}   ❌ SSH 配置失败${NC}"
                exit 1
            fi
        fi
        echo -e "${GREEN}   ✅ SSH 配置完成${NC}"
        echo ""

        echo -e "${YELLOW}   导出 Docker 镜像...${NC}"
        mkdir -p docker-images
        
        IMAGES=(
            "postgres:15-alpine"
            "redis:7-alpine"
            "minio/minio:latest"
            "node:18-alpine"
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
        
        echo -e "${YELLOW}   准备部署包...${NC}"
        DEPLOY_TMP=$(mktemp -d)
        mkdir -p "$DEPLOY_TMP/pmsy"
        
        cp -r dist "$DEPLOY_TMP/pmsy/"
        cp -r api-new "$DEPLOY_TMP/pmsy/"
        cp -r docker-images "$DEPLOY_TMP/pmsy/"
        cp config/docker/docker-compose.yml "$DEPLOY_TMP/pmsy/"
        cp config/nginx/nginx.conf "$DEPLOY_TMP/pmsy/nginx.conf"
        cp "$ENV_SOURCE" "$DEPLOY_TMP/pmsy/.env"
        
        mkdir -p "$DEPLOY_TMP/pmsy/deploy"
        for item in deploy/*; do
            if [ -d "$item" ] && [ "$(basename "$item")" != "cache" ]; then
                cp -r "$item" "$DEPLOY_TMP/pmsy/deploy/"
            elif [ -f "$item" ]; then
                cp "$item" "$DEPLOY_TMP/pmsy/deploy/"
            fi
        done
        
        echo -e "${GREEN}   ✅ 部署包准备完成${NC}"
        echo ""
        
        echo -e "${YELLOW}   上传到服务器（包含镜像，可能较慢）...${NC}"
        ssh "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" "sudo mkdir -p $DEPLOY_REMOTE_DIR && sudo chown $DEPLOY_SERVER_USER:$DEPLOY_SERVER_USER $DEPLOY_REMOTE_DIR"
        rsync -avz --delete "$DEPLOY_TMP/pmsy/" "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP:$DEPLOY_REMOTE_DIR/"
        rm -rf "$DEPLOY_TMP"
        echo -e "${GREEN}   ✅ 上传完成${NC}"
        echo ""
        
        echo -e "${YELLOW}   在服务器上执行部署...${NC}"
        ssh -tt "$DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP" << REMOTE_SCRIPT
set -e

export DEPLOY_REMOTE_DIR="$DEPLOY_REMOTE_DIR"
export DEPLOY_SERVER_IP="$DEPLOY_SERVER_IP"

echo "   [服务器] 检查 sudo 权限..."
if ! sudo -n true 2>/dev/null; then
    sudo echo "   ✅ sudo 权限验证通过"
fi

cd "\$DEPLOY_REMOTE_DIR"

echo "   [服务器] 导入 Docker 镜像..."
for tarfile in docker-images/*.tar; do
    if [ -f "\$tarfile" ]; then
        echo "     导入 \$(basename \$tarfile)..."
        sudo docker load < "\$tarfile" || echo "     警告: 导入失败"
    fi
done

echo "   [服务器] 更新配置..."
sed -i "s|API_URL=.*|API_URL=http://\$DEPLOY_SERVER_IP|" .env

echo "   [服务器] 启动服务..."
sudo docker-compose up -d

echo "   [服务器] 等待服务启动..."
sleep 10

for i in {1..30}; do
    if sudo docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "   ✅ PostgreSQL 就绪"
        break
    fi
    echo "   等待 PostgreSQL... (\$i/30)"
    sleep 2
done

for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "   ✅ API 服务就绪"
        break
    fi
    echo "   等待 API 服务... (\$i/30)"
    sleep 2
done

echo "   [服务器] 执行数据库迁移..."
sudo docker-compose exec -T api sh -c "cd /app && npm run db:migrate" 2>/dev/null || true

echo "   [服务器] 执行种子数据..."
sudo docker-compose exec -T api sh -c "cd /app && npm run db:seed" 2>/dev/null || true

echo "   [服务器] ✅ 部署完成"
REMOTE_SCRIPT

        echo -e "${GREEN}   ✅ 服务器部署完成${NC}"
        echo ""

        rm -rf docker-images
        ;;

    "offline")
        echo -e "${BLUE}[步骤 5/5] 完全离线部署（生成离线包）...${NC}"
        echo ""
        
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
        
        echo -e "${YELLOW}   导出 Docker 镜像（$ARCH 架构）...${NC}"
        mkdir -p docker-images
        
        IMAGES=(
            "postgres:15-alpine"
            "redis:7-alpine"
            "minio/minio:latest"
            "node:18-alpine"
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
        
        OFFLINE_DIR="pmsy-offline-deploy-$ARCH-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$OFFLINE_DIR"
        
        cp -r dist "$OFFLINE_DIR/"
        cp -r api-new "$OFFLINE_DIR/"
        cp -r docker-images "$OFFLINE_DIR/"
        cp config/docker/docker-compose.yml "$OFFLINE_DIR/"
        cp config/nginx/nginx.conf "$OFFLINE_DIR/nginx.conf"
        cp "$ENV_SOURCE" "$OFFLINE_DIR/.env.example"
        
        mkdir -p "$OFFLINE_DIR/deploy"
        for item in deploy/*; do
            if [ -d "$item" ] && [ "$(basename "$item")" != "cache" ]; then
                cp -r "$item" "$OFFLINE_DIR/deploy/"
            elif [ -f "$item" ]; then
                cp "$item" "$OFFLINE_DIR/deploy/"
            fi
        done
        
        cat > "$OFFLINE_DIR/部署指导.md" << 'GUIDE_EOF'
# PMSY 离线部署指导

## 部署包内容

此部署包包含：
- ✅ 前端构建文件 (dist/)
- ✅ API 服务代码 (api-new/)
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
scp -r pmsy-offline-deploy-XXX user@your-server:/opt/
```

### 2. 配置环境变量

```bash
cd /opt/pmsy-offline-deploy-XXX
cp .env.example .env
vim .env

# 修改以下配置：
# - API_URL: http://你的服务器IP
# - DB_PASSWORD: 数据库密码
# - JWT_SECRET: JWT密钥
# - MINIO_SECRET_KEY: MinIO密钥
```

### 3. 执行部署

```bash
sudo ./deploy/scripts/offline-deploy.sh
```

或手动执行：

```bash
# 导入 Docker 镜像
for tarfile in docker-images/*.tar; do
    sudo docker load < "$tarfile"
done

# 启动服务
sudo docker-compose up -d

# 等待服务启动
sleep 30

# 执行数据库迁移
sudo docker-compose exec api sh -c "cd /app && npm run db:migrate"

# 执行种子数据
sudo docker-compose exec api sh -c "cd /app && npm run db:seed"
```

### 4. 验证部署

- 访问前端: http://你的服务器IP
- 访问 API: http://你的服务器IP/api/health

## 默认账号

- 管理员: admin@pmsy.com / Willyou@2026

## 故障排查

```bash
# 查看日志
sudo docker-compose logs -f

# 检查服务状态
sudo docker-compose ps
```
GUIDE_EOF
        
        mkdir -p "$OFFLINE_DIR/deploy/scripts"
        cat > "$OFFLINE_DIR/deploy/scripts/offline-deploy.sh" << 'SCRIPT_EOF'
#!/bin/bash
set -e

echo "=========================================="
echo "PMSY 离线部署脚本"
echo "=========================================="
echo ""

cd "$(dirname "$0")/../.."

echo "[1/6] 导入 Docker 镜像..."
for tarfile in docker-images/*.tar; do
    if [ -f "$tarfile" ]; then
        echo "  导入 $(basename $tarfile)..."
        sudo docker load < "$tarfile" || echo "  警告: 导入失败"
    fi
done
echo ""

echo "[2/6] 配置环境..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "  请编辑 .env 文件配置服务器IP和密码"
    exit 1
fi
echo ""

echo "[3/6] 启动服务..."
sudo docker-compose up -d
echo ""

echo "[4/6] 等待服务启动..."
sleep 30

for i in {1..30}; do
    if sudo docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "  ✅ PostgreSQL 就绪"
        break
    fi
    echo "  等待 PostgreSQL... ($i/30)"
    sleep 2
done

for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "  ✅ API 服务就绪"
        break
    fi
    echo "  等待 API 服务... ($i/30)"
    sleep 2
done
echo ""

echo "[5/6] 执行数据库迁移..."
sudo docker-compose exec -T api sh -c "cd /app && npm run db:migrate" 2>/dev/null || true
echo ""

echo "[6/6] 执行种子数据..."
sudo docker-compose exec -T api sh -c "cd /app && npm run db:seed" 2>/dev/null || true
echo ""

echo "=========================================="
echo "✅ 部署完成!"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  - 前端: http://<服务器IP>"
echo "  - API: http://<服务器IP>/api/health"
echo ""
echo "默认账号:"
echo "  - 管理员: admin@pmsy.com / Willyou@2026"
echo ""
SCRIPT_EOF
        chmod +x "$OFFLINE_DIR/deploy/scripts/offline-deploy.sh"
        
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
        
        rm -rf docker-images
        exit 0
        ;;
esac

# ==========================================
# 公共步骤：验证部署
# ==========================================
echo -e "${BLUE}[步骤 6/6] 验证部署...${NC}"
echo ""

sleep 5

echo "   测试 API 健康检查..."
HEALTH_RESULT=$(curl -s "http://$DEPLOY_SERVER_IP/api/health" 2>/dev/null || echo "")

if [ -n "$HEALTH_RESULT" ]; then
    echo -e "${GREEN}   ✅ API 服务响应正常${NC}"
else
    echo -e "${YELLOW}   ⚠️ API 服务可能未就绪，请手动检查${NC}"
fi

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}🎉 全新部署完成!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "访问地址:"
echo "  - 前端: http://$DEPLOY_SERVER_IP"
echo "  - API: http://$DEPLOY_SERVER_IP/api/health"
echo ""
echo "默认账号:"
echo "  - 管理员: admin@pmsy.com / Willyou@2026"
echo ""
echo -e "${YELLOW}请测试登录功能确认部署成功${NC}"
echo ""
echo -e "${BLUE}查看日志:${NC}"
echo "  ssh $DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP 'cd $DEPLOY_REMOTE_DIR && sudo docker-compose logs -f'"
echo ""
