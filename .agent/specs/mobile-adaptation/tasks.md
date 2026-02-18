# 移动端适配优化方案 - 实施任务清单

## 项目概述

本任务清单将移动端适配优化方案拆分为可执行的原子化任务，按优先级（P0/P1/P2）分阶段实施。

---

## 阶段一：基础能力建设（P0 - 核心基础）

### 1. Tailwind 配置扩展
- [ ] 在 `tailwind.config.js` 中添加 `xs` 断点 (480px)
- [ ] 添加安全区域 spacing 配置（safe-top、safe-bottom、safe-left、safe-right）
- [ ] 添加触摸区域工具类（min-touch-size: 44px）
- [ ] 添加移动端动画优化配置（减少动画时长）

### 2. 响应式 Hooks 开发
- [ ] 创建 `src/hooks/useBreakpoint.ts` - 断点检测 Hook
  - 返回当前断点、isMobile、isTablet、isDesktop 等状态
  - 使用防抖处理 resize 事件
- [ ] 创建 `src/hooks/useMobileDetect.ts` - 移动端检测 Hook
  - 基于 User Agent 和屏幕宽度双重检测
  - 支持 SSR 安全
- [ ] 创建 `src/hooks/useSafeArea.ts` - 安全区域 Hook
  - 获取刘海屏/挖孔屏的安全区域 inset 值
- [ ] 创建 `src/hooks/useTouchFeedback.ts` - 触摸反馈 Hook
  - 提供按压状态管理
  - 支持 scale/opacity/ripple 反馈效果

### 3. 移动端全局样式
- [ ] 创建 `src/styles/mobile.css`
  - 添加移动端基础样式重置
  - 添加触摸优化样式（touch-action、-webkit-tap-highlight-color）
  - 添加字体大小调整适配（-webkit-text-size-adjust）
- [ ] 创建 `src/styles/safe-area.css`
  - 添加安全区域适配样式
  - 适配 iOS 刘海屏、灵动岛、Android 挖孔屏

---

## 阶段二：移动端组件开发（P0 - 核心组件）

### 4. TouchButton 组件
- [ ] 创建 `src/components/mobile/TouchButton/index.tsx`
  - 实现最小 44×44px 触摸区域
  - 支持 scale/opacity/ripple 反馈效果
  - 支持 loading 和 disabled 状态
  - 适配原有 Button 组件的 API

### 5. SafeArea 组件
- [ ] 创建 `src/components/mobile/SafeArea/index.tsx`
  - 提供安全区域容器
  - 支持 top/bottom/left/right 单独控制
  - 自动适配不同设备的刘海/挖孔

### 6. BottomSheet 组件
- [ ] 创建 `src/components/mobile/BottomSheet/index.tsx`
  - 实现从底部滑出的面板
  - 支持手势下滑关闭
  - 支持多种高度模式（auto/full/fixed）
  - 创建 `src/components/mobile/BottomSheet/useBottomSheet.ts` Hook

### 7. MobileTable 组件
- [ ] 创建 `src/components/mobile/MobileTable/types.ts` - 类型定义
- [ ] 创建 `src/components/mobile/MobileTable/MobileTableCard.tsx` - 卡片项组件
  - 显示关键字段（高优先级列）
  - 支持展开/折叠显示更多字段
  - 支持左滑显示操作按钮
- [ ] 创建 `src/components/mobile/MobileTable/index.tsx` - 主组件
  - 支持加载状态骨架屏
  - 支持空数据状态
  - 支持下拉刷新、上拉加载

### 8. BottomNav 组件
- [ ] 创建 `src/components/mobile/BottomNav/NavItem.tsx` - 导航项组件
  - 支持图标、标签、徽标
  - 支持激活状态样式
- [ ] 创建 `src/components/mobile/BottomNav/index.tsx` - 底部导航栏
  - 固定在页面底部
  - 适配安全区域
  - 支持 3-5 个导航项

---

## 阶段三：核心页面适配（P0 - 高优先级页面）

### 9. 登录页面适配
- [ ] 改造 `src/pages/Login/` 各版本登录页
  - 确保表单在移动端垂直居中
  - 输入框高度适配移动端（≥44px）
  - 按钮使用 TouchButton 组件
  - 背景图在移动端优化或隐藏

### 10. 布局组件适配
- [ ] 改造 `src/components/Layout.tsx`
  - 集成 BottomNav 组件（移动端显示）
  - 优化移动端顶部导航栏（简化或隐藏）
  - 主内容区适配安全区域
- [ ] 改造 `src/components/Sidebar.tsx`
  - 移动端以抽屉形式呈现
  - 支持手势滑动关闭

### 11. 仪表盘页面适配
- [ ] 改造 `src/pages/Dashboard.tsx`
  - 统计卡片网格适配移动端（1-2列）
  - 图表组件在移动端简化或隐藏
  - 最近活动列表使用 MobileTable 样式

### 12. 任务列表页面适配
- [ ] 改造 `src/pages/tasks/TaskList.tsx`
  - 统计卡片区域适配移动端
  - 筛选区域使用 BottomSheet 组件（移动端）
  - 任务表格使用 MobileTable 组件（移动端）
  - 添加任务按钮固定在右下角（FAB）

