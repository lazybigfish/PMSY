# 移除 Supabase 兼容层 - 实施方案 B

## 一、现状分析

### 1.1 问题概述
- **总计**: 130 个 supabase 调用，分布在 27 个文件中
- **当前方案**: 使用 `supabase.ts` 兼容层将 Supabase 调用转换为 REST API
- **问题**: 兼容层需要持续维护，每次新方法都需要前后端配合实现

### 1.2 调用分布
| 模块 | 调用次数 | 文件数 |
|------|---------|--------|
| 任务管理 | 36 | 4 |
| 项目管理 | 34 | 7 |
| 系统管理 | 27 | 5 |
| 文件服务 | 13 | 1 |
| 水区/论坛 | 7 | 2 |
| 其他 | 13 | 8 |

### 1.3 涉及的数据库表
- 核心表: tasks, projects, profiles, project_modules, risks 等
- 系统表: app_roles, role_permissions, ai_providers 等
- 文件表: file_operation_logs

---

## 二、目标架构

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (React)                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   页面组件    │  │   页面组件    │  │   页面组件    │      │
│  │ (RoleManage) │  │ (TaskDetail) │  │ (ProjectList)│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │              │
│         └─────────────────┼─────────────────┘              │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Service Layer (领域服务层)                │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │  │
│  │  │roleService│ │taskService│ │userService│ │fileSvc  │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Client (统一请求层)                  │  │
│  │         get / post / patch / delete                  │  │
│  └────────────────────────┬─────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端 API (api-new)                        │
│              RESTful API /rest/v1/:table                   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构
```
src/
├── lib/
│   ├── api.ts              # 统一 API 客户端 (已存在)
│   └── supabase.ts         # 待删除的兼容层
├── services/               # 新增: 领域服务层
│   ├── index.ts            # 服务导出
│   ├── authService.ts      # 认证服务
│   ├── userService.ts      # 用户服务
│   ├── roleService.ts      # 角色服务
│   ├── taskService.ts      # 任务服务
│   ├── projectService.ts   # 项目服务
│   ├── fileService.ts      # 文件服务 (改造)
│   └── ...
├── types/                  # 新增/完善: 类型定义
│   ├── api.ts              # API 相关类型
│   ├── user.ts             # 用户类型
│   ├── task.ts             # 任务类型
│   └── ...
└── pages/
    └── ...                 # 页面组件 (调用 service)
```

---

## 三、实施阶段

### Phase 1: 基础设施 (2-3 小时)

#### 任务 1.1: 完善 API 客户端
- [ ] 检查 `src/lib/api.ts` 是否支持所有 HTTP 方法
- [ ] 统一错误处理
- [ ] 添加请求/响应拦截器（如需）

#### 任务 1.2: 创建类型定义
- [ ] 创建 `src/types/api.ts` - 通用 API 类型
- [ ] 创建 `src/types/user.ts` - 用户相关类型
- [ ] 创建 `src/types/task.ts` - 任务相关类型
- [ ] 创建 `src/types/project.ts` - 项目相关类型
- [ ] 创建 `src/types/role.ts` - 角色权限类型

#### 任务 1.3: 创建 Service 目录结构
- [ ] 创建 `src/services/index.ts` 导出文件
- [ ] 创建服务模板

---

### Phase 2: 核心服务实现 (4-6 小时)

#### 任务 2.1: 认证服务 (authService)
**涉及文件**: `src/context/AuthContext.tsx`
**改造内容**:
- [ ] 创建 `src/services/authService.ts`
- [ ] 实现 login/logout/getCurrentUser 方法
- [ ] 改造 AuthContext 使用 authService

#### 任务 2.2: 角色服务 (roleService)
**涉及文件**: 
- `src/pages/system/tabs/RoleManagement.tsx` (5 次调用)
- `src/pages/system/tabs/UserManagement.tsx` (2 次调用)

**改造内容**:
- [ ] 创建 `src/services/roleService.ts`
- [ ] 实现 getRoles / saveRole / deleteRole 方法
- [ ] 实现 getRolePermissions / saveRolePermissions 方法
- [ ] 改造 RoleManagement 使用 roleService
- [ ] 改造 UserManagement 使用 roleService

