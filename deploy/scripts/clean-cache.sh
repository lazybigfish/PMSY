#!/bin/bash

# PMSY 缓存管理脚本
# 用于清理或重建本地缓存

echo "========================================="
echo "     PMSY 缓存管理"
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

echo -e "${BLUE}选择操作:${NC}"
echo "  1) 查看缓存状态"
echo "  2) 清理 AMD64 缓存"
echo "  3) 清理 ARM64 缓存"
echo "  4) 清理所有缓存"
echo "  5) 强制重新下载（清理+准备）"
echo ""
read -p "请输入选择 (1-5): " CHOICE

case $CHOICE in
    1)
        echo ""
        echo -e "${BLUE}缓存状态:${NC}"
        echo ""
        
        for arch in amd64 arm64; do
            cache_dir="deploy/cache/docker-images-$arch"
            if [ -d "$cache_dir" ]; then
                size=$(du -sh "$cache_dir" 2>/dev/null | cut -f1)
                count=$(ls -1 "$cache_dir"/*.tar 2>/dev/null | wc -l)
                echo -e "  ${GREEN}$arch:${NC} $size, $count 个镜像"
                
                if [ -f "$cache_dir/.cache_info" ]; then
                    echo "    创建时间: $(head -3 "$cache_dir/.cache_info" | tail -1 | cut -d: -f2)"
                fi
            else
                echo -e "  ${YELLOW}$arch:${NC} 无缓存"
            fi
        done
        echo ""
        ;;
    2)
        echo ""
        if [ -d "deploy/cache/docker-images-amd64" ]; then
            rm -rf deploy/cache/docker-images-amd64
            echo -e "${GREEN}✓ AMD64 缓存已清理${NC}"
        else
            echo -e "${YELLOW}AMD64 缓存不存在${NC}"
        fi
        echo ""
        ;;
    3)
        echo ""
        if [ -d "deploy/cache/docker-images-arm64" ]; then
            rm -rf deploy/cache/docker-images-arm64
            echo -e "${GREEN}✓ ARM64 缓存已清理${NC}"
        else
            echo -e "${YELLOW}ARM64 缓存不存在${NC}"
        fi
        echo ""
        ;;
    4)
        echo ""
        read -p "确定要清理所有缓存吗? (y/n): " CONFIRM
        if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
            rm -rf deploy/cache/docker-images-amd64 deploy/cache/docker-images-arm64
            echo -e "${GREEN}✓ 所有缓存已清理${NC}"
        else
            echo -e "${YELLOW}已取消${NC}"
        fi
        echo ""
        ;;
    5)
        echo ""
        read -p "请输入架构 (amd64/arm64): " ARCH
        if [ "$ARCH" = "amd64" ] || [ "$ARCH" = "arm64" ]; then
            echo -e "${YELLOW}清理 $ARCH 缓存...${NC}"
            rm -rf "deploy/cache/docker-images-$ARCH"
            echo -e "${GREEN}✓ 缓存已清理${NC}"
            echo ""
            echo -e "${YELLOW}开始重新准备部署包...${NC}"
            export TARGET_ARCH="$ARCH"
            ./deploy/scripts/prepare-deploy.sh
        else
            echo -e "${RED}错误: 无效架构${NC}"
        fi
        echo ""
        ;;
    *)
        echo -e "${RED}无效选择${NC}"
        exit 1
        ;;
esac
