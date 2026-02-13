# Supabase 相关内容归档清单

## 归档时间
2026-02-13

## 归档原因
项目已从 Supabase 迁移到自托管 PostgreSQL + MinIO + Redis 架构

## 归档内容分类

### 1. 配置文件 (config/)
- nginx.conf - 包含 Supabase 相关配置的 Nginx 配置
- docker-compose.yml - 包含 Supabase 服务的 Docker 配置

### 2. 脚本文件 (scripts/)
- migrate-from-supabase.js - 从 Supabase 迁移数据的脚本
- init-supabase-db.sh - 初始化 Supabase 数据库脚本
- init-supabase-roles.sql - Supabase 角色初始化 SQL
- check_users.js - 检查 Supabase 用户脚本
- test_supabase_admin.ts - 测试 Supabase 管理员连接
- generate-jwt.js - 生成 Supabase JWT
- seed_full_data.js - 使用 Supabase 客户端填充数据

### 3. 数据库相关 (database/)
- supabase/migrations/ - Supabase 迁移文件
- supabase/functions/ - Supabase Edge Functions
- supabase/volumes/ - Supabase 数据卷配置

### 4. 文档 (docs/)
- DEPLOY.md - 包含 Supabase 部署说明
- DEPLOY_CHECKLIST.md - 包含 Supabase 部署检查清单
- DATABASE_DIFF_REPORT.md - 数据库差异报告
- 部署优化说明.md
- 部署检查清单.md

### 5. 前端源代码 (frontend-src/)
- src/context/AuthContext.tsx - 使用 Supabase 的认证上下文
- src/lib/supabase.ts - Supabase 客户端配置
- src/pages/Login.tsx - 使用 Supabase 登录
- src/pages/Profile.tsx - 使用 Supabase 获取用户信息
- 以及其他使用 Supabase 的页面组件...

### 6. API 源代码 (api-src/)
- api/lib/supabase.ts - API 层的 Supabase 客户端
- api/routes/auth.ts - 使用 Supabase 的认证路由

### 7. 原 Supabase 目录 (supabase/)
- 完整的 supabase/ 目录备份

## 替代方案

| 原 Supabase 功能 | 新实现 |
|----------------|--------|
| Supabase Auth | 自研 JWT + bcrypt 认证 (api-new/src/services/authService.ts) |
| Supabase Database | PostgreSQL + Knex (api-new/src/services/dbService.ts) |
| Supabase Storage | MinIO (api-new/src/services/storageService.ts) |
| Supabase RLS | 应用层权限控制 (api-new/src/services/permissionService.ts) |

## 恢复说明
如需恢复 Supabase 相关功能，可从本目录复制回原位置。
