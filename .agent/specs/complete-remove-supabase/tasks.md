# 完全脱离 Supabase 实施任务计划

## 任务总览

**总任务数**: 45个  
**预估工时**: 30-40小时  
**执行顺序**: 按阶段顺序执行

---

## Phase 1: Service 层增强（前置任务）

### 1.1 创建 notificationService
- [ ] 创建 `src/services/notificationService.ts`
- [ ] 实现 getNotifications 方法
- [ ] 实现 getUnreadCount 方法
- [ ] 实现 markAsRead 方法
- [ ] 实现 markAllAsRead 方法
- [ ] 实现 deleteNotification 方法
- [ ] 在 `src/services/index.ts` 中导出

### 1.2 增强 taskService
- [ ] 添加 getTasksByProject 方法
- [ ] 添加 getTasksByAssignee 方法
- [ ] 添加 getTaskWithDetails 方法
- [ ] 添加 batchUpdateTasks 方法
- [ ] 添加 searchTasks 方法

### 1.3 增强 projectService
- [ ] 添加 getProjectStats 方法
- [ ] 添加 getProjectMembers 方法
- [ ] 添加 addProjectMember 方法
- [ ] 添加 removeProjectMember 方法
- [ ] 添加 getProjectProgress 方法

### 1.4 增强 fileService
- [ ] 添加 uploadMultipleFiles 方法
- [ ] 添加 getStorageQuota 方法
- [ ] 添加 moveFile 方法
- [ ] 添加 copyFile 方法

### 1.5 增强 authService
- [ ] 添加 signInWithPassword 方法
- [ ] 添加 getSession 方法
- [ ] 添加 onAuthStateChange 方法

---

## Phase 2: 核心组件改造（高优先级）

### 2.1 改造 AuthContext
- [ ] 分析 `src/context/AuthContext.tsx` 中的 supabase 使用
- [ ] 替换 supabase.auth.getSession 调用
- [ ] 替换 supabase.auth.onAuthStateChange 调用
- [ ] 验证认证流程正常

### 2.2 改造 TaskDetailPage
- [ ] 分析 `src/pages/tasks/TaskDetailPage.tsx` 中的 supabase 调用
- [ ] 替换任务查询调用
- [ ] 替换任务评论查询
- [ ] 替换任务进度日志查询
- [ ] 替换任务分配操作
- [ ] 验证任务详情页功能

### 2.3 改造 TaskCreatePage
- [ ] 分析 `src/pages/tasks/TaskCreatePage.tsx` 中的 supabase 调用
- [ ] 替换任务创建调用
- [ ] 替换项目列表查询
- [ ] 替换用户列表查询
- [ ] 验证任务创建功能

### 2.4 改造 TaskDetail
- [ ] 分析 `src/pages/tasks/TaskDetail.tsx` 中的 supabase 调用
- [ ] 替换任务查询调用
- [ ] 替换相关数据查询
- [ ] 验证任务详情组件

### 2.5 改造 ProjectOverview
- [ ] 分析 `src/pages/projects/tabs/ProjectOverview.tsx` 中的 supabase 调用
- [ ] 替换项目统计查询
- [ ] 替换任务统计查询
- [ ] 替换风险查询
- [ ] 验证项目概览功能

### 2.6 改造 ProjectCreate
- [ ] 分析 `src/pages/projects/ProjectCreate.tsx` 中的 supabase 调用
- [ ] 替换项目创建调用
- [ ] 替换客户列表查询
- [ ] 验证项目创建功能

---

## Phase 3: 业务组件改造（中优先级）

### 3.1 改造 Milestones
- [ ] 分析 `src/pages/projects/tabs/Milestones.tsx` 中的 supabase 调用
- [ ] 替换里程碑查询和操作
- [ ] 验证里程碑功能

### 3.2 改造 Risks
- [ ] 分析 `src/pages/projects/tabs/Risks.tsx` 中的 supabase 调用
- [ ] 替换风险查询和操作
- [ ] 验证风险功能

### 3.3 改造 Suppliers（项目标签页）
- [ ] 分析 `src/pages/projects/tabs/Suppliers.tsx` 中的 supabase 调用
- [ ] 替换供应商查询和操作
- [ ] 验证供应商功能

### 3.4 改造 FunctionalModules
- [ ] 分析 `src/pages/projects/tabs/FunctionalModules.tsx` 中的 supabase 调用
- [ ] 替换模块查询和操作
- [ ] 验证功能模块

### 3.5 改造 Reports（项目标签页）
- [ ] 分析 `src/pages/projects/tabs/Reports.tsx` 中的 supabase 调用
- [ ] 替换报告查询
- [ ] 验证报告功能

### 3.6 改造 MilestoneTaskList
- [ ] 分析 `src/pages/projects/components/MilestoneTaskList.tsx` 中的 supabase 调用
- [ ] 替换任务查询
- [ ] 验证里程碑任务列表

### 3.7 改造 SupplierDetailModal
- [ ] 分析 `src/pages/projects/components/SupplierDetailModal.tsx` 中的 supabase 调用
- [ ] 替换供应商详情查询
- [ ] 替换验收记录操作
- [ ] 验证供应商详情弹窗

### 3.8 改造 ForumTab
- [ ] 分析 `src/pages/water/ForumTab.tsx` 中的 supabase 调用
- [ ] 替换帖子查询
- [ ] 验证论坛标签页

### 3.9 改造 ForumPostDetailPage
- [ ] 分析 `src/pages/water/ForumPostDetailPage.tsx` 中的 supabase 调用
- [ ] 替换帖子详情查询
- [ ] 替换回复操作
- [ ] 验证帖子详情页