#### 任务 2.3: 用户服务 (userService)
**涉及文件**:
- `src/pages/system/tabs/UserManagement.tsx`
- 多处使用 profiles 表查询

**改造内容**:
- [ ] 创建 `src/services/userService.ts`
- [ ] 实现 getUsers / getUserById / updateUser 方法
- [ ] 改造相关组件使用 userService

#### 任务 2.4: 文件服务 (fileService)
**涉及文件**: `src/services/fileService.ts` (13 次调用)

**改造内容**:
- [ ] 改造 `src/services/fileService.ts`
- [ ] 替换 supabase.storage 调用为 REST API
- [ ] 保持原有 API 接口不变（内部实现改造）

---

### Phase 3: 业务模块改造 (8-12 小时)

#### 任务 3.1: 任务管理服务 (taskService)
**涉及文件**:
- `src/pages/tasks/TaskDetailPage.tsx` (15 次调用)
- `src/pages/tasks/components/TaskDetail.tsx` (14 次调用)
- `src/pages/tasks/TaskCreatePage.tsx` (4 次调用)
- `src/pages/tasks/components/TaskProgressUpdateModal.tsx` (3 次调用)

**改造内容**:
- [ ] 创建 `src/services/taskService.ts`
- [ ] 实现 getTasks / getTaskById / createTask / updateTask / deleteTask
- [ ] 实现 getTaskComments / addTaskComment
- [ ] 实现 getTaskProgress / updateTaskProgress
- [ ] 实现 getTaskAssignees / assignTask
- [ ] 改造 TaskDetailPage 使用 taskService
- [ ] 改造 TaskDetail 使用 taskService
- [ ] 改造 TaskCreatePage 使用 taskService
- [ ] 改造 TaskProgressUpdateModal 使用 taskService

#### 任务 3.2: 项目管理服务 (projectService)
**涉及文件**:
- `src/pages/projects/tabs/ProjectOverview.tsx` (9 次调用)
- `src/pages/projects/tabs/FunctionalModules.tsx` (7 次调用)
- `src/pages/projects/reports/ReportEditor.tsx` (8 次调用)
- `src/pages/projects/tabs/Milestones.tsx` (5 次调用)
- `src/pages/projects/ProjectCreate.tsx` (1 次调用)
- `src/pages/projects/components/MilestoneTaskList.tsx` (2 次调用)

**改造内容**:
- [ ] 创建 `src/services/projectService.ts`
- [ ] 实现 getProjects / getProjectById / createProject / updateProject
- [ ] 实现 getProjectModules / updateProjectModules
- [ ] 实现 getMilestones / createMilestone
- [ ] 实现 getRisks / createRisk
- [ ] 改造 ProjectOverview 使用 projectService
- [ ] 改造 FunctionalModules 使用 projectService
- [ ] 改造 ReportEditor 使用 projectService
- [ ] 改造 Milestones 使用 projectService
- [ ] 改造 ProjectCreate 使用 projectService
- [ ] 改造 MilestoneTaskList 使用 projectService

#### 任务 3.3: 系统配置服务 (systemService)
**涉及文件**:
- `src/pages/system/tabs/MilestoneTemplates.tsx` (8 次调用)
- `src/pages/system/tabs/AIConfig.tsx` (6 次调用)
- `src/pages/system/tabs/HotNewsConfig.tsx` (1 次调用)

**改造内容**:
- [ ] 创建 `src/services/systemService.ts`
- [ ] 实现里程碑模板相关方法
- [ ] 实现 AI 配置相关方法
- [ ] 改造 MilestoneTemplates 使用 systemService
- [ ] 改造 AIConfig 使用 systemService
- [ ] 改造 HotNewsConfig 使用 systemService

#### 任务 3.4: 水区/论坛服务 (forumService)
**涉及文件**:
- `src/pages/water/ForumTab.tsx` (5 次调用)
- `src/pages/water/ForumPostDetailPage.tsx` (2 次调用)

