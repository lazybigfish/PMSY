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
    echo "生产环境应该使用服务器 IP: http://$SERVER_IP"
    read -p "是否继续? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ==========================================
# 关键：验证 Key 与 JWT_SECRET 匹配
# ==========================================
echo -e "${GREEN}[1.5/7] 验证 JWT Key...${NC}"

# 读取 JWT_SECRET 和 Key
JWT_SECRET=$(grep "^JWT_SECRET=" config/env/.env.supabase 2>/dev/null | cut -d'=' -f2)
ANON_KEY=$(grep "^VITE_SUPABASE_ANON_KEY=" "$ENV_FILE" | cut -d'=' -f2)

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
if [ -n "$JWT_SECRET" ] && [ -n "$ANON_KEY" ]; then
    if ! verify_jwt "$ANON_KEY" "$JWT_SECRET"; then
        echo -e "${YELLOW}⚠️ 警告: ANON_KEY 与 JWT_SECRET 不匹配${NC}"
        echo ""
        
        # 检查生成脚本是否存在
        if [ -f "deploy/scripts/generate-jwt-keys.sh" ]; then
            echo -e "${YELLOW}正在自动重新生成 Key...${NC}"
            ./deploy/scripts/generate-jwt-keys.sh "$JWT_SECRET"
            
            # 重新读取 Key
            ANON_KEY=$(grep "^VITE_SUPABASE_ANON_KEY=" "$ENV_FILE" | cut -d'=' -f2)
            
            echo ""
            echo -e "${YELLOW}⚠️  重要: Key 已更新，将重新构建前端${NC}"
            echo ""
        else
            echo -e "${RED}❌ 错误: Key 生成脚本不存在${NC}"
            echo "   请手动运行: ./deploy/scripts/generate-jwt-keys.sh"
            exit 1
        fi
    else
        echo -e "${GREEN}   ✅ Key 验证通过${NC}"
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

# 备份并移除 .env.local（Vite 会优先使用它）
if [ -f ".env.local" ]; then
    mv .env.local .env.local.backup
    echo "   已备份 .env.local（避免覆盖生产配置）"
fi

npm run build

# 恢复 .env.local
if [ -f ".env.local.backup" ]; then
    mv .env.local.backup .env.local
    echo "   已恢复 .env.local"
fi

# 恢复开发环境配置
if [ -f ".env.backup.development" ]; then
    mv .env.backup.development .env
else
    rm -f .env
fi

echo -e "${GREEN}[4/7] 验证构建...${NC}"
if ! grep -q "$SERVER_IP" dist/assets/*.js; then
    echo -e "${YELLOW}❌ 错误: 构建文件未包含正确的 Supabase URL${NC}"
    echo "期望: $SERVER_IP"
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
echo "  - API: http://$SERVER_IP"
echo ""
echo -e "${YELLOW}请测试登录功能确认更新成功${NC}"
echo ""