### 13. 任务表格组件适配
- [ ] 改造 `src/pages/tasks/components/TaskTable.tsx`
  - 集成 MobileTable 组件（移动端）
  - 定义移动端列优先级（高：标题/状态/优先级，中：负责人/截止日期，低：其他）
  - 卡片支持展开显示完整信息

### 14. 任务表单适配
- [ ] 改造 `src/pages/tasks/TaskForm.tsx`
  - 表单在移动端使用单列布局
  - 日期选择器调用原生日期选择
  - 下拉选择使用 BottomSheet 或原生选择器

---

## 阶段四：次要页面适配（P1 - 中优先级页面）

### 15. 项目列表页面适配
- [ ] 改造 `src/pages/projects/ProjectList.tsx`
  - 统计卡片网格适配
  - 项目表格使用 MobileTable 组件
  - 筛选区域使用 BottomSheet

### 16. 项目详情页面适配
- [ ] 改造 `src/pages/projects/ProjectDetail.tsx`
  - 项目信息卡片适配
  - 任务列表使用 MobileTable
  - 成员列表适配移动端

### 17. 项目表单适配
- [ ] 改造 `src/pages/projects/ProjectCreate.tsx` 和 `ProjectEdit.tsx`
  - 表单在移动端使用单列布局
  - 文件上传组件适配移动端

### 18. 统计报表页面适配
- [ ] 改造 `src/pages/reports/` 相关页面
  - 图表在移动端简化显示
  - 数据表格使用横向滚动或 MobileTable

---

## 阶段五：组件库增强（P1 - 通用组件）

### 19. Modal 组件移动端适配
- [ ] 改造 `src/components/theme/ThemedModal.tsx`
  - 移动端使用 BottomSheet 样式（从底部滑入）
  - 支持手势关闭
  - 宽度适配移动端（90%-95%）

### 20. Form 组件移动端适配
- [ ] 改造 `src/components/theme/ThemedForm.tsx`
  - 表单字段在移动端垂直堆叠
  - 标签与输入框关联优化
  - 错误提示位置适配移动端

### 21. Filter 组件移动端适配
- [ ] 创建 `src/components/mobile/MobileFilter/index.tsx`
  - 筛选条件以抽屉形式呈现
  - 支持多选、日期范围等复杂筛选
  - 支持保存/重置筛选条件

### 22. 分页组件移动端适配
- [ ] 改造分页组件
  - 移动端简化分页显示（上一页/下一页 + 页码输入）
  - 或使用无限滚动替代分页

---

## 阶段六：优化与完善（P2 - 体验优化）

### 23. 触摸交互优化
- [ ] 全局添加触摸反馈效果
- [ ] 优化按钮、链接的触摸区域
- [ ] 添加列表项滑动操作支持

### 24. 性能优化
- [ ] 移动端组件懒加载
- [ ] 图片懒加载和尺寸适配
- [ ] 减少移动端动画复杂度

### 25. 可访问性优化
- [ ] 添加 ARIA 标签支持
- [ ] 优化屏幕阅读器体验
- [ ] 确保颜色对比度符合 WCAG 标准

### 26. PWA 基础支持（可选）
- [ ] 添加 Web App Manifest
- [ ] 添加图标资源
- [ ] 配置主题色和启动画面

---

## 阶段七：测试与验证

### 27. 自动化测试
- [ ] 编写响应式断点测试用例
- [ ] 编写移动端组件单元测试
- [ ] 配置 Lighthouse CI 性能测试

### 28. 手动测试
- [ ] iPhone SE (375×667) 测试
- [ ] iPhone 14 (390×844) 测试
- [ ] iPad Mini (768×1024) 测试
- [ ] Android 设备测试
- [ ] 微信内置浏览器测试

### 29. 性能验证
- [ ] Lighthouse 性能评分 ≥ 90
- [ ] Lighthouse 可访问性评分 ≥ 95
- [ ] 首屏加载时间 < 3 秒

---

## 任务依赖关系

```
阶段一（基础能力）
    │
    ├──→ 阶段二（核心组件）
    │       │
    │       ├──→ 阶段三（核心页面）
    │       │       │
    │       │       ├──→ 阶段四（次要页面）
    │       │       │
    │       └──→ 阶段五（组件增强）
    │               │
    └──→ 阶段六（优化完善）
            │
            └──→ 阶段七（测试验证）
```

---

## 实施建议

1. **按阶段顺序执行**：每个阶段完成后进行测试验证，确保稳定性
2. **P0 任务优先**：核心页面和基础能力必须优先完成
3. **组件先行**：先完成阶段二的组件开发，再改造页面
4. **渐进式发布**：可考虑使用特性开关，逐步开放移动端优化
5. **持续测试**：每完成一个任务都应在真实设备或模拟器上测试

---

## 文档记录

每个任务完成后，请在 `.agent/records/当天日期/` 目录下更新：
- `移动端适配开发日报.md` - 记录当日完成的工作
- 如有重要技术决策，创建 `{组件名}开发记录.md` 详细记录

