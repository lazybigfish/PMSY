#!/bin/bash

# PMSY 部署包准备脚本
# 支持 AMD64/ARM64 双架构，带本地缓存机制

set -e

echo "========================================="
echo "     PMSY 部署包准备"
echo "     支持 AMD64/ARM64 双架构"
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

# 加载配置文件
if [ -f "deploy/scripts/deploy-config.sh" ]; then
    source deploy/scripts/deploy-config.sh
fi

# 检查镜像获取方式
if [ "$IMAGE_SOURCE" = "remote" ]; then
    echo -e "${GREEN}服务器拉取模式：跳过本地镜像下载${NC}"
    echo ""
fi

# 询问目标架构（如果配置文件未设置）
if [ -z "$TARGET_ARCH" ]; then
    echo -e "${BLUE}请选择目标服务器架构:${NC}"
    echo "  1) AMD64 (x86_64) - Intel/AMD CPU 服务器"
    echo "  2) ARM64 (aarch64) - ARM 服务器/Apple Silicon"
    echo ""
    read -p "请输入选择 (1 或 2): " ARCH_CHOICE
    
    case $ARCH_CHOICE in
        1)
            TARGET_ARCH="amd64"
            ;;
        2)
            TARGET_ARCH="arm64"
            ;;
        *)
            echo -e "${RED}错误: 无效选择${NC}"
            exit 1
            ;;
    esac
fi

# 设置 Docker 平台
if [ "$TARGET_ARCH" = "amd64" ]; then
    DOCKER_PLATFORM="linux/amd64"
    echo -e "${GREEN}已选择: AMD64 架构${NC}"
elif [ "$TARGET_ARCH" = "arm64" ]; then
    DOCKER_PLATFORM="linux/arm64"
    echo -e "${GREEN}已选择: ARM64 架构${NC}"
else
    echo -e "${RED}错误: 无效的架构 $TARGET_ARCH${NC}"
    exit 1
fi

echo ""

# 检查本地缓存
echo -e "${YELLOW}[1/6] 检查本地缓存...${NC}"
CACHE_DIR="deploy/cache/docker-images-$TARGET_ARCH"
CACHE_VALID=false
CACHE_INFO_FILE="$CACHE_DIR/.cache_info"

# 定义镜像列表和版本
IMAGES=(
    "supabase/postgres:15.1.1.78"
    "supabase/gotrue:v2.158.1"
    "supabase/studio:20240701-05dfbec"
    "postgrest/postgrest:v12.2.0"
    "supabase/realtime:v2.28.32"
    "supabase/storage-api:v1.0.6"
    "supabase/postgres-meta:v0.80.0"
    "supabase/logflare:1.4.0"
    "kong:2.8.1"
    "darthsim/imgproxy:v3.8.0"
    "nginx:alpine"
    "node:20-alpine"
)

# 检查缓存是否有效
if [ -f "$CACHE_INFO_FILE" ]; then
    echo -e "${BLUE}发现本地缓存，检查完整性...${NC}"
    CACHE_VALID=true
    MISSING_IMAGES=()
    
    for image in "${IMAGES[@]}"; do
        # 从镜像名提取 tar 文件名
        tarname=$(echo "$image" | tr '/:' '_').tar
        if [ ! -f "$CACHE_DIR/$tarname" ]; then
            echo -e "  ${YELLOW}缺失: $image${NC}"
            CACHE_VALID=false
            MISSING_IMAGES+=("$image")
        fi
    done
    
    if [ "$CACHE_VALID" = true ]; then
        echo -e "${GREEN}✓ 本地缓存完整，跳过下载${NC}"
        echo ""
        SKIP_DOWNLOAD=true
    else
        echo -e "${YELLOW}缓存不完整，需要重新下载${NC}"
        echo ""
        SKIP_DOWNLOAD=false
    fi
else
    echo -e "${YELLOW}未找到本地缓存${NC}"
    echo ""
    SKIP_DOWNLOAD=false
fi

# 检查 Docker
if [ "$SKIP_DOWNLOAD" != true ]; then
    echo -e "${YELLOW}[2/6] 检查 Docker 环境...${NC}"
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: Docker 未安装${NC}"
        echo "请先安装 Docker Desktop"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker 环境检查通过${NC}"
    echo ""
fi

# 构建前端
echo -e "${YELLOW}[3/6] 构建前端...${NC}"
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# 下载 Docker 镜像（如果需要且不是服务器拉取模式）
if [ "$IMAGE_SOURCE" = "remote" ]; then
    echo -e "${YELLOW}[4/6] 跳过镜像下载（服务器将自动拉取）${NC}"
    echo ""
elif [ "$SKIP_DOWNLOAD" != true ]; then
    echo -e "${YELLOW}[4/6] 下载 Docker 镜像 ($TARGET_ARCH)...${NC}"
    echo "这可能需要较长时间（约2-3GB），请耐心等待..."
    echo ""
    
    mkdir -p "$CACHE_DIR"
    
    # 下载每个镜像
    for image in "${IMAGES[@]}"; do
        echo "  - 下载 $image ($TARGET_ARCH)..."
        docker pull --platform $DOCKER_PLATFORM $image
    done
    
    echo -e "${GREEN}✓ Docker 镜像下载完成${NC}"
    echo ""
    
    # 保存镜像
    echo -e "${YELLOW}[5/6] 保存 Docker 镜像到缓存...${NC}"
    
    for image in "${IMAGES[@]}"; do
        tarname=$(echo "$image" | tr '/:' '_').tar
        echo "  - 保存 $image..."
        docker save "$image" > "$CACHE_DIR/$tarname"
    done
    
    # 创建缓存信息文件
    cat > "$CACHE_INFO_FILE" << EOF
