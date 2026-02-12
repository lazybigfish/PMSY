#!/bin/bash

# PMSY 服务器端部署脚本
# 在服务器上执行：拉取镜像并启动服务

set -e

echo "========================================="
echo "     PMSY 服务器部署"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REMOTE_DIR="/opt/pmsy"
cd "$REMOTE_DIR"

echo -e "${YELLOW}[1/3] 拉取 Docker 镜像...${NC}"
echo "这可能需要几分钟时间..."
echo ""

# 拉取所有镜像
docker