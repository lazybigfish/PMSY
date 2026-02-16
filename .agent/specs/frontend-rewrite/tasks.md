# 前端系统重写任务计划

## 任务执行说明

- 每个任务都是原子化的，可在一个 Agent 对话中完成
- 任务必须按阶段顺序执行，部分任务有依赖关系
- 完成任务后需更新此文档中的复选框状态

---

## Phase 1: 基础架构搭建 (第 1-2 周)

### 1.1 项目初始化与配置

- [ ] **任务 1.1.1**: 创建新的前端项目目录结构
  - 创建 `src-new/` 目录作为重写项目根目录
  - 按照设计文档建立完整目录结构
  - 创建必要的配置文件（.gitignore、README 等）

- [ ] **任务 1.1.2**: 初始化项目依赖
  - 初始化 package.json
  - 安装核心依赖：React 18、TypeScript、Vite
  - 安装 UI 依赖：Tailwind CSS、Radix UI、Lucide React
  - 安装状态管理：TanStack Query、Zustand
  - 安装开发工具：ESLint、Prettier、Vitest

- [ ] **任务 1.1.3**: 配置 TypeScript 严格模式
  - 配置 tsconfig.json 启用 strict 模式
  - 配置路径别名（@/components、@/hooks 等）
  - 验证配置能正常编译

- [ ] **任务 1.1.4**: 配置代码规范工具
  - 配置 ESLint 规则（推荐 @typescript-eslint/recommended）
  - 配置 Prettier 格式化规则
  - 配置 Git 提交前钩子（lint-staged + husky）

### 1.2 类型系统建立

- [ ] **任务 1.2.1**: 创建基础类型定义
  - 创建 `src-new/types/common.ts`（通用类型：ID、Timestamp、Nullable 等）
  - 创建 `src-new/types/api.ts`（API 响应类型、错误类型、分页类型）
  - 创建 `src-new/types/models/index.ts`（模型类型导出）

- [ ] **任务 1.2.2**: 创建用户相关类型
  - 创建 `src-new/types/models/user.ts`
  - 定义 User、UserRole、AuthState 接口
  - 定义登录/注册输入类型

- [ ] **任务 1.2.3**: 创建项目相关类型
  - 创建 `src-new/types/models/project.ts`
  - 定义 Project、ProjectStatus 接口
  - 定义 ProjectCreateInput、ProjectUpdateInput 类型
  - 定义 ProjectModule、ProjectMilestone 相关类型

- [ ] **任务 1.2.4**: 创建任务相关类型
  - 创建 `src-new/types/models/task.ts`
  - 定义 Task、TaskStatus、TaskPriority 接口
  - 定义 TaskAssignee、TaskComment 相关类型

- [ ] **任务 1.2.5**: 创建供应商/客户相关类型
  - 创建 `src-new/types/models/supplier.ts`
  - 创建 `src-new/types/models/client.ts`
  - 定义相关实体和关联类型

- [ ] **任务 1.2.6**: 创建水漫金山模块类型
  - 创建 `src-new/types/models/forum.ts`
  - 定义 ForumPost、ForumComment、HotNews 等类型

### 1.3 API 客户端重构

- [ ] **任务 1.3.1**: 创建 Axios 客户端实例
  - 创建 `src-new/lib/api/client.ts`
  - 配置 baseURL、timeout、headers
  - 实现请求/响应拦截器框架

- [ ] **任务 1.3.2**: 实现请求拦截器
  - 自动添加 Authorization Header
  - 请求日志记录（开发环境）
  - 请求取消令牌管理

- [ ] **任务 1.3.3**: 实现响应拦截器
  - 统一错误处理
  - 401 自动跳转登录
  - 响应数据提取和格式化

- [ ] **任务 1.3.4**: 创建 API 端点定义
  - 创建 `src-new/lib/api/endpoints/auth.ts`（登录、注册、用户信息）
  - 创建 `src-new/lib/api/endpoints/projects.ts`（项目 CRUD）
  - 创建 `src-new/lib/api/endpoints/tasks.ts`（任务 CRUD）

