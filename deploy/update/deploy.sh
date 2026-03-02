#!/bin/bash
# ==========================================
# 🔄 PMSY 更新部署脚本 (update) - v2.0
# ==========================================
#
# 【提示】此脚本用于更新现有 PMSY 系统，保留所有数据
# 适用场景：代码更新、配置更新、前端更新、数据库迁移
#
# 特性：
# - 自动检测并执行数据库迁移（支持 Docker 容器）
# - 支持迁移回滚（失败时自动回滚）
# - 保留所有现有数据
# - 迁移记录持久化存储
#
# 使用方法:
#   ./deploy/update/deploy.sh
#
# ==========================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}🔄 PMSY 更新部署脚本 (update) v2.0${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

echo -e "${YELLOW}ℹ️  此脚本将:${NC}"
echo -e "${YELLOW}   - 保留所有现有数据${NC}"
echo -e "${YELLOW}   - 检测并执行数据库迁移（Docker 模式）${NC}"
echo -e "${YELLOW}   - 更新前端代码${NC}"
echo -e "${YELLOW}   - 更新 API 代码${NC}"
echo -e "${YELLOW}   - 重新构建 API Docker 镜像${NC}"
echo -e "${YELLOW}   - 重启服务${NC}"
echo ""

# 配置
SERVER_IP="${DEPLOY_SERVER_IP:-106.227.19.2}"
SERVER_PORT="${DEPLOY_SERVER_PORT:-9022}"
SERVER_USER="${DEPLOY_SERVER_USER:-ubuntu}"
DEPLOY_DIR="${DEPLOY_REMOTE_DIR:-/opt/pmsy}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo -e "${CYAN}部署配置:${NC}"
echo "  服务器: $SERVER_USER@$SERVER_IP:$SERVER_PORT"
echo "  部署目录: $DEPLOY_DIR"
echo ""

echo -e "${GREEN}[1/7] 检查环境...${NC}"
cd "$PROJECT_ROOT"

ENV_FILE=""
if [ -f "config/env/.env.production" ]; then
    ENV_FILE="config/env/.env.production"
elif [ -f "config/env/.env.example" ]; then
    ENV_FILE="config/env/.env.example"
else
    echo -e "${RED}❌ 错误: 未找到环境配置文件${NC}"
    echo "请创建 config/env/.env.production 文件"
    exit 1
fi

echo -e "${GREEN}   使用配置文件: $ENV_FILE${NC}"

echo -e "${GREEN}[2/7] 检查服务器连接...${NC}"
if ! ssh -p "$SERVER_PORT" -o BatchMode=yes -o ConnectTimeout=5 "$SERVER_USER@$SERVER_IP" "echo OK" 2>/dev/null; then
    echo -e "${RED}❌ 错误: 无法连接到服务器${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ 服务器连接正常${NC}"

echo -e "${GREEN}[3/7] 构建前端...${NC}"

# 构建前端 - 使用生产环境配置
# 不再覆盖 .env 文件，避免开发环境配置丢失
echo "   使用 $ENV_FILE 进行生产环境构建"
echo "   开始构建前端（可能需要 30-60 秒）..."

# 从生产环境配置文件中读取 VITE_API_URL
VITE_API_URL=$(grep '^VITE_API_URL=' "$ENV_FILE" | cut -d'=' -f2)
if [ -z "$VITE_API_URL" ]; then
    echo -e "${RED}   ❌ 错误: 未在 $ENV_FILE 中找到 VITE_API_URL 配置${NC}"
    exit 1
fi

echo "   VITE_API_URL: $VITE_API_URL"

# 使用生产环境变量构建
export VITE_API_URL="$VITE_API_URL"
npm run build -- --mode production
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}   ❌ 前端构建失败${NC}"
    echo "   请检查错误信息并修复问题后重试"
    exit 1
fi

# 显示构建结果
DIST_SIZE=$(du -sh "$PROJECT_ROOT/dist" 2>/dev/null | cut -f1)
FILE_COUNT=$(find "$PROJECT_ROOT/dist" -type f 2>/dev/null | wc -l)
echo -e "${GREEN}   ✅ 前端构建完成${NC}"
echo "   构建产物大小: $DIST_SIZE"
echo "   文件数量: $FILE_COUNT"

echo -e "${GREEN}[4/7] 构建后端 API...${NC}"
cd "$PROJECT_ROOT/api-new"
if [ ! -d "node_modules" ]; then
    echo "   安装依赖..."
    npm install
fi
echo "   编译 TypeScript..."
npm run build
API_BUILD_EXIT_CODE=$?

if [ $API_BUILD_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}   ❌ 后端构建失败${NC}"
    echo "   请检查错误信息并修复问题后重试"
    exit 1
fi

