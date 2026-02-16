# PMSY 项目更新日志

> 本文档记录项目每日工作内容，按日期倒序排列

---

## 2026-02-16

### 任务中心功能完善

#### 1. 批量操作功能
- ✅ 批量删除任务：选中多个任务后可一键删除，支持权限校验
- ✅ 批量修改状态：可将多个任务同时修改为指定状态
- ✅ 批量分配处理人：可为多个任务批量添加处理人

**新增组件：**
- `BatchActionBar.tsx` - 批量操作工具栏
- `BatchDeleteModal.tsx` - 批量删除确认弹窗
- `BatchStatusModal.tsx` - 批量修改状态弹窗
- `BatchAssignModal.tsx` - 批量分配处理人弹窗

**后端 API：**
- `POST /api/tasks/batch-delete` - 批量删除任务
- `POST /api/tasks/batch-status` - 批量修改状态
- `POST /api/tasks/batch-assign` - 批量分配处理人

#### 2. 任务详情完善
- ✅ 优先级编辑：任务创建者可在详情页修改任务优先级
- ✅ 截止日期编辑：任务创建者可在详情页修改截止日期
- ✅ 任务历史记录：自动记录任务的所有字段变更

**新增组件：**
- `TaskHistory.tsx` - 任务历史记录展示组件

**数据库变更：**
- 新增 `task_history` 表存储变更记录
- 创建触发器自动记录任务字段变更
- 新增数据库函数 `record_task_assignee_change` 和 `record_task_module_change`

### Bug 修复

| 问题 | 修复内容 |
|------|----------|
| 任务列表默认筛选 | 默认只展示未完成的任务（未开始、进行中、已暂停） |
| 任务趋势图高度 | 从 160px 缩短至 120px，减少占用空间 |
| 任务历史记录操作人员 | 修复通用 PATCH 路由未设置 `app.current_user_id` 会话变量的问题 |
| 移除处理人功能 | 修复删除处理人时 URL 查询参数格式错误的问题 |
| 功能模块关联移除 | 添加单个功能模块移除功能，记录到任务历史 |
| 任务进度更新弹窗 | 修复 passive 事件错误，清理调试日志 |
| 任务中心统计卡片 | 新增"进行中"统计卡片，修复筛选冲突问题 |

### 文件变更

| 文件路径 | 操作 | 说明 |
|---------|------|------|
| `api-new/database/migrations/005_add_task_history.sql` | 新增 | 任务历史记录表迁移 |
| `api-new/src/routes/rest.ts` | 修改 | 添加批量操作 API 和历史记录 API |
| `src/pages/tasks/components/BatchActionBar.tsx` | 新增 | 批量操作工具栏 |
| `src/pages/tasks/components/BatchDeleteModal.tsx` | 新增 | 批量删除弹窗 |
| `src/pages/tasks/components/BatchStatusModal.tsx` | 新增 | 批量修改状态弹窗 |
| `src/pages/tasks/components/BatchAssignModal.tsx` | 新增 | 批量分配处理人弹窗 |
| `src/pages/tasks/components/TaskHistory.tsx` | 新增 | 任务历史记录组件 |

---

## 2026-02-15

### 里程碑页面修复

#### 1. API 查询修复
- 修复里程碑页面内容显示不完整问题
- 将嵌套查询改为两次独立查询，解决 500 错误

#### 2. 任务创建功能修复
- 修复「新建任务」按钮跳转问题
- 添加 `tasks` 表 `start_date` 字段
- 统一任务状态值与数据库约束
- 修复后端 Insert 返回格式

### Bug 修复

| 问题 | 修复内容 |
|------|----------|
| 里程碑页面 500 错误 | 修复 PostgREST 风格嵌入查询语法不支持问题 |
| 新建任务按钮无响应 | 修复导航路径不一致问题 |
| 任务创建字段缺失 | 添加 `start_date` 字段到数据库 |
| 任务状态值不匹配 | 统一前端类型定义与数据库约束 |
| 任务处理人插入失败 | 修复 `created_by` 字段不匹配问题 |
| 任务详情页嵌入查询 | 修复评论和进度日志查询 500 错误 |

### 数据库变更

| 文件 | 变更内容 |
|------|----------|
| `011_create_task_extensions.sql` | 添加 `start_date` 字段到 `tasks` 表 |

---

## 2026-02-14

### Supabase 架构迁移 - Phase 3-6 完成

#### 1. 业务组件迁移（Phase 3）
- ✅ Milestones 里程碑组件
- ✅ Risks 风险组件
- ✅ Suppliers 供应商组件
- ✅ FunctionalModules 功能模块组件

**统计：** 4 个组件，34 处 Supabase 调用替换