- [ ] **任务 1.3.5**: 实现 API 错误处理
  - 创建 `src-new/lib/errors.ts`
  - 定义 AppError 类
  - 实现错误分类和处理函数

### 1.4 工具函数和常量

- [ ] **任务 1.4.1**: 创建通用工具函数
  - 创建 `src-new/lib/utils/format.ts`（日期、金额格式化）
  - 创建 `src-new/lib/utils/validate.ts`（常用验证函数）
  - 创建 `src-new/lib/utils/storage.ts`（localStorage 封装）

- [ ] **任务 1.4.2**: 创建常量定义
  - 创建 `src-new/lib/constants.ts`
  - 定义状态枚举值映射
  - 定义分页默认值
  - 定义错误消息常量

---

## Phase 2: 核心模块重写 (第 3-5 周)

### 2.1 状态管理搭建

- [ ] **任务 2.1.1**: 配置 TanStack Query Provider
  - 创建 `src-new/providers/QueryProvider.tsx`
  - 配置 QueryClient（缓存、重试策略）
  - 集成 React Query Devtools（开发环境）

- [ ] **任务 2.1.2**: 创建认证状态管理
  - 创建 `src-new/stores/authStore.ts`（Zustand）
  - 实现登录状态、用户信息存储
  - 实现登录/登出 Action

- [ ] **任务 2.1.3**: 创建 UI 状态管理
  - 创建 `src-new/stores/uiStore.ts`
  - 实现侧边栏状态、主题状态
  - 实现全局 Loading 状态

### 2.2 基础 UI 组件

- [ ] **任务 2.2.1**: 创建基础 UI 组件 - 表单类
  - 创建 `src-new/components/ui/button.tsx`
  - 创建 `src-new/components/ui/input.tsx`
  - 创建 `src-new/components/ui/textarea.tsx`
  - 创建 `src-new/components/ui/select.tsx`
  - 创建 `src-new/components/ui/label.tsx`

- [ ] **任务 2.2.2**: 创建基础 UI 组件 - 反馈类
  - 创建 `src-new/components/ui/dialog.tsx`
  - 创建 `src-new/components/ui/alert.tsx`
  - 创建 `src-new/components/ui/toast.tsx`
  - 创建 `src-new/components/ui/skeleton.tsx`

- [ ] **任务 2.2.3**: 创建基础 UI 组件 - 数据展示类
  - 创建 `src-new/components/ui/table.tsx`
  - 创建 `src-new/components/ui/card.tsx`
  - 创建 `src-new/components/ui/badge.tsx`
  - 创建 `src-new/components/ui/avatar.tsx`

- [ ] **任务 2.2.4**: 创建基础 UI 组件 - 导航类
  - 创建 `src-new/components/ui/tabs.tsx`
  - 创建 `src-new/components/ui/dropdown-menu.tsx`
  - 创建 `src-new/components/ui/breadcrumb.tsx`

### 2.3 布局组件

- [ ] **任务 2.3.1**: 创建主布局组件
  - 创建 `src-new/components/layout/MainLayout.tsx`
  - 实现整体布局结构（Header + Sidebar + Content）
  - 集成路由出口

- [ ] **任务 2.3.2**: 创建侧边栏组件
  - 创建 `src-new/components/layout/Sidebar.tsx`
  - 实现导航菜单
  - 实现菜单权限控制

- [ ] **任务 2.3.3**: 创建顶部导航组件
  - 创建 `src-new/components/layout/Header.tsx`
  - 实现用户信息展示
  - 实现退出登录功能

### 2.4 认证模块重写

- [ ] **任务 2.4.1**: 创建认证相关 Hooks
  - 创建 `src-new/hooks/useAuth.ts`
  - 实现登录 Hook（useLogin）
  - 实现登出 Hook（useLogout）
  - 实现获取当前用户 Hook（useCurrentUser）

- [ ] **任务 2.4.2**: 创建登录页面
  - 创建 `src-new/pages/Login.tsx`
  - 实现登录表单（React Hook Form + Zod）
  - 集成登录 API 调用
  - 实现表单验证和错误提示

- [ ] **任务 2.4.3**: 创建路由守卫组件
  - 创建 `src-new/components/ProtectedRoute.tsx`
  - 实现认证检查
  - 实现权限角色检查

