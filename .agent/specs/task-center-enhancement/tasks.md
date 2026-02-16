# 任务中心功能完善 - 实施计划

## 任务清单

### Phase 1: 数据库与后端基础

- [ ] **Task 1.1**: 创建任务历史记录表迁移文件
  - 文件: `api-new/database/migrations/005_add_task_history.sql`
  - 内容: task_history 表结构 + 触发器函数

- [ ] **Task 1.2**: 后端添加批量删除任务 API
  - 文件: `api-new/src/routes/tasks.ts`
  - 方法: POST /api/tasks/batch-delete
  - 要求: 事务处理，权限校验，返回删除结果

- [ ] **Task 1.3**: 后端添加批量修改状态 API
  - 文件: `api-new/src/routes/tasks.ts`
  - 方法: POST /api/tasks/batch-status
  - 要求: 批量更新，触发器自动记录历史

- [ ] **Task 1.4**: 后端添加批量分配处理人 API
  - 文件: `api-new/src/routes/tasks.ts`
  - 方法: POST /api/tasks/batch-assign
  - 要求: 支持 append/replace 模式

- [ ] **Task 1.5**: 后端添加获取任务历史 API
  - 文件: `api-new/src/routes/tasks.ts`
  - 方法: GET /api/tasks/:id/history
  - 要求: 关联查询用户信息，按时间倒序

### Phase 2: 前端类型与服务层

- [ ] **Task 2.1**: 扩展任务类型定义
  - 文件: `src/types/task.ts`
  - 内容: 添加 TaskHistory 接口和批量操作请求类型

- [ ] **Task 2.2**: 扩展 taskService 服务
  - 文件: `src/services/taskService.ts`
  - 内容: 添加批量操作方法和历史记录查询

### Phase 3: 批量操作前端组件

- [ ] **Task 3.1**: 实现 BatchActionBar 组件
  - 文件: `src/pages/tasks/components/BatchActionBar.tsx`
  - 功能: 显示选中数量，提供批量操作入口

- [ ] **Task 3.2**: 实现 BatchDeleteModal 组件
  - 文件: `src/pages/tasks/components/BatchDeleteModal.tsx`
  - 功能: 确认弹窗，显示待删除任务数量

- [ ] **Task 3.3**: 实现 BatchStatusModal 组件
  - 文件: `src/pages/tasks/components/BatchStatusModal.tsx`
  - 功能: 状态选择，确认修改

- [ ] **Task 3.4**: 实现 BatchAssignModal 组件
  - 文件: `src/pages/tasks/components/BatchAssignModal.tsx`
  - 功能: 人员选择，支持多选

### Phase 4: 任务列表集成批量操作

- [ ] **Task 4.1**: 修改 TaskList 页面集成批量操作
  - 文件: `src/pages/tasks/TaskList.tsx`
  - 内容: 引入 BatchActionBar，管理弹窗状态，处理批量操作回调

### Phase 5: 任务详情完善

- [ ] **Task 5.1**: 实现 TaskHistory 组件
  - 文件: `src/pages/tasks/components/TaskHistory.tsx`
  - 功能: 展示任务历史记录列表

- [ ] **Task 5.2**: 修改 TaskDetailPage 添加优先级编辑
  - 文件: `src/pages/tasks/TaskDetailPage.tsx`
  - 内容: 优先级字段可编辑，保存后刷新历史

- [ ] **Task 5.3**: 修改 TaskDetailPage 添加截止日期编辑
  - 文件: `src/pages/tasks/TaskDetailPage.tsx`
  - 内容: 截止日期字段可编辑，日期选择器

- [ ] **Task 5.4**: 修改 TaskDetailPage 集成历史记录
  - 文件: `src/pages/tasks/TaskDetailPage.tsx`
  - 内容: 历史 Tab 使用 TaskHistory 组件

### Phase 6: 测试与优化

- [ ] **Task 6.1**: 执行数据库迁移
  - 命令: 在 api-new 目录执行迁移脚本

- [ ] **Task 6.2**: 重启前端服务验证
  - 命令: 重启 npm run client:dev

- [ ] **Task 6.3**: 功能验证测试
  - 批量删除、批量改状态、批量分配处理人
  - 优先级编辑、截止日期编辑、历史记录展示

---

## 执行顺序建议

```
Phase 1 (后端基础)
  ├── Task 1.1 (数据库迁移)
  ├── Task 1.2 (批量删除API)
  ├── Task 1.3 (批量状态API)
  ├── Task 1.4 (批量分配API)
  └── Task 1.5 (历史记录API)

Phase 2 (前端基础)
  ├── Task 2.1 (类型定义)
  └── Task 2.2 (服务层)

Phase 3 (批量操作组件)
  ├── Task 3.1 (BatchActionBar)
  ├── Task 3.2 (BatchDeleteModal)
  ├── Task 3.3 (BatchStatusModal)
  └── Task 3.4 (BatchAssignModal)

Phase 4 (列表集成)
  └── Task 4.1 (TaskList集成)

Phase 5 (详情完善)
  ├── Task 5.1 (TaskHistory组件)
  ├── Task 5.2 (优先级编辑)
  ├── Task 5.3 (截止日期编辑)
  └── Task 5.4 (历史Tab集成)

Phase 6 (测试验证)
  ├── Task 6.1 (执行迁移)
  ├── Task 6.2 (重启服务)
  └── Task 6.3 (功能验证)
```

---

*实施计划创建时间: 2026-02-16*
