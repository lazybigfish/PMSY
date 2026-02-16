# 完全脱离 Supabase 架构改造需求规格说明书

## 1. 背景 (Context)

当前项目已完成前端架构改造，建立了 Service Layer 和兼容层，但仍有 30 个组件通过兼容层使用 supabase 调用。目标是完全移除所有 Supabase 相关代码和依赖，实现纯 REST API + Service Layer 架构。

## 2. 用户故事 (User Stories)

- 作为 **开发者**，我想要 **完全移除 Supabase 依赖**，以便 **项目不再受 Supabase 平台限制，提高架构独立性**。
- 作为 **维护者**，我想要 **所有组件使用统一的 Service Layer**，以便 **代码更易维护和测试**。
- 作为 **架构师**，我想要 **删除 supabase 兼容层**，以便 **架构更清晰，无技术债务**。

## 3. 验收标准 (Acceptance Criteria - EARS)

### 3.1 组件改造
- **前置条件**: 当项目中有使用 `supabase.from()` 的组件时
- **触发器**: 如果开发者查看组件代码
- **响应**: 系统应当 **所有组件都使用 `xxxService.xxx()` 调用，无 `supabase` 导入**

### 3.2 兼容层删除
- **前置条件**: 当所有组件改造完成时
- **触发器**: 如果执行代码搜索
- **响应**: 系统应当 **不存在 `src/lib/supabase.ts` 文件，无 supabase 相关导入**

### 3.3 类型检查
- **前置条件**: 当运行 TypeScript 类型检查时
- **触发器**: 如果执行 `npm run check`
- **响应**: 系统应当 **无 Supabase 相关类型错误**

### 3.4 功能验证
- **前置条件**: 当系统运行时
- **触发器**: 如果访问各功能模块
- **响应**: 系统应当 **所有功能正常工作，与改造前一致**

## 4. 边缘情况与风险 (Edge Cases)

### 4.1 复杂查询
- **风险**: 部分组件使用复杂的 supabase 查询（多表关联、嵌套查询）
- **应对**: 需要在 Service 层添加对应方法，或拆分查询

### 4.2 实时订阅
- **风险**: 如果有组件使用 Supabase 实时订阅功能
- **应对**: 需要评估是否需要替换为 WebSocket 或轮询

### 4.3 文件存储
- **风险**: 文件上传/下载可能依赖 Supabase Storage
- **应对**: 确保 fileService 完全替代原有功能

### 4.4 认证流程
- **风险**: 认证流程可能深度集成 Supabase Auth
- **应对**: 已完成的 authService 需要验证完整性

## 5. 改造范围

### 5.1 必须改造的文件（30个）

| 序号 | 文件路径 | 优先级 | 复杂度 |
|------|----------|--------|--------|
| 1 | src/pages/tasks/TaskDetailPage.tsx | 高 | 高 |
| 2 | src/pages/tasks/TaskCreatePage.tsx | 高 | 中 |
| 3 | src/pages/tasks/TaskDetail.tsx | 高 | 高 |
| 4 | src/pages/projects/tabs/ProjectOverview.tsx | 高 | 高 |
| 5 | src/pages/projects/ProjectCreate.tsx | 高 | 中 |
| 6 | src/pages/projects/tabs/Milestones.tsx | 中 | 中 |
| 7 | src/pages/projects/tabs/Risks.tsx | 中 | 中 |
| 8 | src/pages/projects/tabs/Suppliers.tsx | 中 | 中 |
| 9 | src/pages/projects/tabs/FunctionalModules.tsx | 中 | 高 |
| 10 | src/pages/projects/tabs/Reports.tsx | 中 | 中 |
| 11 | src/pages/projects/components/MilestoneTaskList.tsx | 中 | 中 |
| 12 | src/pages/projects/components/SupplierDetailModal.tsx | 中 | 高 |
| 13 | src/pages/water/ForumTab.tsx | 中 | 中 |
| 14 | src/pages/water/ForumPostDetailPage.tsx | 中 | 中 |
| 15 | src/pages/water/HotNewsTab.tsx | 低 | 低 |
| 16 | src/pages/system/tabs/MilestoneTemplates.tsx | 低 | 中 |
| 17 | src/pages/system/tabs/AIConfig.tsx | 低 | 中 |
| 18 | src/pages/system/tabs/HotNewsConfig.tsx | 低 | 低 |
| 19 | src/pages/system/tabs/ReportTemplates.tsx | 低 | 中 |
| 20 | src/pages/suppliers/SupplierList.tsx | 中 | 中 |
| 21 | src/pages/stakeholders/ClientList.tsx | 中 | 中 |
| 22 | src/pages/analysis/AnalysisDashboard.tsx | 中 | 中 |
| 23 | src/pages/projects/reports/ReportEditor.tsx | 低 | 中 |
| 24 | src/components/Notifications.tsx | 中 | 中 |
| 25 | src/components/FileUploadButton.tsx | 中 | 中 |
| 26 | src/pages/tasks/components/TaskProgressUpdateModal.tsx | 中 | 中 |
| 27 | src/context/AuthContext.tsx | 高 | 高 |
| 28 | src/pages/Profile.tsx | 中 | 低 |
| 29 | src/pages/Login.test.tsx | 低 | 低 |
| 30 | src/pages/tasks/TaskDetail.test.tsx | 低 | 低 |

### 5.2 需要增强的 Service

| Service | 需要添加的方法 |
|---------|---------------|
| taskService | 复杂查询、批量操作 |
| projectService | 统计查询、关联查询 |
| fileService | 完整 Storage 替代 |
| notificationService | 新增服务 |

### 5.3 需要删除的文件

- `src/lib/supabase.ts` - 兼容层
- 所有 `import { supabase } from '../lib/supabase'` 语句

## 6. 成功标准

1. ✅ 代码中无 `supabase` 关键字（除历史文档外）
2. ✅ 无 `src/lib/supabase.ts` 文件
3. ✅ TypeScript 编译无错误
4. ✅ 所有功能测试通过
5. ✅ 系统运行正常