- [ ] **任务 2.4.4**: 配置路由
  - 创建 `src-new/routes/index.tsx`
  - 配置公开路由（/login）
  - 配置受保护路由（/*）

### 2.5 项目管理模块重写

- [ ] **任务 2.5.1**: 创建项目服务层
  - 创建 `src-new/services/projectService.ts`
  - 实现 getProjects、getProject、createProject、updateProject、deleteProject 方法

- [ ] **任务 2.5.2**: 创建项目相关 Hooks
  - 创建 `src-new/hooks/useProjects.ts`
  - 实现 useProjects、useProject、useCreateProject、useUpdateProject、useDeleteProject

- [ ] **任务 2.5.3**: 创建项目列表页面
  - 创建 `src-new/pages/projects/ProjectList.tsx`
  - 实现数据表格展示
  - 实现搜索和筛选功能
  - 实现分页功能

- [ ] **任务 2.5.4**: 创建项目详情页面
  - 创建 `src-new/pages/projects/ProjectDetail.tsx`
  - 实现项目基本信息展示
  - 实现项目里程碑展示
  - 实现项目任务列表

- [ ] **任务 2.5.5**: 创建项目表单组件
  - 创建 `src-new/components/modules/project/ProjectForm.tsx`
  - 实现创建/编辑项目表单
  - 集成表单验证

- [ ] **任务 2.5.6**: 创建项目创建/编辑页面
  - 创建 `src-new/pages/projects/ProjectCreate.tsx`
  - 创建 `src-new/pages/projects/ProjectEdit.tsx`
  - 复用 ProjectForm 组件

### 2.6 任务中心模块重写

- [ ] **任务 2.6.1**: 创建任务服务层
  - 创建 `src-new/services/taskService.ts`
  - 实现任务 CRUD 方法

- [ ] **任务 2.6.2**: 创建任务相关 Hooks
  - 创建 `src-new/hooks/useTasks.ts`
  - 实现任务查询和变更 Hooks

- [ ] **任务 2.6.3**: 创建任务列表页面
  - 创建 `src-new/pages/tasks/TaskList.tsx`
  - 实现看板视图或列表视图
  - 实现任务筛选和排序

- [ ] **任务 2.6.4**: 创建任务详情页面
  - 创建 `src-new/pages/tasks/TaskDetail.tsx`
  - 实现任务信息展示
  - 实现任务评论功能
  - 实现进度更新功能

- [ ] **任务 2.6.5**: 创建任务表单组件
  - 创建 `src-new/components/modules/task/TaskForm.tsx`
  - 实现任务创建/编辑表单

---

## Phase 3: 业务模块重写 (第 6-8 周)

### 3.1 相关方模块（供应商/客户）

- [ ] **任务 3.1.1**: 创建供应商服务层和 Hooks
  - 创建 `src-new/services/supplierService.ts`
  - 创建 `src-new/hooks/useSuppliers.ts`

- [ ] **任务 3.1.2**: 创建供应商列表页面
  - 创建 `src-new/pages/stakeholders/SupplierList.tsx`
  - 实现供应商表格展示
  - 实现供应商筛选

- [ ] **任务 3.1.3**: 创建供应商详情/编辑页面
  - 创建 `src-new/pages/stakeholders/SupplierDetail.tsx`
  - 创建 `src-new/pages/stakeholders/SupplierEdit.tsx`

- [ ] **任务 3.1.4**: 创建客户服务层和 Hooks
  - 创建 `src-new/services/clientService.ts`
  - 创建 `src-new/hooks/useClients.ts`

- [ ] **任务 3.1.5**: 创建客户列表和详情页面
  - 创建 `src-new/pages/stakeholders/ClientList.tsx`
  - 创建 `src-new/pages/stakeholders/ClientDetail.tsx`

### 3.2 水漫金山模块

- [ ] **任务 3.2.1**: 创建论坛服务层和 Hooks
  - 创建 `src-new/services/forumService.ts`
  - 创建 `src-new/hooks/useForum.ts`

- [ ] **任务 3.2.2**: 创建论坛帖子列表页面
  - 创建 `src-new/pages/water/ForumList.tsx`
  - 实现帖子列表展示

- [ ] **任务 3.2.3**: 创建论坛帖子详情页面
  - 创建 `src-new/pages/water/ForumDetail.tsx`
  - 实现帖子内容展示
  - 实现评论列表和发布

- [ ] **任务 3.2.4**: 创建热点资讯页面
  - 创建 `src-new/pages/water/HotNews.tsx`
  - 实现资讯列表展示

### 3.3 数据分析模块

- [ ] **任务 3.3.1**: 创建数据分析服务层
  - 创建 `src-new/services/analyticsService.ts`
  - 实现数据统计接口调用

- [ ] **任务 3.3.2**: 创建数据分析 Hooks
  - 创建 `src-new/hooks/useAnalytics.ts`

- [ ] **任务 3.3.3**: 创建数据分析仪表盘
  - 创建 `src-new/pages/analysis/AnalysisDashboard.tsx`
  - 实现图表组件集成
  - 实现数据可视化

### 3.4 文件管理模块

- [ ] **任务 3.4.1**: 创建文件服务层和 Hooks
  - 创建 `src-new/services/fileService.ts`
  - 创建 `src-new/hooks/useFiles.ts`

- [ ] **任务 3.4.2**: 创建文件管理页面
  - 创建 `src-new/pages/files/FileManager.tsx`
  - 实现文件列表展示
  - 实现文件上传/下载功能

### 3.5 系统管理模块

- [ ] **任务 3.5.1**: 创建系统设置页面
  - 创建 `src-new/pages/system/SystemSettings.tsx`
  - 实现系统配置展示和修改

- [ ] **任务 3.5.2**: 创建用户管理页面（管理员）
  - 创建 `src-new/pages/system/UserManagement.tsx`
  - 实现用户列表和管理功能

---

## Phase 4: 测试与优化 (第 9-10 周)

### 4.1 单元测试

- [ ] **任务 4.1.1**: 配置测试环境
  - 配置 Vitest
  - 配置 React Testing Library
  - 配置 MSW（Mock Service Worker）

- [ ] **任务 4.1.2**: 编写工具函数测试
  - 测试 `src-new/lib/utils/format.ts`
  - 测试 `src-new/lib/utils/validate.ts`
  - 测试 `src-new/lib/utils/storage.ts`

- [ ] **任务 4.1.3**: 编写 Hooks 测试
  - 测试 `src-new/hooks/useAuth.ts`
  - 测试 `src-new/hooks/useProjects.ts`
  - 测试 `src-new/hooks/useTasks.ts`

- [ ] **任务 4.1.4**: 编写组件测试
  - 测试基础 UI 组件
  - 测试业务组件

### 4.2 集成测试

- [ ] **任务 4.2.1**: 编写页面集成测试
  - 测试登录流程
  - 测试项目 CRUD 流程
  - 测试任务管理流程

### 4.3 E2E 测试

- [ ] **任务 4.3.1**: 配置 Playwright
  - 安装和配置 Playwright
  - 配置测试环境

- [ ] **任务 4.3.2**: 编写核心流程 E2E 测试
  - 测试用户登录流程
  - 测试项目创建流程
  - 测试任务创建和更新流程

### 4.4 性能优化

- [ ] **任务 4.4.1**: 实现代码分割
  - 配置路由懒加载
  - 优化首屏加载时间

- [ ] **任务 4.4.2**: 优化列表渲染
  - 大数据列表虚拟化
  - 图片懒加载

- [ ] **任务 4.4.3**: 优化状态管理
  - 审查不必要的重渲染
  - 优化 Query 缓存策略

---

## Phase 5: 部署与上线 (第 11-12 周)

### 5.1 部署准备

- [ ] **任务 5.1.1**: 配置生产环境构建
  - 配置 Vite 生产构建
  - 优化打包体积
  - 配置环境变量

- [ ] **任务 5.1.2**: 更新部署脚本
  - 更新 `deploy/` 目录下的部署脚本
  - 配置 Nginx 静态资源服务

### 5.2 灰度发布

- [ ] **任务 5.2.1**: 配置特性开关
  - 实现简单的 Feature Flag 机制
  - 控制新旧系统切换

- [ ] **任务 5.2.2**: 灰度发布执行
  - 部署到预发布环境
  - 小范围用户测试
  - 收集反馈和修复问题

### 5.3 全量上线

- [ ] **任务 5.3.1**: 生产环境部署
  - 全量切换到新系统
  - 监控关键指标

- [ ] **任务 5.3.2**: 旧系统下线
  - 备份旧系统代码
  - 清理旧系统资源

---

## 质量检查清单

### 代码质量
- [ ] 所有 TypeScript 文件通过严格模式检查
- [ ] 无 `any` 类型滥用（特殊情况需注释说明）
- [ ] 所有公共函数和组件有 JSDoc 注释
- [ ] 通过 ESLint 和 Prettier 检查

### 功能完整性
- [ ] 所有原有功能在新系统中可用
- [ ] UI 界面与原系统保持一致
- [ ] 用户操作流程与原系统一致

### 测试覆盖
- [ ] 单元测试覆盖率 > 80%
- [ ] 核心业务流程有 E2E 测试覆盖
- [ ] 所有测试用例通过

### 性能指标
- [ ] 首屏加载时间 < 3秒
- [ ] 交互响应时间 < 200ms
- [ ] 无内存泄漏

---

## 附录：任务依赖关系图

```
Phase 1: 基础架构
├── 1.1 项目初始化
│   ├── 1.1.1 目录结构
│   ├── 1.1.2 依赖安装
│   ├── 1.1.3 TS 配置
│   └── 1.1.4 代码规范
├── 1.2 类型系统
│   ├── 1.2.1 基础类型
│   ├── 1.2.2 用户类型
│   ├── 1.2.3 项目类型
│   ├── 1.2.4 任务类型
│   ├── 1.2.5 相关方类型
│   └── 1.2.6 水漫金山类型
├── 1.3 API 客户端
│   ├── 1.3.1 Axios 实例
│   ├── 1.3.2 请求拦截器
│   ├── 1.3.3 响应拦截器
│   ├── 1.3.4 API 端点
│   └── 1.3.5 错误处理
└── 1.4 工具函数
    ├── 1.4.1 通用工具
    └── 1.4.2 常量定义

Phase 2: 核心模块（依赖 Phase 1）
├── 2.1 状态管理
│   ├── 2.1.1 Query Provider
│   ├── 2.1.2 认证状态
│   └── 2.1.3 UI 状态
├── 2.2 基础 UI 组件
│   ├── 2.2.1 表单组件
│   ├── 2.2.2 反馈组件
│   ├── 2.2.3 数据展示组件
│   └── 2.2.4 导航组件
├── 2.3 布局组件
│   ├── 2.3.1 MainLayout
│   ├── 2.3.2 Sidebar
│   └── 2.3.3 Header
├── 2.4 认证模块
│   ├── 2.4.1 Auth Hooks
│   ├── 2.4.2 登录页面
│   ├── 2.4.3 路由守卫
│   └── 2.4.4 路由配置
├── 2.5 项目管理模块
│   ├── 2.5.1 Project Service
│   ├── 2.5.2 Project Hooks
│   ├── 2.5.3 项目列表
│   ├── 2.5.4 项目详情
│   ├── 2.5.5 项目表单
│   └── 2.5.6 创建/编辑页面
└── 2.6 任务中心模块
    ├── 2.6.1 Task Service
    ├── 2.6.2 Task Hooks
    ├── 2.6.3 任务列表
    ├── 2.6.4 任务详情
    └── 2.6.5 任务表单

Phase 3: 业务模块（依赖 Phase 2）
├── 3.1 相关方模块
├── 3.2 水漫金山模块
├── 3.3 数据分析模块
├── 3.4 文件管理模块
└── 3.5 系统管理模块

Phase 4: 测试与优化（依赖 Phase 3）
├── 4.1 单元测试
├── 4.2 集成测试
├── 4.3 E2E 测试
└── 4.4 性能优化

Phase 5: 部署与上线（依赖 Phase 4）
├── 5.1 部署准备
├── 5.2 灰度发布
└── 5.3 全量上线
```
