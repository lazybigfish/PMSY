# PMSY 项目管理系统 - UI/UX 优化实施计划

## 项目概述
- **目标**: 全面优化系统 UI/UX，提升视觉一致性和用户体验
- **原则**: 保持现有功能不变，仅优化界面样式和交互
- **设计系统**: 基于 design-system/MASTER.md 规范
- **预计工期**: 5 个阶段，约 2-3 周完成

---

## 阶段一：基础组件库建设 (3-4 天)

### 目标
建立统一的基础组件库，确保全系统组件样式一致。

### 任务清单

#### 1.1 创建 Button 组件
**文件**: `src/components/ui/Button.tsx`

**功能**:
- 支持 4 种变体: primary, secondary, ghost, danger
- 支持 3 种尺寸: sm, md, lg
- 支持加载状态
- 支持禁用状态
- 支持图标前缀/后缀

**样式规范**:
```
Primary: bg-indigo-600, hover:bg-indigo-700, text-white
Secondary: bg-white, border, hover:bg-gray-50
Ghost: bg-transparent, hover:bg-gray-100
Danger: bg-red-600, hover:bg-red-700, text-white
```

#### 1.2 创建 Card 组件
**文件**: `src/components/ui/Card.tsx`

**功能**:
- 支持标题、内容、页脚区域
- 支持悬停效果
- 支持阴影层级
- 支持点击事件

**样式规范**:
```
背景: white
圆角: rounded-xl (12px)
阴影: shadow-sm (默认), shadow-md (悬停)
内边距: p-6
过渡: transition-all duration-200
```

#### 1.3 创建 Input 组件
**文件**: `src/components/ui/Input.tsx`

**功能**:
- 支持前缀/后缀图标
- 支持错误状态
- 支持标签
- 支持帮助文本

**样式规范**:
```
边框: border-gray-200
圆角: rounded-lg (8px)
聚焦: ring-2 ring-indigo-500/20, border-indigo-500
错误: border-red-500, ring-red-500/20
```

#### 1.4 创建 Badge 组件
**文件**: `src/components/ui/Badge.tsx`

**功能**:
- 支持 5 种变体: default, primary, success, warning, danger
- 支持圆点模式
- 支持可关闭

**样式规范**:
```
圆角: rounded-full
内边距: px-2.5 py-0.5
字体: text-xs font-medium
```

#### 1.5 创建 Table 组件
**文件**: `src/components/ui/Table.tsx`

**功能**:
- 支持表头固定
- 支持行悬停
- 支持空状态
- 支持加载状态

**样式规范**:
```
表头: bg-gray-50, text-gray-500, text-xs font-semibold
行高: h-14
行悬停: hover:bg-gray-50
边框: border-gray-200
```

#### 1.6 创建 Modal 组件
**文件**: `src/components/ui/Modal.tsx`

**功能**:
- 支持标题、内容、页脚
- 支持点击外部关闭
- 支持 ESC 关闭
- 支持动画过渡

**样式规范**:
```
遮罩: bg-black/50
内容: bg-white, rounded-xl, shadow-xl
动画: opacity + scale transition
```

#### 1.7 创建 Skeleton 组件
**文件**: `src/components/ui/Skeleton.tsx`

**功能**:
- 支持文本、圆形、矩形变体
- 支持脉冲动画

**样式规范**:
```
背景: bg-gray-200
动画: animate-pulse
圆角: rounded-md
```

### 验收标准
- [ ] 所有组件通过 TypeScript 检查
- [ ] 组件支持所有设计系统规范中的变体
- [ ] 组件支持暗色模式 (可选)
- [ ] 组件支持无障碍访问 (ARIA 属性)

---

## 阶段二：全局布局优化 (2-3 天)

### 目标
优化整体布局结构，提升导航体验和视觉层次。

### 任务清单

#### 2.1 优化 Layout.tsx
**文件**: `src/components/Layout.tsx`

**优化内容**:
1. **侧边栏优化**
   - 统一导航项样式
   - 添加图标与文字间距
   - 优化激活状态样式
   - 添加悬停过渡效果

2. **顶部导航优化**
   - 统一高度为 64px
   - 优化用户菜单样式
   - 添加通知图标
   - 优化面包屑导航

3. **内容区域优化**
   - 统一内边距为 24px
   - 添加页面过渡动画
   - 优化滚动条样式

**样式变更**:
```
侧边栏:
- 宽度: w-60 (240px)
- 背景: bg-white
- 边框: border-r border-gray-200
- 导航项: py-2 px-4, rounded-lg
- 激活状态: bg-indigo-50 text-indigo-600
- 悬停状态: hover:bg-gray-50

顶部导航:
- 高度: h-16 (64px)
- 背景: bg-white
- 边框: border-b border-gray-200
- 阴影: shadow-sm
```

