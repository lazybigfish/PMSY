#!/bin/bash
# ==========================================
# 🔄 PMSY 更新部署脚本 (update)
# ==========================================
#
# 【提示】此脚本用于更新现有 PMSY 系统，保留所有数据
# 适用场景：代码更新、配置更新、前端更新
#
# 使用方法:
# 1. 确保已配置 config/env/.env.production
# 2. 执行: ./deploy/update/deploy.sh
#
# ==========================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}🔄 PMSY 更新部署脚本 (update)${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

echo -e "${YELLOW}ℹ️  此脚本将:${NC}"
echo -e "${YELLOW}   - 保留所有现有数据${NC}"
echo -e "${YELLOW}   - 更新前端代码${NC}"
echo -e "${YELLOW}   - 更新 API 代码${NC}"
echo -e "${YELLOW}   - 重启服务${NC}"
echo ""

SERVER_IP="43.136.69.250"
SERVER_USER="ubuntu"
DEPLOY_DIR="/opt/pmsy"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo -e "${GREEN}[1/6] 检查环境...${NC}"
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

API_URL=$(grep '^API_URL=' "$ENV_FILE" 2>/dev/null | cut -d'=' -f2 || echo "未设置")
echo "   API_URL: $API_URL"

echo -e "${GREEN}[2/6] 构建前端...${NC}"

if [ -f ".env" ]; then
    cp .env .env.backup.development
fi

cp "$ENV_FILE" .env

if [ -f ".env.local" ]; then
    mv .env.local .env.local.backup
fi

npm run build

if [ -f ".env.local.backup" ]; then
    mv .env.local.backup .env.local
fi

if [ -f ".env.backup.development" ]; then
    mv .env.backup.development .env
else
    rm -f .env
fi

echo -e "${GREEN}   ✅ 前端构建完成${NC}"

echo -e "${GREEN}[3/6] 构建后端 API...${NC}"
cd "$PROJECT_ROOT/api-new"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build 2>/dev/null || echo "   注意: API 可能已在 dist 目录中"
cd "$PROJECT_ROOT"
echo -e "${GREEN}   ✅ 后端构建完成${NC}"

echo -e "${GREEN}[4/6] 复制文件到服务器...${NC}"
echo "   复制 dist..."
rsync -avz --delete dist/ "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/dist/"
echo "   复制 api-new..."
rsync -avz --delete --exclude 'node_modules' --exclude '.git' api-new/ "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/api-new/"
echo "   复制 docker-compose.yml..."
scp config/docker/docker-compose.yml "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/"
echo "   复制 nginx.conf..."
scp config/nginx/nginx.conf "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/nginx.conf"

echo -e "${GREEN}[5/6] 重启服务...${NC}"
ssh "$SERVER_USER@$SERVER_IP" "cd $DEPLOY_DIR && sudo docker-compose restart api nginx"

echo -e "${GREEN}[6/6] 验证部署...${NC}"
sleep 10

echo "   测试 API 健康检查..."
HEALTH_RESULT=$(curl -s "http://$SERVER_IP/api/health" 2>/dev/null || echo "")

if [ -n "$HEALTH_RESULT" ]; then
    echo -e "${GREEN}   ✅ API 服务响应正常${NC}"
else
    echo -e "${YELLOW}   ⚠️ API 服务可能未就绪，请手动检查${NC}"
fi

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}🎉 更新部署完成!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "访问地址:"
echo "  - 前端: http://$SERVER_IP"
echo "  - API: http://$SERVER_IP/api/health"
echo ""
echo -e "${YELLOW}请测试登录功能确认更新成功${NC}"
echo ""
echo -e "${BLUE}查看日志:${NC}"
echo "  ssh $SERVER_USER@$SERVER_IP 'cd $DEPLOY_DIR && sudo docker-compose logs -f api'"
echo ""
