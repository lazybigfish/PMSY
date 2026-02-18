# PMSY API 服务镜像
# 使用多阶段构建优化镜像大小

# 阶段1：构建阶段
FROM node:24-alpine AS builder

WORKDIR /app

# 先复制 package.json，利用 Docker 缓存层
COPY package*.json ./
RUN npm ci --only=production

# 阶段2：运行阶段
FROM node:24-alpine

# 安装必要的系统依赖
RUN apk add --no-cache wget

WORKDIR /app

# 从构建阶段复制依赖
COPY --from=builder /app/node_modules ./node_modules

# 复制应用代码
COPY dist ./dist

# 注意：数据库迁移文件不再打包进镜像
# 迁移文件通过开发机上传到服务器，在宿主机上执行

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# 启动应用
CMD ["node", "dist/index.js"]
