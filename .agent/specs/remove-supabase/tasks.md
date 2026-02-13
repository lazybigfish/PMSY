# PMSY 移除 Supabase 依赖 - 任务清单

## 阶段 1：搭建新后端（第 1 周）

### 任务 1.1：创建项目基础结构
- [ ] 创建 `api-new/` 目录
- [ ] 初始化 Node.js + TypeScript 项目
- [ ] 配置 ESLint 和 Prettier
- [ ] 安装核心依赖：express, knex, pg, jsonwebtoken, bcrypt, minio, redis
- [ ] 配置 TypeScript 编译选项
- [ ] 创建目录结构（config, middleware, routes, services, utils, types）

### 任务 1.2：配置 Docker 开发环境
- [ ] 创建 `docker-compose.yml` 配置 PostgreSQL、Redis、MinIO
- [ ] 创建 `Dockerfile` 构建 API 服务镜像
- [ ] 配置环境变量文件 `.env.example`
- [ ] 测试 `docker-compose up` 启动所有服务
- [ ] 验证各服务健康状态

### 任务 1.3：数据库连接和配置
- [ ] 创建 `config/database.ts` 配置 Knex.js 连接 PostgreSQL
- [ ] 创建 `config/redis.ts` 配置 Redis 连接
- [ ] 创建 `config/minio.ts` 配置 MinIO 连接
- [ ] 创建 `config/constants.ts` 定义常量
- [ ] 测试数据库连接
- [ ] 创建健康检查接口 `/health`

### 任务 1.4：创建数据库 Schema
- [ ] 分析现有 Supabase migrations，提取表结构
- [ ] 创建 `database/migrations/001_create_profiles.sql`
- [ ] 创建业务表 migrations（projects, tasks, project_members 等）
- [ ] 创建索引优化查询性能
- [ ] 测试 migrations 自动执行

### 任务 1.5：实现 JWT 服务
- [ ] 创建 `services/jwtService.ts`
- [ ] 实现 Token 生成方法
- [ ] 实现 Token 验证方法
- [ ] 实现 Token 刷新方法
- [ ] 编写单元测试

### 任务 1.6：实现认证服务
- [ ] 创建 `services/authService.ts`
- [ ] 实现用户注册逻辑（密码 bcrypt 加密）
- [ ] 实现用户登录逻辑（验证密码 + 生成 Token）
- [ ] 实现获取用户信息逻辑
- [ ] 实现更新用户信息逻辑
- [ ] 编写单元测试

### 任务 1.7：实现 Auth API 路由
- [ ] 创建 `routes/auth.ts`
- [ ] 实现 POST `/auth/v1/token?grant_type=password`（登录）
- [ ] 实现 POST `/auth/v1/signup`（注册）
- [ ] 实现 POST `/auth/v1/logout`（退出）
- [ ] 实现 GET `/auth/v1/user`（获取当前用户）
- [ ] 实现 PUT `/auth/v1/user`（更新用户信息）
- [ ] 实现 GET `/auth/v1/admin/users`（管理员列出用户）
- [ ] 实现 PUT `/auth/v1/admin/users/:id`（管理员更新用户）
- [ ] 返回格式与 Supabase 兼容
- [ ] 编写单元测试

### 任务 1.8：实现认证中间件
- [ ] 创建 `middleware/auth.ts`
- [ ] 实现 `requireAuth` 中间件（验证 JWT Token）
- [ ] 实现 `requireRole` 中间件（权限检查）
- [ ] 测试中间件功能

### 任务 1.9：实现基础 REST API
- [ ] 创建 `routes/rest.ts`
- [ ] 实现 GET `/rest/v1/:table`（查询数据，支持 select, eq, order, limit, offset）
- [ ] 实现 POST `/rest/v1/:table`（插入数据）
- [ ] 实现 PATCH `/rest/v1/:table`（更新数据）
- [ ] 实现 DELETE `/rest/v1/:table`（删除数据）
- [ ] 创建 `services/dbService.ts` 封装数据库操作
- [ ] 返回格式与 Supabase 兼容（数组格式）
- [ ] 编写单元测试

### 任务 1.10：错误处理和日志
- [ ] 创建 `middleware/errorHandler.ts`
- [ ] 统一错误响应格式
- [ ] 创建 `utils/logger.ts` 配置日志
- [ ] 添加请求日志记录
- [ ] 测试错误处理流程

---

## 阶段 2：完善功能（第 2 周）

### 任务 2.1：实现复杂查询支持
- [ ] 支持关联查询（join）
- [ ] 支持聚合查询（count, sum, avg）
- [ ] 支持范围查询（gt, lt, gte, lte）
- [ ] 支持模糊查询（like, ilike）
- [ ] 支持 in 查询
- [ ] 支持 is null 查询
- [ ] 编写单元测试

### 任务 2.2：实现 Storage API
- [ ] 创建 `services/storageService.ts`
- [ ] 实现文件上传方法
- [ ] 实现文件下载方法
- [ ] 实现文件删除方法
- [ ] 实现获取公开 URL 方法
- [ ] 创建 `routes/storage.ts`
- [ ] 实现 POST `/storage/v1/object/:bucket/:path`（上传）
- [ ] 实现 GET `/storage/v1/object/:bucket/:path`（下载）
- [ ] 实现 DELETE `/storage/v1/object/:bucket/:path`（删除）
- [ ] 实现 GET `/storage/v1/object/public/:bucket/:path`（公开访问）
- [ ] 编写单元测试