# PMSY Docker 镜像缓存
# 架构: $TARGET_ARCH
# 创建时间: $(date)
# Docker 版本: $(docker --version)

$(for img in "${IMAGES[@]}"; do echo "$img"; done)
EOF
    
    echo -e "${GREEN}✓ Docker 镜像保存完成${NC}"
    echo ""
else
    echo -e "${YELLOW}[4/6] 跳过镜像下载（使用缓存）${NC}"
    echo -e "${YELLOW}[5/6] 跳过镜像保存（使用缓存）${NC}"
    echo ""
fi

# 准备部署目录
echo -e "${YELLOW}[6/6] 准备部署文件...${NC}"

# 创建临时部署目录（放在 deploy/cache/ 下）
DEPLOY_DIR="deploy/cache/pmsy-deploy-$TARGET_ARCH"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# 复制镜像（使用硬链接或复制）
if [ "$SKIP_DOWNLOAD" != true ]; then
    echo "  - 复制 Docker 镜像..."
    cp -r "$CACHE_DIR" $DEPLOY_DIR/docker-images
else
    echo "  - 跳过镜像复制（服务器将自动拉取）"
    mkdir -p $DEPLOY_DIR/docker-images
fi

# 复制应用文件
echo "  - 复制应用文件..."
cp -r dist $DEPLOY_DIR/
cp -r api $DEPLOY_DIR/
cp package*.json $DEPLOY_DIR/
cp config/docker/Dockerfile.api $DEPLOY_DIR/
cp config/docker/docker-compose.yml $DEPLOY_DIR/
cp config/nginx/nginx.conf $DEPLOY_DIR/
cp config/env/.env.example $DEPLOY_DIR/.env
cp deploy.sh $DEPLOY_DIR/
chmod +x $DEPLOY_DIR/deploy.sh

# 复制数据库 migrations 和初始化脚本
echo "  - 复制数据库 migrations..."
mkdir -p $DEPLOY_DIR/supabase/migrations
cp -r supabase/migrations/*.sql $DEPLOY_DIR/supabase/migrations/ 2>/dev/null || echo "    警告: 未找到 migrations 文件"

echo "  - 复制数据库初始化脚本..."
mkdir -p $DEPLOY_DIR/deploy/scripts
# 优先复制完整初始化脚本
cp deploy/scripts/init-database-complete.sql $DEPLOY_DIR/deploy/scripts/ 2>/dev/null || echo "    警告: 未找到 init-database-complete.sql"
# 降级复制简单初始化脚本（备用）
cp deploy/scripts/init-database-simple.sql $DEPLOY_DIR/deploy/scripts/ 2>/dev/null || echo "    警告: 未找到 init-database-simple.sql"
cp deploy/scripts/init-supabase-db.sh $DEPLOY_DIR/deploy/scripts/ 2>/dev/null || echo "    警告: 未找到 init-supabase-db.sh"
chmod +x $DEPLOY_DIR/deploy/scripts/*.sh 2>/dev/null || true

# 创建架构标记
echo $TARGET_ARCH > $DEPLOY_DIR/ARCH.txt

# 创建镜像列表文件（用于导入）
cat > $DEPLOY_DIR/docker-images/IMAGES.txt << EOF
# Docker 镜像列表 ($TARGET_ARCH 架构)
# 按顺序导入

$(for img in "${IMAGES[@]}"; do
    tarname=$(echo "$img" | tr '/:' '_').tar
    echo "$tarname $img"
done)
EOF

echo -e "${GREEN}✓ 部署文件准备完成${NC}"
echo ""

# 计算大小
PACKAGE_SIZE=$(du -sh $DEPLOY_DIR | cut -f1)
CACHE_SIZE=$(du -sh $CACHE_DIR 2>/dev/null | cut -f1 || echo "N/A")

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}     部署包准备完成!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${BLUE}架构:${NC} $TARGET_ARCH"
echo -e "${BLUE}部署目录:${NC} $DEPLOY_DIR/"
echo -e "${BLUE}部署包大小:${NC} $PACKAGE_SIZE"
echo -e "${BLUE}本地缓存:${NC} $CACHE_DIR/ ($CACHE_SIZE)"
echo ""

if [ "$SKIP_DOWNLOAD" = true ]; then
    echo -e "${GREEN}✓ 使用了本地缓存，未重新下载镜像${NC}"
else
    echo -e "${YELLOW}✓ 已下载新镜像并更新缓存${NC}"
fi

echo ""
echo -e "${YELLOW}下一步: 传输到服务器${NC}"
echo ""
echo "  1. 确保服务器信息已配置:"
echo "     nano deploy-config.sh"
echo ""
echo "  2. 执行传输:"
echo "     ./transfer-to-server.sh"
echo ""
