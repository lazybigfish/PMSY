#!/bin/bash
# ==========================================
# 🚀 PMSY 开发环境一键启动脚本
# ==========================================
#
# 功能：编译并启动后端 API 服务和前端开发服务器
# 使用方法: ./deploy/dev-scripts/start-dev.sh
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

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}🚀 PMSY 开发环境启动脚本${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

cd "$PROJECT_DIR"

# 检查端口占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 编译后端服务
build_backend() {
    echo -e "${CYAN}[0/2] 编译后端 API 服务...${NC}"
    cd "$PROJECT_DIR/api-new"
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}  ⚠️  后端依赖未安装，正在安装...${NC}"
        npm install
    fi
    
    echo -e "${CYAN}  🔨 正在编译 TypeScript...${NC}"
    if npm run build; then
        echo -e "${GREEN}  ✅ 后端编译成功${NC}"
    else
        echo -e "${RED}  ❌ 后端编译失败，请检查错误信息${NC}"
        exit 1
    fi
    echo ""
}

# 启动后端服务
start_backend() {
    echo -e "${CYAN}[1/2] 启动后端 API 服务...${NC}"
    if check_port 3001; then
        echo -e "${YELLOW}  ⚠️  端口 3001 已被占用，后端服务可能已在运行${NC}"
        echo -e "${YELLOW}  🔄 尝试重启后端服务...${NC}"
        # 停止现有服务
        PID=$(lsof -Pi :3001 -sTCP:LISTEN -t 2>/dev/null || echo "")
        if [ -n "$PID" ]; then
            kill $PID 2>/dev/null || true
            sleep 2
        fi
    fi
    
    echo -e "${GREEN}  ✅ 启动后端服务 (http://localhost:3001)${NC}"
    cd "$PROJECT_DIR/api-new"
    npm start > /tmp/pmsy-api.log 2>&1 &
    echo $! > /tmp/pmsy-api.pid
    
    # 等待后端启动
    echo -e "${CYAN}  ⏳ 等待后端服务启动...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:3001/health >/dev/null 2>&1; then
            echo -e "${GREEN}  ✅ 后端服务已就绪${NC}"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo -e "${RED}  ❌ 后端服务启动超时，请检查日志: /tmp/pmsy-api.log${NC}"
            exit 1
        fi
    done
}

# 启动前端服务
start_frontend() {
    echo ""
    echo -e "${CYAN}[2/2] 启动前端开发服务器...${NC}"
    if check_port 5173; then
        echo -e "${YELLOW}  ⚠️  端口 5173 已被占用，前端服务可能已在运行${NC}"
        echo -e "${YELLOW}  🔄 尝试重启前端服务...${NC}"
        # 停止现有服务
        PID=$(lsof -Pi :5173 -sTCP:LISTEN -t 2>/dev/null || echo "")
        if [ -n "$PID" ]; then
            kill $PID 2>/dev/null || true
            sleep 2
        fi
    fi
    
    cd "$PROJECT_DIR"
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}  ⚠️  前端依赖未安装，正在安装...${NC}"
        npm install
    fi
    
    echo -e "${GREEN}  ✅ 启动前端服务${NC}"
    npm run client:dev > /tmp/pmsy-client.log 2>&1 &
    echo $! > /tmp/pmsy-client.pid
    
    # 等待前端启动
    echo -e "${CYAN}  ⏳ 等待前端服务启动...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:5173/ >/dev/null 2>&1 || curl -s http://localhost:5174/ >/dev/null 2>&1; then
            echo -e "${GREEN}  ✅ 前端服务已就绪${NC}"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo -e "${RED}  ❌ 前端服务启动超时，请检查日志: /tmp/pmsy-client.log${NC}"
            exit 1
        fi
    done
}

# 显示完成信息
show_completion() {
    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}🎉 开发环境启动完成！${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""
    echo "访问地址:"
    echo "  - 前端: http://localhost:5173 (或 http://localhost:5174)"
    echo "  - 后端: http://localhost:3001"
    echo ""
    echo "查看日志:"
    echo "  - 后端日志: tail -f /tmp/pmsy-api.log"
    echo "  - 前端日志: tail -f /tmp/pmsy-client.log"
    echo ""
    echo "停止服务:"
    echo "  ./deploy/dev-scripts/stop-dev.sh"
    echo ""
}

# 主流程
main() {
    # 编译后端
    build_backend
    
    # 启动后端
    start_backend
    
    # 启动前端
    start_frontend
    
    # 显示完成信息
    show_completion
}

# 执行主函数
main "$@"
