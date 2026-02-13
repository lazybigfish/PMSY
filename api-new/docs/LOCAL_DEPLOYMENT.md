# 本地部署指南

## 环境要求

### 必需软件
- **Node.js**: v18.x 或更高版本
- **npm**: v9.x 或更高版本
- **Docker**: 用于运行 PostgreSQL、Redis、MinIO
- **Docker Compose**: 用于编排容器

### 安装 Node.js (macOS)

使用 Homebrew 安装：
```bash
brew install node
```

或使用 nvm 安装（推荐）：
```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装 Node.js
nvm install 18
nvm use 18
```

## 部署步骤

### 1. 安装依赖

```bash
cd api-new
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下内容：
```env
NODE_ENV=development
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pmsy_dev
DB_USER=postgres
DB_PASSWORD=postgres

# JWT 配置
JWT_SECRET=your_development_jwt_secret_key
JWT_EXPIRES_IN=7d
JWT_ISSUER=pmsy-api
JWT_AUDIENCE=pmsy-client

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO 配置
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### 3. 启动 Docker 服务

```bash
cd api-new
docker-compose up -d
```

这将启动：
- PostgreSQL (端口 5432)
- Redis (端口 6379)
- MinIO (端口 9000, 控制台 9001)

### 4. 运行数据库迁移

```bash
npm run db:migrate
```

### 5. 运行种子数据（可选）

```bash
npm run db:seed
```

### 6. 启动开发服务器

```bash
npm run dev
```

服务将在 http://localhost:3000 启动

### 7. 验证服务

```bash
# 健康检查
curl http://localhost:3000/health

# 测试注册
curl -X POST http://localhost:3000/auth/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 测试登录
curl -X POST "http://localhost:3000/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Docker Compose 配置

如果 `docker-compose.yml` 不存在，创建以下内容：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: pmsy-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: pmsy_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: pmsy-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: pmsy-minio
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

## 常见问题

### 1. 端口被占用
```bash
# 查看端口占用
lsof -i :3000
lsof -i :5432

# 停止占用进程
kill -9 <PID>
```

### 2. Docker 容器无法启动
```bash
# 查看日志
docker-compose logs

# 重启容器
docker-compose down
docker-compose up -d
```

### 3. 数据库连接失败
```bash
# 检查 PostgreSQL 是否运行
docker ps | grep postgres

# 进入 PostgreSQL 容器
docker exec -it pmsy-postgres psql -U postgres
```

### 4. MinIO 控制台访问
- URL: http://localhost:9001
- 用户名: minioadmin
- 密码: minioadmin

## 下一步

1. 完成本地验证后，配置生产环境变量
2. 部署到服务器
3. 运行数据迁移脚本
4. 更新前端环境变量指向新 API