### 3.10 改造 SupplierList
- [ ] 分析 `src/pages/suppliers/SupplierList.tsx` 中的 supabase 调用
- [ ] 替换供应商列表查询
- [ ] 验证供应商列表

### 3.11 改造 ClientList
- [ ] 分析 `src/pages/stakeholders/ClientList.tsx` 中的 supabase 调用
- [ ] 替换客户列表查询
- [ ] 验证客户列表

### 3.12 改造 AnalysisDashboard
- [ ] 分析 `src/pages/analysis/AnalysisDashboard.tsx` 中的 supabase 调用
- [ ] 替换统计数据查询
- [ ] 验证分析仪表板

### 3.13 改造 Notifications
- [ ] 分析 `src/components/Notifications.tsx` 中的 supabase 调用
- [ ] 替换通知查询和操作
- [ ] 验证通知组件

### 3.14 改造 FileUploadButton
- [ ] 分析 `src/components/FileUploadButton.tsx` 中的 supabase 调用
- [ ] 替换文件上传调用
- [ ] 验证文件上传按钮

### 3.15 改造 TaskProgressUpdateModal
- [ ] 分析 `src/pages/tasks/components/TaskProgressUpdateModal.tsx` 中的 supabase 调用
- [ ] 替换进度更新调用
- [ ] 验证进度更新弹窗

---

## Phase 4: 系统组件改造（低优先级）

### 4.1 改造 MilestoneTemplates
- [ ] 分析 `src/pages/system/tabs/MilestoneTemplates.tsx` 中的 supabase 调用
- [ ] 替换模板查询和操作
- [ ] 验证里程碑模板

### 4.2 改造 AIConfig
- [ ] 分析 `src/pages/system/tabs/AIConfig.tsx` 中的 supabase 调用
- [ ] 替换 AI 配置查询
- [ ] 验证 AI 配置

### 4.3 改造 HotNewsConfig
- [ ] 分析 `src/pages/system/tabs/HotNewsConfig.tsx` 中的 supabase 调用
- [ ] 替换热点配置查询
- [ ] 验证热点配置

### 4.4 改造 ReportTemplates
- [ ] 分析 `src/pages/system/tabs/ReportTemplates.tsx` 中的 supabase 调用
- [ ] 替换报告模板查询
- [ ] 验证报告模板

### 4.5 改造 ReportEditor
- [ ] 分析 `src/pages/projects/reports/ReportEditor.tsx` 中的 supabase 调用
- [ ] 替换报告编辑操作
- [ ] 验证报告编辑器

### 4.6 改造 HotNewsTab
- [ ] 分析 `src/pages/water/HotNewsTab.tsx` 中的 supabase 调用
- [ ] 替换热点查询
- [ ] 验证热点标签页

---

## Phase 5: 其他文件改造

### 5.1 改造 Profile 页面
- [ ] 分析 `src/pages/Profile.tsx` 中的 supabase 调用
- [ ] 替换用户资料查询和更新
- [ ] 验证个人资料页

### 5.2 改造测试文件
- [ ] 分析 `src/pages/Login.test.tsx` 中的 supabase mock
- [ ] 替换为 Service mock
- [ ] 分析 `src/pages/tasks/TaskDetail.test.tsx` 中的 supabase mock
- [ ] 替换为 Service mock

---

## Phase 6: 清理与验证

### 6.1 删除兼容层
- [ ] 删除 `src/lib/supabase.ts` 文件
- [ ] 检查是否还有其他 supabase 相关文件

### 6.2 类型检查
- [ ] 运行 `npm run check` 检查类型错误
- [ ] 修复剩余的类型错误

### 6.3 代码检查
- [ ] 运行 `grep -r "from.*supabase" src/ --include="*.ts" --include="*.tsx"` 检查导入
- [ ] 运行 `grep -r "supabase\." src/ --include="*.ts" --include="*.tsx"` 检查使用
- [ ] 确保无 supabase 相关代码

### 6.4 功能验证
- [ ] 启动前后端服务
- [ ] 验证登录/登出
- [ ] 验证用户管理
- [ ] 验证角色权限
- [ ] 验证任务管理（列表、创建、详情、更新、删除）
- [ ] 验证项目管理（列表、创建、详情、里程碑、风险）
- [ ] 验证文件管理
- [ ] 验证论坛功能
- [ ] 验证供应商管理
- [ ] 验证客户管理

### 6.5 文档更新
- [ ] 更新项目文档，标记改造完成
- [ ] 更新开发日报

---

## 执行建议

### 执行方式
由于任务较多，建议按以下方式执行：

1. **一次性执行所有任务**（如果允许长时间运行）
2. **按 Phase 分批执行**（推荐）
   - 先执行 Phase 1（Service 增强）
   - 再执行 Phase 2-4（组件改造）
   - 最后执行 Phase 5-6（清理验证）

### 执行命令
```bash
# 执行单个任务
@tasks.md 执行任务编号

# 执行多个任务
@tasks.md 执行任务1,任务2,任务3

# 执行整个 Phase
@tasks.md 执行Phase 1
```

---

## 风险与应对

| 风险 | 可能性 | 影响 | 应对策略 |
|------|--------|------|----------|
| 组件改造遗漏 | 中 | 高 | 使用 grep 全面检查 |
| 功能回归 | 中 | 高 | 完整功能验证清单 |
| 类型错误过多 | 低 | 中 | 逐步修复，优先关键错误 |
| 后端 API 不匹配 | 低 | 高 | 提前验证 API 支持 |

---

## 完成标准

- [ ] 所有 45 个任务完成
- [ ] 无 supabase 相关代码
- [ ] TypeScript 编译通过
- [ ] 所有功能验证通过
- [ ] 系统运行正常
