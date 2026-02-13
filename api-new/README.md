# PMSY API 服务（移除 Supabase 依赖）

## 项目简介

本项目是 PMSY 系统的后端 API 服务，使用自托管的 PostgreSQL + JWT + MinIO 替代 Supabase 云服务。

## 技术栈

- **框架**: Express.js + TypeScript
- **数据库**: PostgreSQL 15 + Knex.js
- **认证**: JWT + bcrypt
- **文件存储**: MinIO（S3 兼容）
- **缓存**: Redis
- **测试**: Jest

## 快速开始

### 1. 环境准备

确保已安装：
- Docker Desktop
- Node.js 18+

### 2. 启动开发环境

```bash
# 进入项目目录
cd api-new

# 复制环境变量文件
cp .env.example .env

# 启动所有服务（PostgreSQL + Redis + MinIO）
docker-compose up -d

# 安装依赖
npm install

# 运行开发服务器
npm run dev
```

### 3. 验证服务

```bash
# 检查健康状态
curl http://localhost:3001/health

# 预期输出: {"status":"ok","database":"connected"}
```

### 4. 访问 MinIO 控制台

- URL: http://localhost:9001
- 用户名: minioadmin
- 密码: minioadmin

## 常用命令

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 运行测试（监视模式）
npm run test:watch

# 代码检查
npm run lint

# 自动修复代码
npm run lint:fix

# 数据库迁移
npm run db:migrate

# 数据库回滚
npm run db:rollback

# 数据库种子
npm run db:seed
```

## Docker 命令

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止所有服务
docker-compose down

# 停止并删除数据卷（谨慎使用）
docker-compose down -v

# 重建 API 服务
docker-compose up -d --build api
```

## 项目结构

```
api-new/
├── src/
│   ├── config/          # 配置文件
│   ├── middleware/      # Express 中间件
│   ├── routes/          # API 路由
│   ├── services/        # 业务逻辑服务
│   ├── utils/           # 工具函数
│   └── types/           # TypeScript 类型定义
├── database/
│   ├── migrations/      # 数据库迁移文件
│   └── seeds/           # 数据库种子数据
├── tests/               # 测试文件
├── docker-compose.yml   # Docker 配置
├── Dockerfile           # API 服务镜像
└── package.json         # 项目依赖
```

## API 文档

### Auth API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/auth/v1/token?grant_type=password` | POST | 用户登录 |
| `/auth/v1/signup` | POST | 用户注册 |
| `/auth/v1/logout` | POST | 退出登录 |
| `/auth/v1/user` | GET | 获取当前用户 |
| `/auth/v1/user` | PUT | 更新用户信息 |

### REST API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/rest/v1/:table` | GET | 查询数据 |
| `/rest/v1/:table` | POST | 插入数据 |
| `/rest/v1/:table` | PATCH | 更新数据 |
| `/rest/v1/:table` | DELETE | 删除数据 |

### Storage API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/storage/v1/object/:bucket/:path` | POST | 上传文件 |
| `/storage/v1/object/:bucket/:path` | GET | 下载文件 |
| `/storage/v1/object/:bucket/:path` | DELETE | 删除文件 |

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DB_HOST` | 数据库主机 | localhost |
| `DB_PORT` | 数据库端口 | 5432 |
| `DB_USER` | 数据库用户名 | pmsy |
| `DB_PASSWORD` | 数据库密码 | pmsy_dev_password |
| `DB_NAME` | 数据库名称 | pmsy_dev |
| `REDIS_URL` | Redis 连接地址 | redis://localhost:6379 |
| `MINIO_ENDPOINT` | MinIO 地址 | localhost:9000 |
| `MINIO_ACCESS_KEY` | MinIO 访问密钥 | minioadmin |
| `MINIO_SECRET_KEY` | MinIO 秘密密钥 | minioadmin |
| `JWT_SECRET` | JWT 密钥 | dev_jwt_secret |
| `PORT` | API 服务端口 | 3001 |

## 开发规范

1. 使用 TypeScript 编写代码
2. 遵循 ESLint 规则
3. 编写单元测试（覆盖率 > 80%）
4. 使用 Knex.js 进行数据库操作
5. API 响应格式与 Supabase 兼容

## 许可证

MIT
