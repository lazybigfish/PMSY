# 任务依赖关系 - 实施任务清单

## 任务概览

| 序号 | 任务名称 | 预估工时 | 优先级 | 状态 |
|------|---------|---------|--------|------|
| 1 | 创建数据库迁移脚本 | 1h | P0 | ⬜ |
| 2 | 后端依赖管理 API | 3h | P0 | ⬜ |
| 3 | 前端类型定义 | 0.5h | P0 | ⬜ |
| 4 | 前端服务方法 | 1h | P0 | ⬜ |
| 5 | 添加依赖弹窗组件 | 2h | P0 | ⬜ |
| 6 | 任务详情页集成依赖管理 | 2h | P0 | ⬜ |
| 7 | 测试与修复 | 2h | P1 | ⬜ |

---

## 任务详情

### 任务 1: 创建数据库迁移脚本

- [ ] **任务描述**: 创建 task_dependencies 表
- **文件**: `api-new/database/migrations/038_create_task_dependencies.sql`
- **内容**:
  - 创建 task_dependencies 表
  - 添加索引
- **验收标准**: 迁移脚本可执行

---

### 任务 2: 后端依赖管理 API

- [ ] **任务描述**: 实现依赖管理的 REST API
- **文件**: `api-new/src/routes/taskDependencies.ts`
- **内容**:
  - GET /tasks/:taskId/dependencies
  - POST /tasks/:taskId/dependencies
  - DELETE /tasks/:taskId/dependencies/:id
  - 循环检测逻辑
- **验收标准**: API 正常响应

---

### 任务 3: 前端类型定义

- [ ] **任务描述**: 添加任务依赖相关类型
- **文件**: `src/types/task.ts`
- **内容**:
  ```typescript
  export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

  export interface TaskDependency {
    id: string;
    task_id: string;
    depends_on_task_id: string;
    dependency_type: DependencyType;
    created_by: string;
    created_at: string;
    depends_on_task?: Task;
    task?: Task;
  }
  ```
- **验收标准**: 类型定义完整

---

### 任务 4: 前端服务方法

- [ ] **任务描述**: 添加前端依赖管理服务
- **文件**: `src/services/taskService.ts`
- **内容**:
  - getTaskDependencies(taskId)
  - addTaskDependency(taskId, data)
  - removeTaskDependency(taskId, dependencyId)
- **验收标准**: 方法正确调用 API

---

### 任务 5: 添加依赖弹窗组件

- [ ] **任务描述**: 创建添加依赖的弹窗组件
- **文件**: `src/components/task/TaskDependencyModal.tsx`
- **功能**:
  - 任务搜索/选择
  - 依赖类型选择
  - 循环检测提示
- **验收标准**: 弹窗正常工作

---

### 任务 6: 任务详情页集成依赖管理

- [ ] **任务描述**: 在任务详情页添加依赖管理 UI
- **文件**: `src/pages/tasks/components/TaskDetail.tsx`
- **功能**:
  - 显示前置任务列表
  - 显示后续任务列表
  - 添加/删除依赖按钮
- **验收标准**: UI 正常显示和交互

---

### 任务 7: 测试与修复

- [ ] **任务描述**: 功能测试和 bug 修复
- **验收标准**: 核心流程测试通过

---

## 实施顺序

1. 数据库迁移
2. 后端 API
3. 前端类型和服务
4. 前端 UI
5. 集成测试

---

## 开始执行

确认后我将从任务1开始实施。