**改造内容**:
- [ ] 创建 `src/services/forumService.ts`
- [ ] 实现 getPosts / createPost / getReplies / addReply
- [ ] 改造 ForumTab 使用 forumService
- [ ] 改造 ForumPostDetailPage 使用 forumService

#### 任务 3.5: 其他服务
**涉及文件**:
- `src/pages/projects/tabs/Suppliers.tsx` (3 次调用)
- `src/pages/projects/tabs/Risks.tsx` (2 次调用)
- `src/pages/analysis/AnalysisDashboard.tsx` (3 次调用)
- `src/pages/stakeholders/ClientList.tsx` (1 次调用)

**改造内容**:
- [ ] 创建 `src/services/supplierService.ts`
- [ ] 创建 `src/services/analysisService.ts`
- [ ] 创建 `src/services/clientService.ts`
- [ ] 改造对应组件使用新服务

---

### Phase 4: 清理与验证 (3-4 小时)

#### 任务 4.1: 删除 Supabase 兼容层
- [ ] 删除 `src/lib/supabase.ts`
- [ ] 删除 `src/lib/supabase-browser.ts`（如存在）
- [ ] 删除 `src/lib/supabase-server.ts`（如存在）

#### 任务 4.2: 清理依赖
- [ ] 从 `package.json` 移除 `@supabase/supabase-js`
- [ ] 运行 `npm install` 更新依赖
- [ ] 检查是否还有其他 supabase 相关依赖

#### 任务 4.3: 更新环境变量
- [ ] 检查 `.env` 文件，移除 Supabase 相关配置
- [ ] 更新 `.env.example` 文档

#### 任务 4.4: 更新测试
- [ ] 改造 `src/pages/tasks/components/__tests__/TaskDetail.test.tsx`
- [ ] 改造 `src/pages/Login.test.tsx`
- [ ] 改造 `src/pages/projects/ProjectList.test.tsx`
- [ ] 移除 supabase mock

#### 任务 4.5: 验证
- [ ] 登录/登出功能
- [ ] 用户管理（CRUD）
- [ ] 角色权限管理
- [ ] 项目管理（CRUD）
- [ ] 任务管理（CRUD）
- [ ] 文件上传/下载
- [ ] 论坛功能

---

## 四、风险与应对

### 4.1 风险识别

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| 改造引入 Bug | 中 | 高 | 分阶段改造，每阶段充分测试 |
| 后端 API 不匹配 | 中 | 高 | 先验证后端 API，再改造前端 |
| 类型定义不完整 | 高 | 中 | 使用 TypeScript 严格模式检查 |
| 性能下降 | 低 | 中 | 添加请求缓存（如需要） |

### 4.2 回滚策略
- 每个 Phase 独立分支开发
- 保留 supabase.ts 直到最后验证通过
- 关键功能改造前创建备份分支

---

## 五、时间安排

| 阶段 | 预计时间 | 实际时间 | 状态 |
|------|---------|---------|------|
| Phase 1: 基础设施 | 2-3 小时 | - | 未开始 |
| Phase 2: 核心服务 | 4-6 小时 | - | 未开始 |
| Phase 3: 业务模块 | 8-12 小时 | - | 未开始 |
| Phase 4: 清理验证 | 3-4 小时 | - | 未开始 |
| **总计** | **17-25 小时** | - | - |

---

## 六、验收标准

1. **功能完整性**: 所有原有功能正常工作
2. **代码规范**: 无 supabase 相关导入
3. **类型安全**: TypeScript 无类型错误
4. **测试通过**: 所有测试用例通过
5. **性能**: 页面加载时间无明显下降

---

## 七、后续优化（可选）

1. **请求缓存**: 使用 React Query / SWR 缓存数据
2. **乐观更新**: 提升用户体验
3. **离线支持**: 使用 Service Worker
4. **API 文档**: 使用 Swagger/OpenAPI 生成文档

---

**计划制定时间**: 2026-02-14
**计划版本**: v1.0