#### 2.2 创建 PageHeader 组件
**文件**: `src/components/PageHeader.tsx`

**功能**:
- 统一页面标题样式
- 支持面包屑导航
- 支持操作按钮区
- 支持返回按钮

**样式规范**:
```
容器: mb-6
标题: text-2xl font-bold text-gray-900
面包屑: text-sm text-gray-500
操作区: flex items-center gap-3
```

#### 2.3 优化登录页
**文件**: `src/pages/Login.tsx`

**优化内容**:
- 居中卡片布局
- 优化表单样式
- 添加品牌 Logo
- 优化错误提示样式

#### 2.4 创建 EmptyState 组件
**文件**: `src/components/EmptyState.tsx`

**功能**:
- 统一空状态展示
- 支持图标、标题、描述、操作按钮

**样式规范**:
```
布局: flex flex-col items-center justify-center py-12
图标: w-16 h-16 text-gray-300
标题: text-lg font-medium text-gray-900
描述: text-sm text-gray-500
```

### 验收标准
- [ ] 所有页面布局统一
- [ ] 导航体验流畅
- [ ] 空状态展示一致
- [ ] 页面切换有过渡动画

---

## 阶段三：核心页面优化 (5-7 天)

### 目标
优化主要业务页面的 UI，提升信息展示效率和操作体验。

### 任务清单

#### 3.1 项目列表页优化
**文件**: `src/pages/projects/ProjectList.tsx`

**优化内容**:
1. **页面头部**
   - 使用 PageHeader 组件
   - 优化搜索框样式
   - 优化筛选器布局

2. **项目卡片**
   - 使用 Card 组件
   - 优化信息层级
   - 添加悬停效果
   - 优化状态标签

3. **表格视图**
   - 使用 Table 组件
   - 优化列宽分配
   - 添加排序图标
   - 优化操作按钮

4. **加载状态**
   - 使用 Skeleton 组件
   - 添加加载动画

**样式变更**:
```
卡片:
- 网格: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- 悬停: hover:shadow-md hover:-translate-y-0.5

表格:
- 行高: h-16
- 操作列: 图标按钮组
```

#### 3.2 项目详情页优化
**文件**: `src/pages/projects/ProjectDetail.tsx`

**优化内容**:
1. **页面头部**
   - 优化标题编辑样式
   - 优化客户信息展示
   - 优化操作按钮组

2. **标签页导航**
   - 优化标签样式
   - 添加图标
   - 优化激活状态

3. **项目概览标签**
   - 优化统计卡片
   - 优化信息展示
   - 优化成员列表

4. **其他标签页**
   - 统一使用 Card 组件
   - 优化表格样式
   - 优化表单样式

**样式变更**:
```
标签页:
- 容器: border-b border-gray-200
- 标签: py-4 px-1, text-sm font-medium
- 激活: border-indigo-500 text-indigo-600
- 图标: mr-2
```

#### 3.3 任务中心优化
**文件**: `src/pages/tasks/TaskList.tsx`

**优化内容**:
1. **看板视图**
   - 优化列标题样式
   - 优化任务卡片
   - 添加拖拽效果

2. **列表视图**
   - 使用 Table 组件
   - 优化优先级标签
   - 优化状态标签

3. **筛选栏**
   - 优化布局
   - 优化输入框样式
   - 优化按钮样式

#### 3.4 相关方模块优化
**文件**: 
- `src/pages/stakeholders/StakeholderLayout.tsx`
- `src/pages/stakeholders/ClientList.tsx`
- `src/pages/suppliers/SupplierList.tsx`

**优化内容**:
1. **布局优化**
   - 优化二级导航样式
   - 统一标签页样式

2. **客户库**
   - 优化卡片布局
   - 优化表单弹窗
   - 优化详情弹窗

3. **供应商库**
   - 优化列表样式
   - 优化详情页

#### 3.5 系统设置优化
**文件**: `src/pages/system/SystemSettings.tsx`

**优化内容**:
1. **设置项布局**
   - 统一表单样式
   - 优化开关组件
   - 优化选择器样式

2. **角色管理**
   - 优化权限卡片
   - 优化弹窗样式

3. **用户管理**
   - 优化表格样式
   - 优化操作按钮

### 验收标准
- [ ] 所有核心页面使用新组件库
- [ ] 页面信息层级清晰
- [ ] 操作按钮样式统一
- [ ] 表单验证提示清晰

---

