# 部署脚本重构与 Supabase 清理规范

## Why

项目已完全移除 Supabase 依赖，采用新的架构（api-new 目录下的 Node.js + PostgreSQL + Redis + MinIO）。现有的部署脚本（fresh-install/deploy.sh 和 update/deploy.sh）仍然基于 Supabase 架构，已不再适用。需要根据新架构重新调整部署脚本，并清理项目中所有 Supabase 相关文件和文档。

## What Changes

- **删除** 所有 Supabase 相关的部署脚本和配置文件
- **重构** 全新部署脚本（fresh-install/deploy.sh）适配新架构
- **重构** 更新部署脚本（update/deploy.sh）适配新架构
- **更新** nginx.conf 配置，移除 Supabase 服务代理
- **更新** docker-compose.yml 配置，使用新架构的服务
- **清理** 项目中所有 Supabase 相关文件、文档和缓存
- **更新** 环境配置文件模板

## Impact

- Affected specs: 部署流程、环境配置、服务架构
- Affected code: 
  - `deploy/fresh-install/deploy.sh`
  - `deploy/update/deploy.sh`
  - `deploy/scripts/init-supabase-*.sh`
  - `config/docker/docker-compose.yml`
  - `config/nginx/nginx.conf`
  - `config/env/.env.supabase`
  - `api/lib/supabase.ts`
  - `scripts/dev/test_supabase_admin.ts`
  - `.deploy-cache/` 目录下的缓存文件

## ADDED Requirements

### Requirement: 新架构部署脚本

系统 SHALL 提供适配新架构的部署脚本，支持以下服务：
- PostgreSQL 数据库
- Redis 缓存
- MinIO 文件存储
- PMSY API 服务（api-new）
- Nginx 前端服务

#### Scenario: 全新部署成功

- **WHEN** 用户执行全新部署脚本
- **THEN** 系统应自动完成以下步骤：
  1. 检查服务器环境（Docker、Docker Compose）
  2. 上传必要文件（dist、api-new、配置文件）
  3. 启动基础设施服务（PostgreSQL、Redis、MinIO）
  4. 执行数据库迁移
  5. 执行种子数据初始化
  6. 启动 API 服务
  7. 启动 Nginx 前端服务
  8. 创建默认管理员用户

#### Scenario: 更新部署成功

- **WHEN** 用户执行更新部署脚本
- **THEN** 系统应保留所有现有数据，仅更新代码和配置

### Requirement: Supabase 文件清理

系统 SHALL 清理所有 Supabase 相关文件：

#### Scenario: 清理部署相关文件

- **WHEN** 执行清理操作
- **THEN** 以下文件应被删除：
  - `deploy/scripts/init-supabase-db.sh`
  - `deploy/scripts/init-supabase-roles.sql`
  - `config/env/.env.supabase`
  - `api/lib/supabase.ts`
  - `scripts/dev/test_supabase_admin.ts`
  - `.deploy-cache/cache/pmsy-deploy-amd64/api/lib/supabase.ts`
  - `.deploy-cache/cache/pmsy-deploy-amd64/docker-images/supabase_*.tar`
  - `.deploy-cache/cache/docker-images-amd64/supabase_*.tar`

#### Scenario: 清理旧架构文件

- **WHEN** 执行清理操作
- **THEN** 以下目录/文件应被删除：
  - `config/docker/Dockerfile.api`（旧 API Dockerfile）
  - `.archive/supabase-backup/`（已备份的旧文件）

## MODIFIED Requirements

### Requirement: 部署配置文件

部署配置文件 SHALL 使用新的环境变量结构：

```env
# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_USER=pmsy
DB_PASSWORD=your_secure_password
DB_NAME=pmsy

# Redis 配置
REDIS_URL=redis://redis:6379

# MinIO 配置
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your_secure_secret
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=files

# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# API 配置
API_URL=http://your-server-ip
PORT=3001
NODE_ENV=production
```

### Requirement: Nginx 配置

Nginx 配置 SHALL 仅代理新架构的服务：
- `/api/` -> `api:3001`
- `/` -> 前端静态文件

不再需要 `/auth/` 和 `/rest/` 的代理配置。

## REMOVED Requirements

### Requirement: Supabase 服务依赖

**Reason**: 项目已完全移除 Supabase 依赖，使用自建的 Node.js API 服务

**Migration**: 
- 认证服务由 api-new/src/routes/auth.ts 提供
- REST API 由 api-new/src/routes/rest.ts 提供
- 文件存储由 MinIO 提供
