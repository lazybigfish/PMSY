#!/bin/bash

# PMSY 传输脚本
# 将部署包传输到服务器

set -e

echo "========================================="
echo "     PMSY 传输到服务器"
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

# 检查必要配置
if [ -z "$SERVER_IP" ] || [ -z "$SERVER_USER" ]; then
    echo -e "${YELLOW}请设置服务器信息:${NC}"
    read -p "服务器 IP: " SERVER_IP
    read -p "用户名: " SERVER_USER
fi

echo -e "${BLUE}服务器:${NC} $SERVER_USER@$SERVER_IP"
echo ""

# 询问镜像获取方式（如果配置文件中未设置）
if [ -z "$IMAGE_SOURCE" ]; then
    echo -e "${YELLOW}请选择 Docker 镜像获取方式:${NC}"
    echo ""
    echo "  1) 服务器拉取 (推荐)"
    echo "     - 服务器直接从 Docker Hub 拉取镜像"
    echo "     - 适合服务器能访问互联网"
    echo "     - 最快，无需上传大文件"
    echo ""
    echo "  2) 本地上传"
    echo "     - 本地构建后上传到服务器"
    echo "     - 适合离线环境或网络不稳定"
    echo "     - 需要上传约 2-3GB 镜像文件"
    echo ""
    read -p "请选择 (1-2): " CHOICE
    
    case $CHOICE in
        1) IMAGE_SOURCE="remote" ;;
        2) IMAGE_SOURCE="local" ;;
        *) 
            echo -e "${YELLOW}默认使用服务器拉取${NC}"
            IMAGE_SOURCE="remote"
            ;;
    esac
    echo ""
fi

echo -e "${BLUE}镜像获取方式:${NC} $([ "$IMAGE_SOURCE" = "remote" ] && echo "服务器拉取" || echo "本地上传")"
echo ""

# 查找部署目录
DEPLOY_DIR=$(ls -d deploy/cache/pmsy-deploy-* 2>/dev/null | head -1)

if [ -z "$DEPLOY_DIR" ]; then
    echo -e "${RED}错误: 找不到部署目录${NC}"
    echo "请先执行 ./deploy/scripts/prepare-deploy.sh"
    exit 1
fi

echo -e "${BLUE}部署目录:${NC} $DEPLOY_DIR"
echo ""

# 获取架构
ARCH=$(cat $DEPLOY_DIR/ARCH.txt)
echo -e "${BLUE}目标架构:${NC} $ARCH"
echo ""

# 设置 SSH 选项
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"
if [ "$USE_SSH_KEY" = "yes" ] && [ -f "$SSH_KEY_PATH" ]; then
    SSH_OPTS="$SSH_OPTS -i $SSH_KEY_PATH"
fi

# 创建 SCP 和 SSH 命令
if [ "$USE_SSH_KEY" = "yes" ] && [ -f "$SSH_KEY_PATH" ]; then
    # 使用 SSH Key 免密码
    echo -e "${GREEN}使用 SSH Key 认证${NC}"
    SCP_CMD="scp $SSH_OPTS"
    SSH_CMD="ssh $SSH_OPTS"
elif [ -n "$SERVER_PASSWORD" ]; then
    # 使用 sshpass 自动输入密码
    if ! command -v sshpass &> /dev/null; then
        echo -e "${RED}错误: sshpass 未安装${NC}"
        echo "Mac 系统建议改用 SSH Key 认证:"
        echo "  1. 修改 deploy-config.sh: USE_SSH_KEY=\"yes\""
        echo "  2. 执行: ./setup-ssh-key.sh"
        exit 1
    fi
    
    SCP_CMD="sshpass -p '$SERVER_PASSWORD' scp $SSH_OPTS"
    SSH_CMD="sshpass -p '$SERVER_PASSWORD' ssh $SSH_OPTS"
else
    # 手动输入密码
    SCP_CMD="scp $SSH_OPTS"
    SSH_CMD="ssh $SSH_OPTS"
fi

# 创建远程目录
echo -e "${YELLOW}[1/3] 创建远程目录...${NC}"
$SSH_CMD $SERVER_USER@$SERVER_IP "sudo mkdir -p $REMOTE_DIR/docker-images && sudo chown -R $SERVER_USER:$SERVER_USER $REMOTE_DIR"
echo -e "${GREEN}✓ 远程目录创建完成${NC}"
echo ""

