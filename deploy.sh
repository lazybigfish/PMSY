#!/bin/bash
# ==========================================
# PMSY 部署脚本
# ==========================================
#
# 使用方法:
# 1. 确保已配置 .env.production
# 2. 执行: ./deploy.sh
#
# ==========================================

set -e

echo "=========================================="
echo "PMSY 部署脚本"
echo "=========================================="
echo ""

# 配置
SERVER_IP="43.136.69.250"
SERVER_USER="ubuntu"
DEPLOY_DIR="/opt/pmsy"

echo "[1/6] 检查环境..."
# 检查 .env.production 是否存在
if [ ! -f ".env.production" ]; then
    echo "❌ 错误: .env.production 文件不存在"
    echo "请创建 .env.production 文件，参考 .env.supabase"
    exit 1
fi

# 检查关键配置
SUPABASE_URL=$(grep VITE_SUPABASE_URL .env.production | cut -d'=' -f2)
if [[ "$SUPABASE_URL" == *"localhost"* ]] || [[ "$SUPABASE_URL" == *"supabase.co"* ]]; then
    echo "⚠️ 警告: VITE_SUPABASE_URL 可能配置错误: $SUPABASE_URL"
    echo "生产环境应该使用服务器 IP，如: http://$SERVER_IP:8000"
    read -p "是否继续? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "[2/6] 构建前端..."
# 使用生产环境配置构建
if [ -f ".env" ]; then
    mv .env .env.backup
fi
cp .env.production .env
npm run build
# 恢复开发环境配置
rm .env
if [ -f ".env.backup" ]; then
    mv .env.backup .env
fi

# 验证构建结果
echo "[3/6] 验证构建..."
if ! grep -q "$SERVER_IP:8000" dist/assets/*.js; then
    echo "❌ 错误: 构建文件未包含正确的 Supabase URL"
    echo "期望: $SERVER_IP:8000"
    echo "请检查 .env.production 配置"
    exit 1
fi
echo "✅ 构建验证通过"

echo "[4/6] 复制文件到服务器..."
# 复制必要文件
scp -r dist "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/"
scp docker-compose.yml "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/"
scp -r api "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/"
scp .env.supabase "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/"

echo "[5/6] 重启服务..."
ssh "$SERVER_USER@$SERVER_IP" "cd $DEPLOY_DIR && sudo docker-compose down && sudo docker-compose up -d"

echo "[6/6] 验证部署..."
sleep 10

# 测试用户创建 API
TEST_RESULT=$(curl -s -X POST "http://$SERVER_IP/api/auth/create-user" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtc3kiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3MDg2MzY5NCwiZXhwIjoyMDg2MjIzNjk0fQ.4asR7SimAk1UwthtIo5LD22qee5hsGAoZqDcwoQaSCw" \
  -H "Content-Type: application/json" \
  -d '{"username": "deploytest", "password": "Test@123456", "email": "deploytest@pmsy.com"}' | head -c 50)

if [[ "$TEST_RESULT" == *"success":true* ]]; then
    echo "✅ 用户创建 API 测试通过"
else
    echo "⚠️ 用户创建 API 测试可能失败，请手动验证"
    echo "响应: $TEST_RESULT"
fi

echo ""
echo "=========================================="
echo "部署完成!"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  - 前端: http://$SERVER_IP"
echo "  - Studio: http://$SERVER_IP:3000"
echo "  - API: http://$SERVER_IP:8000"
echo ""
echo "请测试登录功能确认部署成功"
echo ""
