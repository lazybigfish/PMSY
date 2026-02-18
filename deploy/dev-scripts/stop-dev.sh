#!/bin/bash
# ==========================================
# 🛑 PMSY 开发环境一键停止脚本
# ==========================================
#
# 功能：停止后端 API 服务和前端开发服务器
# 使用方法: ./deploy/dev-scripts/stop-dev.sh
#
# ==========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}🛑 PMSY 开发环境停止脚本${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# 停止后端服务
echo -e "${CYAN}[1/2] 停止后端 API 服务...${NC}"
if [ -f /tmp/pmsy-api.pid ]; then
    PID=$(cat /tmp/pmsy-api.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID 2>/dev/null || true
        echo -e "${GREEN}  ✅ 后端服务已停止 (PID: $PID)${NC}"
    else
        echo -e "${YELLOW}  ⚠️  后端服务进程不存在${NC}"
    fi
    rm -f /tmp/pmsy-api.pid
else
    # 尝试通过端口查找进程
    PID=$(lsof -Pi :3001 -sTCP:LISTEN -t 2>/dev/null || echo "")
    if [ -n "$PID" ]; then
        kill $PID 2>/dev/null || true
        echo -e "${GREEN}  ✅ 后端服务已停止 (PID: $PID)${NC}"
    else
        echo -e "${YELLOW}  ⚠️  未找到后端服务进程${NC}"
    fi
fi
echo ""

# 停止前端服务
echo -e "${CYAN}[2/2] 停止前端开发服务器...${NC}"
if [ -f /tmp/pmsy-client.pid ]; then
    PID=$(cat /tmp/pmsy-client.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID 2>/dev/null || true
        echo -e "${GREEN}  ✅ 前端服务已停止 (PID: $PID)${NC}"
    else
        echo -e "${YELLOW}  ⚠️  前端服务进程不存在${NC}"
    fi
    rm -f /tmp/pmsy-client.pid
else
    # 尝试通过端口查找进程
    PID=$(lsof -Pi :5173 -sTCP:LISTEN -t 2>/dev/null || echo "")
    if [ -n "$PID" ]; then
        kill $PID 2>/dev/null || true
        echo -e "${GREEN}  ✅ 前端服务已停止 (PID: $PID)${NC}"
    else
        # 尝试 5174 端口
        PID=$(lsof -Pi :5174 -sTCP:LISTEN -t 2>/dev/null || echo "")
        if [ -n "$PID" ]; then
            kill $PID 2>/dev/null || true
            echo -e "${GREEN}  ✅ 前端服务已停止 (PID: $PID)${NC}"
        else
            echo -e "${YELLOW}  ⚠️  未找到前端服务进程${NC}"
        fi
    fi
fi
echo ""

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}🎉 开发环境已停止${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "启动服务:"
echo "  ./deploy/dev-scripts/start-dev.sh"
echo ""
