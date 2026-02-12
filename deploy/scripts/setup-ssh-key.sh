#!/bin/bash

# PMSY SSH Key 设置脚本
# 配置免密码登录（推荐方式）

echo "========================================="
echo "     配置 SSH 免密码登录"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取项目根目录（脚本在 deploy/scripts/ 下）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"

# 加载配置
if [ -f "deploy/scripts/deploy-config.sh" ]; then
    source deploy/scripts/deploy-config.sh
fi

# 如果没有配置，询问
if [ -z "$SERVER_IP" ] || [ -z "$SERVER_USER" ]; then
    echo -e "${YELLOW}请输入服务器信息:${NC}"
    read -p "服务器 IP: " SERVER_IP
    read -p "用户名: " SERVER_USER
fi

echo -e "${BLUE}服务器:${NC} $SERVER_USER@$SERVER_IP"
echo ""

# 检查是否已有 SSH Key
if [ -f "$HOME/.ssh/id_rsa" ]; then
    echo -e "${GREEN}✓ SSH Key 已存在${NC}"
else
    echo -e "${YELLOW}生成新的 SSH Key...${NC}"
    ssh-keygen -t rsa -b 4096 -C "pmsy-deploy" -f "$HOME/.ssh/id_rsa" -N ""
    echo -e "${GREEN}✓ SSH Key 生成完成${NC}"
fi
echo ""

# 复制公钥到服务器
echo -e "${YELLOW}复制公钥到服务器...${NC}"
echo "需要输入服务器密码（仅一次）:"
ssh-copy-id -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SSH Key 复制成功${NC}"
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}     配置完成!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "${BLUE}测试连接:${NC}"
    ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "echo 'SSH 免密码登录成功!'"
    echo ""
    echo -e "${YELLOW}现在可以免密码部署了:${NC}"
    echo "  ./prepare-deploy.sh"
    echo "  ./transfer-to-server.sh"
else
    echo -e "${RED}✗ SSH Key 复制失败${NC}"
    exit 1
fi