# 显示构建结果
API_DIST_SIZE=$(du -sh "$PROJECT_ROOT/api-new/dist" 2>/dev/null | cut -f1)
API_FILE_COUNT=$(find "$PROJECT_ROOT/api-new/dist" -type f 2>/dev/null | wc -l)
echo -e "${GREEN}   ✅ 后端构建完成${NC}"
echo "   构建产物大小: $API_DIST_SIZE"
echo "   文件数量: $API_FILE_COUNT"

echo -e "${GREEN}[5/7] 复制文件到服务器...${NC}"
echo "   复制前端 dist..."
rsync -avz --delete -e "ssh -p $SERVER_PORT" "$PROJECT_ROOT/dist/" "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/dist/"
echo "   复制后端 dist..."
rsync -avz --delete -e "ssh -p $SERVER_PORT" "$PROJECT_ROOT/api-new/dist/" "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/api-new/dist/"
echo "   复制后端 package.json..."
scp "$PROJECT_ROOT/api-new/package.json" "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/api-new/"
echo "   复制后端 Dockerfile..."
scp "$PROJECT_ROOT/api-new/Dockerfile" "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/api-new/"
echo "   复制数据库迁移文件..."
rsync -avz --delete -e "ssh -p $SERVER_PORT" "$PROJECT_ROOT/api-new/database/migrations/" "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/api-new/database/migrations/"
echo "   复制迁移脚本..."
scp "$PROJECT_ROOT/api-new/database/migrate.sh" "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/api-new/database/"
echo "   复制 docker-compose.yml..."
scp "$PROJECT_ROOT/config/docker/docker-compose.yml" "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/"
echo "   复制 nginx.conf..."
scp "$PROJECT_ROOT/config/nginx/nginx.conf" "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/nginx.conf"

echo -e "${GREEN}   ✅ 文件复制完成${NC}"

echo -e "${GREEN}[6/7] 执行数据库迁移...${NC}"
echo "   检查服务器容器状态..."

# 先在服务器上检查容器状态
CONTAINER_STATUS=$(ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP" "cd $DEPLOY_DIR && sudo docker-compose ps postgres 2>/dev/null | grep -E 'Up|running' || echo 'NOT_RUNNING'")

if [ "$CONTAINER_STATUS" = "NOT_RUNNING" ]; then
    echo -e "${YELLOW}   ⚠️ PostgreSQL 容器未运行，尝试启动...${NC}"
    ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP" "cd $DEPLOY_DIR && sudo docker-compose up -d postgres"
    sleep 5
fi

echo "   使用 Docker 模式执行迁移..."

# 在服务器上使用 Docker 执行数据库迁移
# Docker 模式下不需要密码，使用 docker-compose exec 直接进入容器执行
ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP" "cd $DEPLOY_DIR && sudo bash api-new/database/migrate.sh --docker-compose"

MIGRATION_EXIT_CODE=$?
if [ $MIGRATION_EXIT_CODE -ne 0 ]; then
    echo ""
    echo -e "${RED}==========================================${NC}"
    echo -e "${RED}❌ 数据库迁移失败${NC}"
    echo -e "${RED}==========================================${NC}"
    echo ""
    echo "请检查数据库连接和迁移文件"
    echo ""
    echo "手动调试命令:"
    echo "  ssh $SERVER_USER@$SERVER_IP"
    echo "  cd $DEPLOY_DIR"
    echo "  sudo docker-compose ps"
    echo "  sudo docker-compose logs postgres"
    echo ""
    echo "手动执行迁移:"
    echo "  sudo bash api-new/database/migrate.sh --docker-compose"
    exit 1
fi

echo -e "${GREEN}[7/7] 重新构建并重启服务...${NC}"
ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP" "cd $DEPLOY_DIR && sudo docker-compose up -d --build --force-recreate api"
echo -e "${GREEN}   ✅ 服务已重启${NC}"

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}🎉 更新部署完成!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "访问地址:"
echo "  - 前端: http://$SERVER_IP:6969"
echo "  - API: http://$SERVER_IP:6969/api/health"
echo ""
echo -e "${YELLOW}请测试登录功能确认更新成功${NC}"
echo ""
echo -e "${BLUE}查看日志:${NC}"
echo "  ssh $SERVER_USER@$SERVER_IP 'cd $DEPLOY_DIR && sudo docker-compose logs -f api'"
echo ""
echo -e "${BLUE}查看迁移记录:${NC}"
echo "  ssh $SERVER_USER@$SERVER_IP 'cd $DEPLOY_DIR && sudo docker-compose exec postgres psql -U pmsy -d pmsy -c \"SELECT filename, executed_at, execution_time_ms FROM schema_migrations ORDER BY executed_at DESC LIMIT 10;'\""
echo ""
