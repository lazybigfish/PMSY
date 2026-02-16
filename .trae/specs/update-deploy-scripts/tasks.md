# Tasks

- [x] Task 1: 清理 Supabase 相关文件
  - [x] SubTask 1.1: 删除 deploy/scripts/init-supabase-db.sh
  - [x] SubTask 1.2: 删除 deploy/scripts/init-supabase-roles.sql
  - [x] SubTask 1.3: 删除 config/env/.env.supabase
  - [x] SubTask 1.4: 删除 api/lib/supabase.ts
  - [x] SubTask 1.5: 删除 scripts/dev/test_supabase_admin.ts
  - [x] SubTask 1.6: 清理 .deploy-cache 目录中的 Supabase 相关缓存
  - [x] SubTask 1.7: 删除 .archive/supabase-backup 目录（已归档）
  - [x] SubTask 1.8: 删除 api-new/scripts/migrate-from-supabase.js（迁移已完成）

- [x] Task 2: 更新 docker-compose.yml 配置
  - [x] SubTask 2.1: 创建新的生产环境 docker-compose.yml（基于 api-new/docker-compose.yml）
  - [x] SubTask 2.2: 添加 Nginx 服务配置
  - [x] SubTask 2.3: 配置服务依赖关系
  - [x] SubTask 2.4: 配置数据卷持久化

- [x] Task 3: 更新 nginx.conf 配置
  - [x] SubTask 3.1: 移除 /auth/ 代理配置
  - [x] SubTask 3.2: 移除 /rest/ 代理配置
  - [x] SubTask 3.3: 保留 /api/ 代理配置
  - [x] SubTask 3.4: 优化前端静态文件配置

- [x] Task 4: 重构全新部署脚本 (fresh-install/deploy.sh)
  - [x] SubTask 4.1: 更新配置检查逻辑（移除 Supabase 相关检查）
  - [x] SubTask 4.2: 更新 Docker 镜像列表（移除 Supabase 镜像，添加新架构镜像）
  - [x] SubTask 4.3: 更新服务器端部署逻辑
  - [x] SubTask 4.4: 更新数据库初始化逻辑（使用 api-new 的迁移脚本）
  - [x] SubTask 4.5: 更新管理员用户创建逻辑
  - [x] SubTask 4.6: 更新健康检查逻辑

- [x] Task 5: 重构更新部署脚本 (update/deploy.sh)
  - [x] SubTask 5.1: 更新配置验证逻辑
  - [x] SubTask 5.2: 更新文件上传逻辑（上传 api-new 目录）
  - [x] SubTask 5.3: 更新服务重启逻辑
  - [x] SubTask 5.4: 更新验证逻辑

- [x] Task 6: 更新环境配置模板
  - [x] SubTask 6.1: 更新 config/env/.env.example（移除 Supabase 相关配置）
  - [x] SubTask 6.2: 创建新的生产环境配置模板 config/env/.env.production.example

- [x] Task 7: 更新部署文档
  - [x] SubTask 7.1: 更新 deploy/README.md
  - [x] SubTask 7.2: 更新 deploy/fresh-install/README.md
  - [x] SubTask 7.3: 更新 deploy/update/README.md
  - [x] SubTask 7.4: 更新 deploy/docs/DEPLOY_GUIDE.md

- [x] Task 8: 清理旧架构文件
  - [x] SubTask 8.1: 删除 config/docker/Dockerfile.api（旧 API Dockerfile）
  - [x] SubTask 8.2: 删除 api 目录（旧 API，已被 api-new 替代）

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 2, Task 3]
- [Task 5] depends on [Task 2, Task 3]
- [Task 6] depends on [Task 1]
- [Task 7] depends on [Task 4, Task 5, Task 6]
- [Task 8] can run in parallel with [Task 1]
