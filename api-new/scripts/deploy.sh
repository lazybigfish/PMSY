#!/bin/bash

# PMSY API 部署脚本
# 用法: ./deploy.sh [环境]
# 环境: development | production (默认: production)

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取环境参数
ENV=${1:-production}
echo -e "${GREEN}开始部署 PMSY API - 环境: ${ENV}${NC}"

# 检查环境变量文件
if [ ! -f ".env.${ENV}" ]; then
    echo -e "${RED}错误: 环境配置文件 .env.${ENV} 不存在${NC}"
    exit 1
fi

# 加载环境变量
export $(cat .env.${ENV} | grep -v '^#' | xargs)

# 1. 安装依赖
echo -e "${YELLOW}[1/6] 安装依赖...${NC}"
npm ci --production

# 2. 编译 TypeScript
echo -e "${YELLOW}[2/6] 编译 TypeScript...${NC}"
npm run build

# 3. 运行数据库迁移
echo -e "${YELLOW}[3/6] 运行数据库迁移...${NC}"
npm run migrate

# 4. 运行测试
echo -e "${YELLOW}[4/6] 运行测试...${NC}"
npm test

# 5. 创建日志目录
if [ ! -d "/var/log/pmsy" ]; then
    echo -e "${YELLOW}[5/6] 创建日志目录...${NC}"
    sudo mkdir -p /var/log/pmsy
    sudo chown $USER:$USER /var/log/pmsy
fi

# 6. 启动服务
echo -e "${YELLOW}[6/6] 启动服务...${NC}"
if [ "$ENV" = "production" ]; then
    # 生产环境使用 PM2
    if command -v pm2 &> /dev/null; then
        pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
        echo -e "${GREEN}服务已通过 PM2 启动${NC}"
    else
        echo -e "${YELLOW}警告: PM2 未安装，使用 node 直接启动${NC}"
        nohup node dist/index.js > /var/log/pmsy/api.log 2>&1 &
        echo $! > /tmp/pmsy-api.pid
        echo -e "${GREEN}服务已启动，PID: $(cat /tmp/pmsy-api.pid)${NC}"
    fi
else
    # 开发环境
    npm run dev
fi

echo -e "${GREEN}部署完成!${NC}"
