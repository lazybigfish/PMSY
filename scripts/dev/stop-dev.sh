#!/bin/bash

# PMSY 开发环境停止脚本
# 统一停止所有开发服务

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

# 停止指定端口的服务
stop_service_by_port() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_info "停止 $service_name (端口: $port)..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        print_success "$service_name 已停止"
    else
        print_warning "$service_name (端口: $port) 未运行"
    fi
}

# 停止 Docker 服务
stop_docker_services() {
    print_info "检查 Docker 服务..."
    
    cd "$API_DIR"
    
    # 检查是否有容器在运行
    if docker-compose ps 2>/dev/null | grep -q "Up"; then
        print_info "停止 Docker 容器..."
        docker-compose down
        print_success "Docker 容器已停止"
    else
        print_warning "没有运行的 Docker 容器"
    fi
}

# 主函数
main() {
    echo "========================================"
    echo "PMSY 开发环境停止脚本"
    echo "========================================"
    echo ""
    
    # 停止前端服务
    stop_service_by_port 5173 "前端服务"
    
    # 停止 API 服务
    stop_service_by_port 3001 "API 服务"
    
    echo ""
    
    # 询问是否停止 Docker 服务
    read -p "是否同时停止 Docker 基础设施服务 (PostgreSQL, Redis, MinIO)? [y/N]: " answer
    if [[ $answer =~ ^[Yy]$ ]]; then
        echo ""
        stop_docker_services
    fi
    
    echo ""
    echo "========================================"
    print_success "开发环境已停止"
    echo "========================================"
}

# 执行主函数
main "$@"
