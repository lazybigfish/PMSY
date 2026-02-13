# 系统全局鼠标悬停交互效果 实施计划

## 第一阶段：基础组件封装

### 任务 1：创建交互效果工具函数和类型定义
- [ ] 在 `src/lib/interactions.ts` 创建主题色映射配置
- [ ] 定义 `HoverEffectConfig`、`InteractiveCardProps` 等 TypeScript 接口
- [ ] 创建 `getThemeClasses` 工具函数，根据主题返回对应 CSS 类名
- [ ] 添加单元测试验证工具函数

### 任务 2：创建 InteractiveCard 组件
- [ ] 在 `src/components/interactive/InteractiveCard.tsx` 实现卡片组件
- [ ] 支持 `theme`、`clickable`、`onClick`、`showIndicator` 等 Props
- [ ] 实现悬停效果：上浮、阴影、边框变色
- [ ] 添加 `data-testid` 支持测试
- [ ] 编写组件单元测试

### 任务 3：创建 HoverButton 组件
- [ ] 在 `src/components/interactive/HoverButton.tsx` 实现按钮组件
- [ ] 支持 `variant` (primary/secondary/danger/ghost)、`size` 等 Props
- [ ] 实现悬停效果：背景加深、上浮、阴影
- [ ] 编写组件单元测试

### 任务 4：创建 NavItem 组件
- [ ] 在 `src/components/interactive/NavItem.tsx` 实现导航项组件
- [ ] 支持 `icon`、`label`、`href`、`theme`、`active` 等 Props
- [ ] 实现悬停效果：背景色、左侧指示条、图标放大
- [ ] 编写组件单元测试

### 任务 5：创建交互效果 CSS 文件
- [ ] 在 `src/styles/interactions.css` 添加全局过渡动画类
- [ ] 添加 `prefers-reduced-motion` 媒体查询支持
- [ ] 添加 `@media (hover: hover)` 触摸设备适配
- [ ] 在 `main.tsx` 引入 CSS 文件

## 第二阶段：Layout 组件改造

### 任务 6：改造侧边栏导航
- [ ] 修改 `src/components/Layout.tsx` 中的导航项
- [ ] 使用新的 `NavItem` 组件替换原有导航
- [ ] 为每个导航项配置对应主题色
- [ ] 验证悬停效果：背景变色、左侧指示条、图标放大

## 第三阶段：水漫金山模块改造

### 任务 7：改造水漫金山 Tab 导航
- [ ] 修改 `src/pages/water/WaterModule.tsx`
- [ ] 为 Tab 按钮添加悬停效果：底部边框渐显、背景色变化
- [ ] 使用 `HoverButton` 或自定义样式实现

### 任务 8：改造论坛帖子卡片
- [ ] 修改 `src/pages/water/ForumTab.tsx` 中的帖子卡片
- [ ] 使用 `InteractiveCard` 组件或添加悬停类名
- [ ] 实现效果：上浮、阴影、边框变色
- [ ] 确保点赞按钮悬停效果正常

### 任务 9：改造帖子详情页
- [ ] 修改 `src/pages/water/ForumPostDetailPage.tsx`
- [ ] 为回复列表项添加悬停效果：背景变化、左侧指示条
- [ ] 为操作按钮添加悬停效果

## 第四阶段：项目管理模块改造

### 任务 10：改造项目列表
- [ ] 修改 `src/pages/projects/ProjectList.tsx`
- [ ] 为项目卡片添加悬停效果
- [ ] 为表格行添加悬停效果

### 任务 11：改造项目详情页
- [ ] 修改 `src/pages/projects/ProjectDetail.tsx`
- [ ] 为里程碑、风险、供应商等 Tab 添加悬停效果
- [ ] 为卡片内操作按钮添加悬停效果

## 第五阶段：任务中心模块改造

### 任务 12：改造任务列表
- [ ] 修改 `src/pages/tasks/TaskList.tsx` 和 `TaskTable.tsx`
- [ ] 为任务行添加悬停效果：背景变化、操作按钮显示
- [ ] 为筛选标签添加悬停效果

### 任务 13：改造任务详情页
- [ ] 修改 `src/pages/tasks/TaskDetailPage.tsx`
- [ ] 为评论列表项添加悬停效果
- [ ] 为操作按钮添加悬停效果

## 第六阶段：其他模块改造

### 任务 14：改造工作台
- [ ] 修改 `src/pages/Dashboard.tsx`
- [ ] 为数据卡片添加悬停效果：数值变色、图标动画
- [ ] 为快捷操作按钮添加悬停效果

### 任务 15：改造文件管理
- [ ] 修改 `src/pages/files/FileManager.tsx`
- [ ] 为文件列表项添加悬停效果
- [ ] 为操作按钮添加悬停效果

### 任务 16：改造系统设置
- [ ] 修改 `src/pages/system/SystemSettings.tsx`
- [ ] 为设置项卡片添加悬停效果
- [ ] 为 Tab 导航添加悬停效果

### 任务 17：改造相关方列表
- [ ] 修改 `src/pages/stakeholders/ClientList.tsx` 和 `SupplierList.tsx`
- [ ] 为列表项添加悬停效果

## 第七阶段：全局组件改造

### 任务 18：改造全局按钮样式
- [ ] 检查 `src/components/` 下的按钮组件
- [ ] 统一使用 `HoverButton` 或添加悬停类名
- [ ] 确保主要按钮、次要按钮、危险按钮都有悬停效果

### 任务 19：改造全局卡片样式
- [ ] 检查 `src/components/` 下的卡片组件
- [ ] 统一使用 `InteractiveCard` 或添加悬停类名

### 任务 20：改造表单元素
- [ ] 为输入框添加悬停效果：边框变色、阴影增加
- [ ] 为下拉选择框添加悬停效果
- [ ] 确保表单元素焦点状态与悬停状态一致

## 第八阶段：验证与优化

### 任务 21：自动化测试
- [ ] 运行所有单元测试确保通过
- [ ] 添加悬停效果的集成测试
- [ ] 测试 `prefers-reduced-motion` 支持

### 任务 22：手动验证
- [ ] 验证侧边栏导航悬停效果
- [ ] 验证帖子卡片悬停效果
- [ ] 验证分类标签悬停效果
- [ ] 验证主要按钮悬停效果
- [ ] 验证次要按钮悬停效果
- [ ] 验证 Tab 导航悬停效果
- [ ] 验证列表项悬停效果
- [ ] 验证头像悬停效果
- [ ] 在触摸设备上测试
- [ ] 开启减少动画偏好测试

### 任务 23：性能优化
- [ ] 运行 Lighthouse 检查性能评分
- [ ] 检查页面滚动流畅度
- [ ] 优化大量列表项的悬停性能
- [ ] 确保动画使用 GPU 加速

### 任务 24：可访问性检查
- [ ] 验证键盘导航支持
- [ ] 验证屏幕阅读器兼容性
- [ ] 确保悬停效果不干扰基础功能

---

## 执行建议

1. **按阶段执行**：建议按阶段顺序执行，每完成一个阶段进行验证
2. **优先核心组件**：先完成 InteractiveCard、HoverButton、NavItem 三个核心组件
3. **渐进式改造**：每改造一个页面后立即测试，避免累积问题
4. **保持向后兼容**：改造过程中确保现有功能不受影响

## 开始执行

输入 `@tasks.md 执行任务1` 开始第一阶段工作。
