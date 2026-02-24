# 任务看板视图 - 实施任务清单

## 任务概览

| 序号 | 任务名称 | 预估工时 | 优先级 | 状态 |
|------|---------|---------|--------|------|
| 1 | 安装 dnd-kit 依赖包 | 0.5h | P0 | ⬜ |
| 2 | 定义看板数据类型 | 1h | P0 | ⬜ |
| 3 | 创建 useKanban hook | 2h | P0 | ⬜ |
| 4 | 创建 KanbanCard 任务卡片组件 | 2h | P0 | ⬜ |
| 5 | 创建 KanbanColumn 看板列组件 | 2h | P0 | ⬜ |
| 6 | 创建 KanbanBoard 拖拽容器 | 3h | P0 | ⬜ |
| 7 | 创建 TaskKanban 主组件 | 2h | P0 | ⬜ |
| 8 | 集成看板视图到任务中心页面 | 1h | P0 | ⬜ |
| 9 | 添加看板视图切换 Tab | 0.5h | P0 | ⬜ |
| 10 | 实现列配置功能 | 2h | P1 | ⬜ |
| 11 | 添加响应式布局支持 | 1h | P1 | ⬜ |
| 12 | 测试与修复 | 2h | P0 | ⬜ |

---

## 任务详情

### 任务 1: 安装 dnd-kit 依赖包

- [ ] **任务描述**: 安装 @dnd-kit 相关依赖包
- **文件**: `package.json`
- **验收标准**:
  - [ ] 执行 `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
  - [ ] 安装 react-window 用于虚拟滚动
  - [ ] 验证 package.json 中新增依赖

---

### 任务 2: 定义看板数据类型

- [ ] **任务描述**: 在 types 目录新增看板相关类型定义
- **文件**: `src/types/kanban.ts`
- **新增内容**:
  ```typescript
  // 看板分组维度类型
  export type KanbanGroupBy = 'status' | 'priority' | 'assignee' | 'module';

  // 看板列配置
  export interface KanbanColumn {
    id: string;
    title: string;
    value: string;
    color?: string;
    order: number;
  }

  // 看板配置
  export interface KanbanConfig {
    groupBy: KanbanGroupBy;
    columns: KanbanColumn[];
    isConfigOpen: boolean;
  }

  // 看板任务项
  export interface KanbanTask extends Task {
    isDragging?: boolean;
    isOverdue?: boolean;
  }
  ```
- **验收标准**:
  - [ ] 文件创建成功
  - [ ] 类型导出正确

---

### 任务 3: 创建 useKanban hook

- [ ] **任务描述**: 创建看板核心逻辑 hook，管理任务分组、拖拽状态
- **文件**: `src/hooks/useKanban.ts`
- **功能**:
  - 按分组维度组织任务到不同列
  - 处理拖拽开始/结束事件
  - 处理任务状态更新 API 调用
- **验收标准**:
  - [ ] 正确按 status 分组任务
  - [ ] 正确按 priority 分组任务
  - [ ] 拖拽结束后触发状态更新

---

### 任务 4: 创建 KanbanCard 任务卡片组件

- [ ] **任务描述**: 实现任务卡片 UI，支持悬停操作
- **文件**: `src/components/task/KanbanCard.tsx`
- **UI 要求**:
  - 显示任务标题（最多2行，超出省略）
  - 显示优先级标签（颜色区分）
  - 显示截止日期（逾期红色高亮）
  - 显示负责人头像
  - 显示模块标签
- **交互**:
  - 悬停显示快捷操作按钮
  - 点击标题打开详情抽屉
- **验收标准**:
  - [ ] 卡片渲染正确显示所有信息
  - [ ] 悬停显示操作按钮
  - [ ] 逾期任务日期红色显示

---

### 任务 5: 创建 KanbanColumn 看板列组件

- [ ] **任务描述**: 实现看板列组件，显示一组任务
- **文件**: `src/components/task/KanbanColumn.tsx`
- **功能**:
  - 接收列配置和任务列表
  - 使用 @dnd-kit SortableContext 包装任务
  - 显示任务数量统计
  - 空状态显示占位提示
- **验收标准**:
  - [ ] 正确渲染列标题和任务列表
  - [ ] 空列显示"暂无任务"
  - [ ] 显示任务数量

---

### 任务 6: 创建 KanbanBoard 拖拽容器

- [ ] **任务描述**: 实现拖拽容器，处理跨列拖拽
- **文件**: `src/components/task/KanbanBoard.tsx`
- **功能**:
  - 使用 dnd-kit DragDropContext 包装
  - 处理 onDragEnd 事件
  - 计算拖拽目标列
  - 触发任务状态更新
- **验收标准**:
  - [ ] 任务可以跨列拖拽
  - [ ] 拖拽释放后更新任务状态
  - [ ] 拖拽时显示占位符

---

### 任务 7: 创建 TaskKanban 主组件

- [ ] **任务描述**: 创建看板视图主组件，整合所有子组件
- **文件**: `src/components/task/TaskKanban.tsx`
- **功能**:
  - 接收项目ID和任务列表
  - 初始化看板配置
  - 渲染 KanbanBoard
  - 处理加载状态和错误
- **验收标准**:
  - [ ] 正确渲染看板视图
  - [ ] 显示加载状态
  - [ ] 错误时显示提示

---

### 任务 8: 集成看板视图到任务中心页面

- [ ] **任务描述**: 在任务中心页面集成看板视图
- **文件**: `src/pages/tasks/TaskCenter.tsx` 或现有任务页面
- **修改**:
  - 添加视图切换状态（list/kanban）
  - 条件渲染 TaskKanban 组件
- **验收标准**:
  - [ ] 可以切换到看板视图
  - [ ] 看板视图正确显示任务

---

### 任务 9: 添加看板视图切换 Tab

- [ ] **任务描述**: 在任务中心页面添加工具栏和视图切换
- **文件**: `src/pages/tasks/TaskCenter.tsx`
- **UI**:
  - 添加"列表/看板"视图切换按钮
  - 保持现有列表视图可用
- **验收标准**:
  - [ ] 显示视图切换 Tab
  - [ ] 切换到看板视图正常工作

---

### 任务 10: 实现列配置功能

- [ ] **任务描述**: 实现看板列配置功能，支持切换分组维度
- **文件**: 新增配置面板组件
- **功能**:
  - 支持按 status/priority/assignee/module 分组
  - 保存用户偏好到本地存储
- **验收标准**:
  - [ ] 可以切换分组维度
  - [ ] 看板按新维度重新分组

---

### 任务 11: 添加响应式布局支持

- [ ] **任务描述**: 移动端适配
- **修改**: KanbanBoard 或样式文件
- **功能**:
  - 屏幕宽度 < 768px 时横向滚动
  - 单列完整展示
- **验收标准**:
  - [ ] 移动端横向滚动正常
  - [ ] 任务卡片可正常交互

---

### 任务 12: 测试与修复

- [ ] **任务描述**: 功能测试和 bug 修复
- **内容**:
  - 测试拖拽功能
  - 测试权限控制
  - 修复发现的问题
- **验收标准**:
  - [ ] 核心流程测试通过
  - [ ] 无阻塞性 bug

---

## 开始执行

请确认以上任务清单，确认后我将从**任务1**开始逐步实施。
