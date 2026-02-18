#!/bin/bash
# ==========================================
# 🔄 PMSY 开发环境一键重启脚本
# ==========================================
#
# 功能：先停止所有服务，编译代码，然后重新启动
# 使用方法: ./deploy/dev-scripts/restart-dev.sh
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

echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}🔄 PMSY 开发环境重启脚本${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# 第一步：停止所有服务
echo -e "${CYAN}📍 步骤 1/3: 停止所有服务${NC}"
"$SCRIPT_DIR/stop-dev.sh"

echo ""
echo -e "${CYAN}⏳ 等待 2 秒确保服务完全停止...${NC}"
sleep 2
echo ""

# 第二步：编译后端
echo -e "${CYAN}📍 步骤 2/3: 编译后端代码${NC}"
cd "$PROJECT_DIR/api-new"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  ⚠️  后端依赖未安装，正在安装...${NC}"
    npm install
fi

echo -e "${CYAN}  🔨 正在编译后端 TypeScript...${NC}"
if npm run build; then
    echo -e "${GREEN}  ✅ 后端编译成功${NC}"
else
    echo -e "${RED}  ❌ 后端编译失败，请检查错误信息${NC}"
    exit 1
fi
echo ""

# 第三步：启动所有服务
echo -e "${CYAN}📍 步骤 3/3: 启动所有服务${NC}"
"$SCRIPT_DIR/start-dev.sh"

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ 重启完成！${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
