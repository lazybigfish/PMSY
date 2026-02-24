# 任务中心优化实施任务清单

## 任务清单

### 阶段一：基础工具函数

- [ ] **T1. 创建时间工具函数**
  - 在 `src/utils/dateUtils.ts` 新增获取年第N周和星期几的工具函数
  - 实现 `getWeekInfo()` 和 `formatCreatedAtWithWeek()` 函数

### 阶段二：任务列表 - 创建时间列

- [ ] **T2. TaskTable 新增创建时间列**
  - 修改 `src/pages/tasks/components/TaskTable.tsx`
  - 在表头新增"创建时间"列
  - 表格行显示创建时间（格式：YYYY-MM-DD HH:mm）
  - 支持按创建时间排序

- [ ] **T3. MobileTaskCard 新增创建时间显示**
  - 修改 `src/pages/tasks/components/MobileTaskCard.tsx`
  - 卡片中显示创建时间

### 阶段三：任务详情页 - 创建时间及周信息

- [ ] **T4. TaskDetailPage 新增创建时间显示**
  - 修改 `src/pages/tasks/TaskDetailPage.tsx`
  - 在任务信息区域新增"创建时间"字段
  - 显示格式：YYYY年MM月DD日 周X（第N周）

### 阶段四：周视图和月视图功能

- [ ] **T5. TaskList 新增视图切换按钮**
  - 修改 `src/pages/tasks/TaskList.tsx`
  - 在视图切换按钮区域新增"周视图"和"月视图"按钮
  - 按钮有激活状态显示

- [ ] **T6. TaskList 实现周视图筛选逻辑**
  - 新增 weekView 状态
  - 实现本周时间范围计算函数
  - 筛选：created_at 在本周 OR completed_at 在本周

- [ ] **T7. TaskList 实现月视图筛选逻辑**
  - 新增 monthView 状态
  - 实现当月时间范围计算函数
  - 筛选：created_at 在当月 OR completed_at 在当月

### 阶段五：看板视图修复和增强

- [ ] **T8. TaskKanban 修复点击无效问题**
  - 检查并修复 `src/pages/tasks/components/TaskKanban.tsx`
  - 确保视图切换功能正常工作

- [ ] **T9. TaskKanban 新增自定义分栏功能**
  - 新增分栏维度选择器（状态、项目、优先级、处理人）
  - 默认按状态分栏：有几个、进行中、待办、已完成
  - 根据选择的维度动态分组任务

- [ ] **T10. TaskList 集成看板视图分栏切换**
  - 在 TaskList 中管理 groupBy 状态
  - 传递 groupBy 和 onGroupByChange 给 TaskKanban

### 阶段六：测试和验证

- [ ] **T11. 功能自测**
  - 测试任务列表创建时间列显示
  - 测试任务详情页创建时间和周信息显示
  - 测试周视图筛选功能
  - 测试月视图筛选功能
  - 测试看板视图分栏功能
  - 测试移动端适配