## 阶段四：交互体验提升 (2-3 天)

### 目标
提升系统交互体验，增加动画反馈和加载状态。

### 任务清单

#### 4.1 添加页面过渡动画
**文件**: `src/App.tsx` 或创建 `src/components/PageTransition.tsx`

**功能**:
- 页面切换淡入淡出
- 路由切换滑动效果

**实现**:
```tsx
// 使用 Framer Motion 或 CSS transition
<AnimatePresence mode="wait">
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

#### 4.2 优化加载状态
**文件**: 全局加载组件

**任务**:
1. 创建全局 Loading 组件
2. 为所有异步操作添加加载状态
3. 使用 Skeleton 替代 Spinner (内容区域)
4. 优化按钮加载状态

#### 4.3 添加 Toast 通知系统
**文件**: `src/components/Toast.tsx` 或 `src/context/ToastContext.tsx`

**功能**:
- 成功、错误、警告、信息 4 种类型
- 自动消失
- 支持手动关闭
- 堆叠展示

**样式规范**:
```
成功: bg-green-50, border-green-200, text-green-800
错误: bg-red-50, border-red-200, text-red-800
警告: bg-yellow-50, border-yellow-200, text-yellow-800
信息: bg-blue-50, border-blue-200, text-blue-800
```

#### 4.4 优化确认对话框
**文件**: `src/components/ConfirmDialog.tsx`

**功能**:
- 统一的确认弹窗样式
- 支持危险操作警示
- 支持自定义按钮文字

#### 4.5 添加工具提示
**文件**: `src/components/Tooltip.tsx`

**功能**:
- 为图标按钮添加 Tooltip
- 为表格列头添加 Tooltip
- 为表单字段添加 Tooltip

### 验收标准
- [ ] 所有异步操作有加载反馈
- [ ] 操作成功/失败有 Toast 提示
- [ ] 危险操作有确认对话框
- [ ] 页面切换流畅有动画

---

## 阶段五：响应式适配 (2-3 天)

### 目标
确保系统在平板和移动设备上有良好的使用体验。

### 任务清单

#### 5.1 移动端侧边栏
**文件**: `src/components/Layout.tsx`

**优化内容**:
- 小屏幕隐藏侧边栏
- 添加汉堡菜单按钮
- 侧边栏滑出动画
- 点击外部关闭

#### 5.2 移动端表格优化
**文件**: 各列表页面

**优化内容**:
- 表格横向滚动
- 关键信息优先展示
- 操作按钮简化

#### 5.3 移动端表单优化
**文件**: 各表单页面

**优化内容**:
- 表单字段垂直排列
- 输入框宽度 100%
- 按钮全宽

#### 5.4 断点测试
**测试断点**:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: 1024px - 1440px
- Large: > 1440px

### 验收标准
- [ ] 所有页面在移动端可正常使用
- [ ] 表格在移动端可横向滚动
- [ ] 表单在移动端易于填写
- [ ] 导航在移动端易于操作

---

## 实施建议

### 开发顺序
1. **先完成阶段一** - 基础组件是其他阶段的基础
2. **阶段二和阶段三可并行** - 布局优化和页面优化可以交替进行
3. **阶段四在阶段三后进行** - 交互优化需要在页面结构稳定后进行
4. **阶段五最后进行** - 响应式适配需要在所有页面完成后进行

### 代码规范
1. 所有新组件使用 TypeScript
2. 组件 props 使用接口定义
3. 样式使用 Tailwind CSS，避免内联样式
4. 动画使用 CSS transition 或 Framer Motion
5. 组件支持 forwardRef

### 测试清单
- [ ] 所有组件通过 TypeScript 检查
- [ ] 所有页面通过 ESLint 检查
- [ ] 所有功能保持原有行为
- [ ] 所有链接和按钮可点击
- [ ] 所有表单可正常提交

### 回滚方案
- 每个阶段完成后提交 Git
- 保留原有组件备份
- 使用 feature 分支开发

---

## 预期效果

### 视觉提升
- ✅ 色彩统一，视觉层次清晰
- ✅ 间距规范，页面呼吸感强
- ✅ 圆角一致，界面更柔和
- ✅ 阴影层次，空间感更强

### 交互提升
- ✅ 操作反馈及时明确
- ✅ 页面切换流畅自然
- ✅ 加载状态清晰优雅
- ✅ 错误提示友好易懂

### 体验提升
- ✅ 移动端可用性提升
- ✅ 无障碍访问支持
- ✅ 键盘操作支持
- ✅ 性能优化

---

*计划版本: v1.0*
*创建日期: 2026-02-11*
*预计完成: 2-3 周*
