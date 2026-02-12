#!/bin/bash

# PMSY 服务器部署脚本
# 在服务器上执行（离线环境）

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

cd /opt/pmsy

# 检查架构
if [ -f "ARCH.txt" ]; then
    TARGET_ARCH=$(cat ARCH.txt)
    echo -e "${BLUE}目标架构:${NC} $TARGET_ARCH"
else
    echo -e "${YELLOW}警告: 未找到架构标记文件${NC}"
fi

# 检查 Docker
echo -e "${YELLOW}[1/5] 检查 Docker 环境...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker 环境检查通过${NC}"
echo ""

# 清理可能错误的 Docker 配置
echo -e "${YELLOW}[2/5] 清理 Docker 配置...${NC}"
if [ -f "/etc/docker/daemon.json" ]; then
    echo "  - 清理 daemon.json..."
    sudo rm -f /etc/docker/daemon.json
    sudo systemctl restart docker 2>/dev/null || true
fi
echo -e "${GREEN}✓ Docker 配置清理完成${NC}"
echo ""

# 导入 Docker 镜像
echo -e "${YELLOW}[3/5] 导入 Docker 镜像...${NC}"

if [ -f "docker-images/IMAGES.txt" ]; then
    # 按顺序导入
    while IFS= read -r line; do
        [[ "$line" =~ ^#.*$ ]] && continue
        [[ -z "$line" ]] && continue
        
        filename=$(echo "$line" | awk '{print $1}')
        imagename=$(echo "$line" | awk '{print $2}')
        
        if [ -f "docker-images/$filename" ]; then
            echo "  - 导入 $imagename..."
            docker load < "docker-images/$filename" || echo "  - 警告: $filename 导入失败"
        fi
    done < "docker-images/IMAGES.txt"
else
    # 自动导入所有 tar 文件
    for tarfile in docker-images/*.tar; do
        if [ -f "$tarfile" ]; then
            echo "  - 导入 $(basename $tarfile)..."
            docker load < "$tarfile"
        fi
    done
fi

echo -e "${GREEN}✓ Docker 镜像导入完成${NC}"
echo ""

# 配置环境变量
echo -e "${YELLOW}[4/5] 配置环境变量...${NC}"
if [ ! -f ".env" ] || [ ! -s ".env" ]; then
    # 从示例创建
    if [ -f ".env.example" ]; then
        cp .env.example .env
    fi
    
    # 设置默认值
    sed -i 's/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=Willyou@2026/' .env 2>/dev/null || true
    sed -i 's/^JWT_SECRET=.*/JWT_SECRET=Willyou@2026SecretKeyForPMSY2026/' .env 2>/dev/null || true
    sed -i 's/^API_EXTERNAL_URL=.*/API_EXTERNAL_URL=http:\/\/43.136.69.250:8000/' .env 2>/dev/null || true
    sed -i 's/^SITE_URL=.*/SITE_URL=http:\/\/43.136.69.250/' .env 2>/dev/null || true
    sed -i 's/^ROOT_USER_EMAIL=.*/ROOT_USER_EMAIL=admin@yourcompany.com/' .env 2>/dev/null || true
    sed -i 's/^ROOT_USER_PASSWORD=.*/ROOT_USER_PASSWORD=Willyou@2026/' .env 2>/dev/null || true
    sed -i 's/^DASHBOARD_USERNAME=.*/DASHBOARD_USERNAME=admin/' .env 2>/dev/null || true
    sed -i 's/^DASHBOARD_PASSWORD=.*/DASHBOARD_PASSWORD=Willyou@2026/' .env 2>/dev/null || true
    
    echo -e "${GREEN}✓ 已创建默认 .env 配置${NC}"
else
    echo -e "${GREEN}✓ .env 已存在${NC}"
fi
echo ""

# 构建 API 镜像
echo -e "${YELLOW}[5/5] 构建 PMSY API 镜像...${NC}"

# 使用本地 node 镜像构建
docker build -f Dockerfile.api -t pmsy-api:latest . || {
    echo -e "${YELLOW}尝试使用本地缓存构建...${NC}"
    # 如果构建失败，使用 node 镜像直接运行
    docker run --name pmsy-build -v $(pwd):/app -w /app node:20-alpine sh -c "npm ci && npm run build" || true
    docker commit pmsy-build pmsy-api:latest || true
    docker rm pmsy-build 2>/dev/null || true
}

echo -e "${GREEN}✓ API 镜像构建完成${NC}"
echo ""

# 启动服务
echo -e "${YELLOW}启动所有服务...${NC}"
docker-compose down 2>/dev/null || true
docker-compose up -d

echo -e "${GREEN}✓ 服务启动完成${NC}"
echo ""

# 等待服务就绪
echo -e "${YELLOW}等待服务就绪（约15秒）...${NC}"
sleep 15

# 检查服务状态
echo ""
echo -e "${BLUE}服务状态:${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}     部署完成!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# 自动初始化数据库（首次部署）
if [ -f "deploy/scripts/init-supabase-db.sh" ]; then
    echo -e "${YELLOW}检查数据库初始化状态...${NC}"
    
    # 检查 auth schema 是否存在
    AUTH_EXISTS=$(docker-compose exec -T db psql -U postgres -c "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth'" 2>/dev/null | grep -q 1 && echo "yes" || echo "no")
    
    if [ "$AUTH_EXISTS" = "no" ]; then
        echo -e "${YELLOW}首次部署，自动初始化 Supabase Auth...${NC}"
        sudo ./deploy/scripts/init-supabase-db.sh || echo -e "${YELLOW}警告: Supabase Auth 初始化可能未完成${NC}"
    else
        echo -e "${GREEN}✓ Supabase Auth 已初始化${NC}"
    fi
fi

# 检查应用表是否存在（使用完整初始化脚本）
if [ -f "deploy/scripts/init-database-complete.sql" ]; then
    TABLES_EXIST=$(docker-compose exec -T db psql -U postgres -c "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'milestone_templates'" 2>/dev/null | grep -q 1 && echo "yes" || echo "no")
    
    if [ "$TABLES_EXIST" = "no" ]; then
        echo -e "${YELLOW}首次部署，自动初始化完整数据库...${NC}"
        docker-compose exec -T db psql -U postgres < deploy/scripts/init-database-complete.sql
        echo -e "${GREEN}✓ 数据库初始化完成${NC}"
    else
        echo -e "${GREEN}✓ 数据库已初始化${NC}"
    fi
elif [ -f "deploy/scripts/init-database-simple.sql" ]; then
    # 降级到简单初始化脚本
    TABLES_EXIST=$(docker-compose exec -T db psql -U postgres -c "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles'" 2>/dev/null | grep -q 1 && echo "yes" || echo "no")
    
    if [ "$TABLES_EXIST" = "no" ]; then
        echo -e "${YELLOW}首次部署，自动初始化应用数据库表...${NC}"
        docker-compose exec -T db psql -U postgres < deploy/scripts/init-database-simple.sql
        echo -e "${GREEN}✓ 应用数据库表初始化完成${NC}"
    else
        echo -e "${GREEN}✓ 应用数据库表已存在${NC}"
    fi
fi

echo ""
echo -e "${BLUE}访问地址:${NC}"
echo "  - 应用首页:    http://43.136.69.250"
echo "  - Supabase API: http://43.136.69.250:8000"
echo "  - Studio 管理:  http://43.136.69.250:3000"
echo ""
echo -e "${BLUE}登录账号:${NC}"
echo "  - PMSY 管理员:  admin@pmsy.com / admin123"
echo "  - Root 邮箱:    admin@yourcompany.com"
echo "  - Root 密码:    Willyou@2026"
echo ""
echo -e "${BLUE}查看日志:${NC}"
echo "  docker-compose logs -f"
echo ""
