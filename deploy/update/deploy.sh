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

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 配置
SERVER_IP="43.136.69.250"
SERVER_USER="ubuntu"
DEPLOY_DIR="/opt/pmsy"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo -e "${GREEN}[1/7] 检查环境...${NC}"
cd "$PROJECT_ROOT"

# 检查 config/env/.env.production 是否存在
ENV_FILE=""
if [ -f "config/env/.env.production" ]; then
    ENV_FILE="config/env/.env.production"
elif [ -f ".env.production" ]; then
    ENV_FILE=".env.production"
else
    echo -e "${YELLOW}❌ 错误: 未找到 .env.production 文件${NC}"
    echo "请创建 config/env/.env.production 文件，参考 config/env/.env.supabase"
    exit 1
fi

# 检查关键配置
SUPABASE_URL=$(grep VITE_SUPABASE_URL "$ENV_FILE" | cut -d'=' -f2)
if [[ "$SUPABASE_URL" == *"localhost"* ]] || [[ "$SUPABASE_URL" == *"supabase.co"* ]]; then
    echo -e "${YELLOW}⚠️ 警告: VITE_SUPABASE_URL 配置可能错误: $SUPABASE_URL${NC}"
    echo "生产环境应该使用服务器 IP: http://$SERVER_IP:8000"
    read -p "是否继续? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}[2/7] 备份当前环境...${NC}"
if [ -f ".env" ]; then
    cp .env .env.backup.development
    echo "   已备份 .env 为 .env.backup.development"
fi

echo -e "${GREEN}[3/7] 构建前端...${NC}"
# 使用生产环境配置构建
cp "$ENV_FILE" .env
npm run build

# 恢复开发环境配置
if [ -f ".env.backup.development" ]; then
    mv .env.backup.development .env
else
    rm -f .env
fi

echo -e "${GREEN}[4/7] 验证构建...${NC}"
if ! grep -q "$SERVER_IP:8000" dist/assets/*.js; then
    echo -e "${YELLOW}❌ 错误: 构建文件未包含正确的 Supabase URL${NC}"
    echo "期望: $SERVER_IP:8000"
    echo "请检查 $ENV_FILE 配置"
    exit 1
fi
echo -e "${GREEN}   ✅ 构建验证通过${NC}"

echo -e "${GREEN}[5/7] 复制文件到服务器...${NC}"
# 复制必要文件
echo "   复制 dist..."
scp -r dist "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/"
echo "   复制 api..."
scp -r api "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/"
echo "   复制 docker-compose.yml..."
scp config/docker/docker-compose.yml "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/"

echo -e "${GREEN}[6/7] 重启服务...${NC}"
ssh "$SERVER_USER@$SERVER_IP" "cd $DEPLOY_DIR && sudo docker-compose restart"

echo -e "${GREEN}[7/7] 验证部署...${NC}"
sleep 10

# 获取 ANON_KEY
ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY "$ENV_FILE" | cut -d'=' -f2)

# 测试用户创建 API
TEST_RESULT=$(curl -s -X POST "http://$SERVER_IP/api/auth/create-user" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username": "updatetest", "password": "Test@123456", "email": "updatetest@pmsy.com"}' 2>/dev/null || echo "")

if [[ "$TEST_RESULT" == *"success":true* ]]; then
    echo -e "${GREEN}   ✅ 用户创建 API 测试通过${NC}"
else
    echo -e "${YELLOW}   ⚠️ 用户创建 API 测试可能失败，请手动验证${NC}"
    echo "   响应: $TEST_RESULT"
fi

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}🎉 更新部署完成!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "访问地址:"
echo "  - 前端: http://$SERVER_IP"
echo "  - Studio: http://$SERVER_IP:3000"
echo "  - API: http://$SERVER_IP:8000"
echo ""
echo -e "${YELLOW}请测试登录功能确认更新成功${NC}"
echo ""