### 任务 2.3：实现权限控制（RLS 替代）
- [ ] 创建 `services/permissionService.ts`
- [ ] 实现 projects 表的权限过滤
- [ ] 实现 tasks 表的权限过滤
- [ ] 实现 files 表的权限过滤
- [ ] 在 REST API 中集成权限检查
- [ ] 测试权限控制功能

### 任务 2.4：数据迁移脚本
- [ ] 创建 `scripts/migrate-from-supabase.ts`
- [ ] 实现从 Supabase 导出用户数据
- [ ] 实现从 Supabase 导出业务数据
- [ ] 实现数据导入到新数据库
- [ ] 处理密码迁移（用户需要重新设置密码或发送重置邮件）
- [ ] 测试迁移脚本

### 任务 2.5：Supabase 格式兼容工具
- [ ] 创建 `utils/supabaseCompat.ts`
- [ ] 实现响应格式转换函数
- [ ] 实现错误格式转换函数
- [ ] 实现查询参数解析函数
- [ ] 测试兼容性

### 任务 2.6：API 服务入口
- [ ] 创建 `src/index.ts`
- [ ] 配置 Express 应用
- [ ] 注册所有路由
- [ ] 配置中间件（cors, body-parser, auth, errorHandler）
- [ ] 配置端口和启动逻辑
- [ ] 测试完整服务启动

---

## 阶段 3：测试验证（第 3 周）

### 任务 3.1：单元测试
- [ ] 配置 Jest 测试框架
- [ ] 编写 authService 单元测试
- [ ] 编写 jwtService 单元测试
- [ ] 编写 dbService 单元测试
- [ ] 编写 storageService 单元测试
- [ ] 编写 permissionService 单元测试
- [ ] 确保测试覆盖率 > 80%

### 任务 3.2：集成测试
- [ ] 编写 Auth API 集成测试
- [ ] 编写 REST API 集成测试
- [ ] 编写 Storage API 集成测试
- [ ] 测试完整的用户流程（注册 -> 登录 -> 查询 -> 上传）

### 任务 3.3：前端集成测试
- [ ] 修改前端 `.env` 文件指向新 API
- [ ] 测试登录功能
- [ ] 测试数据查询功能
- [ ] 测试数据增删改功能
- [ ] 测试文件上传功能
- [ ] 测试用户管理功能
- [ ] 测试权限控制功能

### 任务 3.4：性能测试
- [ ] 使用 k6 或 Artillery 进行压力测试
- [ ] 测试 API 响应时间
- [ ] 测试数据库查询性能
- [ ] 测试并发用户支持
- [ ] 优化性能瓶颈

### 任务 3.5：数据迁移验证
- [ ] 在测试环境运行迁移脚本
- [ ] 验证数据完整性
- [ ] 验证用户可正常登录
- [ ] 验证业务数据可正常访问
- [ ] 准备回滚方案

---

## 阶段 4：上线切换（第 4 周）

### 任务 4.1：生产环境配置
- [ ] 创建生产环境 `docker-compose.prod.yml`
- [ ] 配置生产环境环境变量
- [ ] 配置 PostgreSQL SSL
- [ ] 配置 MinIO 生产环境
- [ ] 配置 Nginx 反向代理

### 任务 4.2：部署脚本
- [ ] 创建 `deploy.sh` 自动化部署脚本
- [ ] 创建数据库备份脚本
- [ ] 创建日志收集脚本
- [ ] 创建监控检查脚本

### 任务 4.3：生产环境部署
- [ ] 部署 PostgreSQL
- [ ] 部署 Redis
- [ ] 部署 MinIO
- [ ] 部署 API 服务
- [ ] 配置 Nginx 路由

### 任务 4.4：数据迁移
- [ ] 备份现有 Supabase 数据
- [ ] 执行数据迁移脚本
- [ ] 验证迁移结果
- [ ] 通知用户重新登录（如需要）

### 任务 4.5：切换和验证
- [ ] 切换 DNS 或路由到新服务
- [ ] 验证所有功能正常
- [ ] 监控错误日志
- [ ] 准备回滚方案（保留旧服务一段时间）

### 任务 4.6：清理和文档
- [ ] 清理旧 Supabase 相关代码
- [ ] 更新部署文档
- [ ] 更新开发文档
- [ ] 培训团队成员

---

## 前置条件检查

在开始实施前，请确认以下条件已满足：

- [ ] 已阅读并理解 `requirements.md`
- [ ] 已阅读并理解 `design.md`
- [ ] 本地 Docker 环境已安装并正常运行
- [ ] 已备份现有数据和代码
- [ ] 已获得项目相关方批准

## 执行方式

输入 `@tasks.md 执行任务编号` 开始执行具体任务。

例如：
- `@tasks.md 执行任务 1.1` - 创建项目基础结构
- `@tasks.md 执行任务 1.2` - 配置 Docker 开发环境

## 记录文档

按照项目规则，每次任务完成后需要在 `.agent/records/` 目录下创建记录文档，格式为：`YYYY-MM-DD-任务名称-记录.md`。