# 根据镜像获取方式执行不同操作
if [ "$IMAGE_SOURCE" = "local" ]; then
    # 本地上传模式
    echo -e "${YELLOW}[2/3] 传输 Docker 镜像...${NC}"
    echo "这可能需要几分钟时间（约2-3GB）..."
    echo ""
    
    for tarfile in $DEPLOY_DIR/docker-images/*.tar; do
        filename=$(basename $tarfile)
        echo "  - 传输 $filename..."
        $SCP_CMD $tarfile $SERVER_USER@$SERVER_IP:$REMOTE_DIR/docker-images/
    done
    
    echo -e "${GREEN}✓ Docker 镜像传输完成${NC}"
    echo ""
else
    # 服务器拉取模式
    echo -e "${YELLOW}[2/3] 服务器将自动拉取 Docker 镜像${NC}"
    echo "跳过镜像上传，将在部署时自动拉取"
    echo ""
fi

# 传输应用文件
echo -e "${YELLOW}[3/3] 传输应用文件...${NC}"
$SCP_CMD -r $DEPLOY_DIR/dist $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
$SCP_CMD -r $DEPLOY_DIR/api $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
$SCP_CMD $DEPLOY_DIR/package*.json $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
$SCP_CMD $DEPLOY_DIR/Dockerfile.api $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
$SCP_CMD $DEPLOY_DIR/docker-compose.yml $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
$SCP_CMD $DEPLOY_DIR/nginx.conf $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
$SCP_CMD $DEPLOY_DIR/.env $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
$SCP_CMD $DEPLOY_DIR/deploy.sh $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
$SCP_CMD $DEPLOY_DIR/ARCH.txt $SERVER_USER@$SERVER_IP:$REMOTE_DIR/

# 传输数据库 migrations 和初始化脚本（如果存在）
if [ -d "$DEPLOY_DIR/supabase" ]; then
    echo "  - 传输数据库 migrations..."
    $SCP_CMD -r $DEPLOY_DIR/supabase $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
fi

if [ -d "$DEPLOY_DIR/deploy" ]; then
    echo "  - 传输部署脚本..."
    $SCP_CMD -r $DEPLOY_DIR/deploy $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
fi

echo -e "${GREEN}✓ 应用文件传输完成${NC}"
echo ""

# 设置权限
$SSH_CMD $SERVER_USER@$SERVER_IP "chmod +x $REMOTE_DIR/deploy.sh"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}     传输完成!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# 根据镜像获取方式显示不同部署命令
if [ "$IMAGE_SOURCE" = "remote" ]; then
    echo -e "${YELLOW}部署命令 (服务器拉取模式):${NC}"
    echo ""
    echo "  ssh $SERVER_USER@$SERVER_IP \"cd $REMOTE_DIR && sudo docker-compose pull && sudo docker-compose up -d\""
    echo ""
    read -p "是否立即执行部署? (y/n): " EXECUTE_NOW
    if [ "$EXECUTE_NOW" = "y" ] || [ "$EXECUTE_NOW" = "Y" ]; then
        echo ""
        echo -e "${YELLOW}正在服务器上拉取镜像并启动服务...${NC}"
        $SSH_CMD $SERVER_USER@$SERVER_IP "cd $REMOTE_DIR && sudo docker-compose pull && sudo docker-compose up -d"
        echo ""
        echo -e "${GREEN}✓ 部署完成!${NC}"
        echo ""
        echo -e "${BLUE}访问地址:${NC}"
        echo "  应用: http://$SERVER_IP"
        echo "  Supabase Studio: http://$SERVER_IP:3000"
    fi
else
    echo -e "${YELLOW}部署命令 (本地上传模式):${NC}"
    echo ""
    echo "  ssh $SERVER_USER@$SERVER_IP \"cd $REMOTE_DIR && ./deploy.sh\""
    echo ""
    read -p "是否立即执行部署? (y/n): " EXECUTE_NOW
    if [ "$EXECUTE_NOW" = "y" ] || [ "$EXECUTE_NOW" = "Y" ]; then
        $SSH_CMD $SERVER_USER@$SERVER_IP "cd $REMOTE_DIR && ./deploy.sh"
    fi
fi
echo ""