#### 2. 剩余组件迁移（Phase 4）
- ✅ HotNewsTab 热点资讯组件
- ✅ ForumPostDetailPage 论坛帖子详情页
- ✅ ForumTab 论坛标签页
- ✅ SupplierDetailModal 供应商详情弹窗
- ✅ TaskProgressUpdateModal 任务进度更新弹窗
- ✅ MilestoneTaskList 里程碑任务列表
- ✅ MilestoneTemplates 里程碑模板管理
- ✅ ClientList 客户列表
- ✅ AIConfig AI配置
- ✅ AnalysisDashboard 分析仪表盘
- ✅ Reports 项目报告
- ✅ SupplierList 供应商列表
- ✅ ReportTemplates 报告模板
- ✅ 测试文件迁移

**统计：** 17 个组件 + 测试文件，98 处 Supabase 调用替换

#### 3. 类型定义修复（Phase 5-6）
- ✅ 修复 `api.ts` 类型定义
- ✅ 补充 `types/index.ts` 缺失类型
- ✅ 创建 `types/ai.ts` AI 相关类型
- ✅ 创建 `types/water.ts` 水区模块类型
- ✅ 修复所有 Service 层类型不匹配
- ✅ 修复所有组件类型错误

**统计：** 240 个类型错误全部修复

#### 4. 依赖移除
- ✅ 从 `package.json` 中移除 `@supabase/supabase-js`

### Bug 修复

| 问题 | 修复内容 |
|------|----------|
| 新增用户功能 404/401 | 修复 nginx 代理配置，添加 `/api/auth/create-user` 端点 |

---

## 2026-02-13

### Supabase 移除与重构项目

#### 1. 后端基础架构搭建
- ✅ 创建 Express.js + TypeScript 项目结构
- ✅ 配置 Docker 开发环境（PostgreSQL + Redis + MinIO）
- ✅ 实现数据库连接和 Knex.js 配置
- ✅ 创建完整的 20+ 张数据库表 Schema

#### 2. 核心服务实现
- ✅ JWT 服务：token 生成、验证、刷新
- ✅ 认证服务：登录、注册、会话管理
- ✅ 权限服务：角色权限控制（替代 RLS）
- ✅ 存储服务：MinIO 文件上传/下载

#### 3. API 路由实现
- ✅ 认证 API：`/auth/v1/token`、`/auth/v1/signup` 等
- ✅ REST API：`/rest/v1/:table` 通用 CRUD
- ✅ 存储 API：`/storage/v1/object/:bucket/:path`

#### 4. 前端迁移
- ✅ 重写 `src/lib/supabase.ts` 为兼容层
- ✅ 迁移登录页面、Dashboard、项目列表等页面

#### 5. 数据迁移
- ✅ 创建种子脚本插入演示数据
- ✅ 管理员账号配置
- ⚠️ 云端数据部分迁移（4 个表成功，16 个表因 schema 差异失败）

### 数据库表结构

| 表名 | 说明 |
|------|------|
| profiles | 用户资料 |
| projects | 项目 |
| project_milestones | 项目里程碑 |
| tasks | 任务 |
| task_assignees | 任务处理人 |
| task_history | 任务历史记录（新增） |
| suppliers | 供应商 |
| project_suppliers | 项目供应商关联 |
| files | 文件 |
| forum_posts | 论坛帖子 |
| hot_news | 热点资讯 |
| app_roles | 应用角色 |
| milestone_templates | 里程碑模板 |

---

## 2026-02-12

### 功能开发

#### 1. 任务列表功能增强
- ✅ 到期高亮功能：即将到期和已超期任务高亮显示
- ✅ 默认排序功能：按截止日期和优先级排序
- ✅ 任务进度拖拽条：可视化调整任务进度

#### 2. 统计功能
- ✅ 任务完成趋势图：展示任务完成情况趋势
- ✅ 功能模块统计卡片：显示各模块任务数量
- ✅ 统计卡片联动筛选：点击卡片筛选对应任务

#### 3. 供应商管理优化
- ✅ 供应商验收付款优化：改进验收和付款流程

#### 4. UI 优化
- ✅ 日期选择器优化：改进日期选择交互
- ✅ 新建任务页面化：从弹窗改为独立页面
- ✅ 项目列表交互优化：改进列表操作体验

### Bug 修复

| 问题 | 修复内容 |
|------|----------|
| 点赞数显示异常 | 修复点赞数量统计错误 |
| 里程碑页面 UI | 修复里程碑页面样式和逻辑问题 |

---

## 记录说明

- **格式**：按日期倒序排列，每日工作分类记录
- **标签**：✅ 已完成 | 🔄 进行中 | ⚠️ 有问题
- **数据库变更**：所有数据库变更必须同步到迁移脚本
- **文件变更**：重要文件变更需记录路径和操作类型

---

*最后更新：2026-02-16*
