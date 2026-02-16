# 部署脚本重构与 Supabase 清理检查清单

## 文件清理检查

- [x] deploy/scripts/init-supabase-db.sh 已删除
- [x] deploy/scripts/init-supabase-roles.sql 已删除
- [x] config/env/.env.supabase 已删除
- [x] api/lib/supabase.ts 已删除
- [x] scripts/dev/test_supabase_admin.ts 已删除
- [x] api-new/scripts/migrate-from-supabase.js 已删除
- [x] .deploy-cache 目录已删除
- [x] .archive/supabase-backup/ 目录已删除
- [x] config/docker/Dockerfile.api 已删除
- [x] api 目录已删除（旧 API）

## 配置文件检查

- [x] config/docker/docker-compose.yml 已更新为新架构
- [x] config/nginx/nginx.conf 已移除 Supabase 代理配置
- [x] config/env/.env.example 已更新
- [x] config/env/.env.production.example 已创建

## 部署脚本检查

- [x] fresh-install/deploy.sh 已重构
  - [x] 移除所有 Supabase 相关检查
  - [x] Docker 镜像列表已更新
  - [x] 数据库初始化逻辑已更新
  - [x] 管理员用户创建逻辑已更新
  - [x] 健康检查逻辑已更新

- [x] update/deploy.sh 已重构
  - [x] 配置验证逻辑已更新
  - [x] 文件上传逻辑已更新
  - [x] 服务重启逻辑已更新
  - [x] 验证逻辑已更新

## 文档检查

- [x] deploy/README.md 已更新
- [x] deploy/fresh-install/README.md 已更新
- [x] deploy/update/README.md 已更新

## 功能验证

- [x] 全新部署脚本语法正确（bash -n 检查通过）
- [x] 更新部署脚本语法正确（bash -n 检查通过）

## 新架构服务检查

- [x] PostgreSQL 服务配置正确
- [x] Redis 服务配置正确
- [x] MinIO 服务配置正确
- [x] API 服务配置正确
- [x] Nginx 服务配置正确
