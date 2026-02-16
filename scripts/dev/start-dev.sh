#!/bin/bash

# PMSY 开发环境启动脚本
# 统一启动所有开发服务，避免终端复用问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/Users/liiiiins/Downloads/文稿 - liiiiins 的 MacBook Pro/Mweb/PMSY"
API_DIR="$PROJECT_ROOT/api-new"
FRONTEND_DIR="$PROJECT_ROOT"

# 日志文件
LOG_DIR="$PROJECT_ROOT/logs"
API_LOG="$LOG_DIR/api-dev.log"
FRONTEND_LOG="$LOG_DIR/frontend-dev.log"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 检查 Docker 服务状态
check_docker_services() {
    print_info "检查 Docker 基础设施服务..."
    
    cd "$API_DIR"
    
    # 检查 postgres
    if docker-compose ps | grep -q "pmsy-postgres.*Up"; then
        print_success "PostgreSQL 正在运行 (端口: 5432)"
    else
        print_warning "PostgreSQL 未运行，正在启动..."
        docker-compose up -d postgres
        sleep 3
    fi
    
    # 检查 redis
    if docker-compose ps | grep -q "pmsy-redis.*Up"; then
        print_success "Redis 正在运行 (端口: 6379)"
    else
        print_warning "Redis 未运行，正在启动..."
        docker-compose up -d redis
        sleep 2
    fi
    
    # 检查 minio
    if docker-compose ps | grep -q "pmsy-minio.*Up"; then
        print_success "MinIO 正在运行 (端口: 9000/9001)"
    else
        print_warning "MinIO 未运行，正在启动..."
        docker-compose up -d minio
        sleep 3
    fi
}

# 停止现有服务
stop_existing_services() {
    print_info "检查并停止现有服务..."
    
    # 停止 API 服务
    if check_port 3001; then
        print_warning "端口 3001 被占用，正在停止现有 API 服务..."
        lsof -ti:3001 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
    
    # 停止前端服务
    if check_port 5173; then
        print_warning "端口 5173 被占用，正在停止现有前端服务..."
        lsof -ti:5173 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
    
    print_success "已清理现有服务"
}

# 启动 API 服务
start_api() {
    print_info "启动 API 服务..."
    
    cd "$API_DIR"
    
    # 使用 nohup 在后台启动，避免终端复用问题
    nohup npm run dev > "$API_LOG" 2>&1 &
    API_PID=$!
    
    # 等待服务启动
    print_info "等待 API 服务启动..."
    for i in {1..30}; do
        if curl -s http://localhost:3001/health > /dev/null 2>&1; then
            print_success "API 服务已启动 (PID: $API_PID, 端口: 3001)"
            return 0
        fi
        sleep 1
    done
    
    print_error "API 服务启动超时，请检查日志: $API_LOG"
    return 1
}

# 启动前端服务
start_frontend() {
    print_info "启动前端服务..."
    
    cd "$FRONTEND_DIR"
    
    # 使用 nohup 在后台启动，避免终端复用问题
    nohup npm run client:dev > "$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    
    # 等待服务启动
    print_info "等待前端服务启动..."
    for i in {1..30}; do
        if check_port 5173; then
            print_success "前端服务已启动 (PID: $FRONTEND_PID, 端口: 5173)"
            return 0
        fi
        sleep 1
    done
    
    print_error "前端服务启动超时，请检查日志: $FRONTEND_LOG"
    return 1
}

# 显示服务状态
show_status() {
    echo ""
    echo "========================================"
    echo -e "${GREEN}开发环境启动完成！${NC}"
    echo "========================================"
    echo ""
    echo "服务访问地址:"
    echo -e "  • 前端应用: ${BLUE}http://localhost:5173/${NC}"
    echo -e "  • API 服务: ${BLUE}http://localhost:3001${NC}"
    echo -e "  • 健康检查: ${BLUE}http://localhost:3001/health${NC}"
    echo -e "  • MinIO 控制台: ${BLUE}http://localhost:9001${NC} (minioadmin/minioadmin)"
    echo ""
    echo "日志文件:"
    echo -e "  • API 日志: ${YELLOW}$API_LOG${NC}"
    echo -e "  • 前端日志: ${YELLOW}$FRONTEND_LOG${NC}"
    echo ""
    echo "常用命令:"
    echo -e "  • 查看 API 日志: ${YELLOW}tail -f $API_LOG${NC}"
    echo -e "  • 查看前端日志: ${YELLOW}tail -f $FRONTEND_LOG${NC}"
    echo -e "  • 停止所有服务: ${YELLOW}./scripts/dev/stop-dev.sh${NC}"
    echo ""
}

# 主函数
main() {
    echo "========================================"
    echo "PMSY 开发环境启动脚本"
    echo "========================================"
    echo ""
    
    # 检查并停止现有服务
    stop_existing_services
    
    # 检查并启动 Docker 服务
    check_docker_services
    
    echo ""
    
    # 启动 API 服务
    start_api
    
    echo ""
    
    # 启动前端服务
    start_frontend
    
    echo ""
    
    # 显示状态
    show_status
}

# 执行主函数
main "$@"
