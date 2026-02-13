# PMSY 设计系统文档

## 1. 概述

本文档定义 PMSY 项目管理系统的视觉设计规范和组件使用标准，确保整个产品界面风格统一、用户体验一致。

## 2. 弹框/模态框设计规范

### 2.1 标准弹框组件

**组件位置**: `src/components/Modal.tsx`

**导出组件**:
- `Modal` - 基础弹框组件
- `ModalForm` - 带表单提交的弹框组件
- `ConfirmModal` - 确认弹框组件

### 2.2 视觉规范

#### 遮罩层样式
```
背景色: bg-dark-900/60 (深色半透明)
模糊效果: backdrop-blur-sm
层级: z-[100]
动画: animate-fade-in
```

#### 内容区样式
```
背景色: bg-white
圆角: rounded-2xl
阴影: shadow-2xl
最大高度: max-h-[90vh]
动画: animate-scale-in
```

#### 尺寸规范
| 尺寸 | 最大宽度 | 使用场景 |
|------|----------|----------|
| sm | max-w-sm | 简单确认、提示 |
| md | max-w-md | 表单输入 |
| lg | max-w-lg | 标准弹框（默认） |
| xl | max-w-xl | 复杂表单 |
| 2xl | max-w-2xl | 大型表单（如任务创建） |
| 3xl | max-w-3xl | 详情展示 |
| 4xl | max-w-4xl | 宽屏内容 |
| 5xl | max-w-5xl | 全屏弹框 |

### 2.3 使用示例

#### 基础弹框
```tsx
import { Modal } from '../components/Modal';

<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="弹框标题"
  maxWidth="lg"
>
  {/* 内容 */}
</Modal>
```

#### 表单弹框
```tsx
import { ModalForm } from '../components/Modal';

<ModalForm
  isOpen={isOpen}
  onClose={handleClose}
  onSubmit={handleSubmit}
  title="创建任务"
  maxWidth="2xl"
  submitText="创建"
  isSubmitting={isSubmitting}
>
  {/* 表单内容 */}
</ModalForm>
```

#### 确认弹框
```tsx
import { ConfirmModal } from '../components/Modal';

<ConfirmModal
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleConfirm}
  title="确认删除"
  message="确定要删除此项目吗？此操作不可撤销。"
  type="danger"
/>
```

### 2.4 设计原则

1. **统一遮罩**: 所有弹框必须使用 `bg-dark-900/60 backdrop-blur-sm` 作为背景遮罩
2. **层级管理**: 弹框层级固定为 `z-[100]`，确保覆盖导航栏
3. **动画效果**: 使用 `animate-fade-in` 和 `animate-scale-in` 提供流畅的打开体验
4. **点击关闭**: 点击遮罩层应关闭弹框（表单弹框需谨慎）
5. **尺寸适配**: 根据内容复杂度选择合适的 maxWidth
6. **滚动处理**: 内容超出时内部滚动，不超出弹框边界

### 2.5 禁止做法

❌ 不要自定义遮罩样式：
```tsx
<!-- 错误 -->
<div className="fixed inset-0 bg-black bg-opacity-50 z-50">
```

✅ 使用标准组件：
```tsx
<!-- 正确 -->
<Modal isOpen={isOpen} onClose={onClose}>
```

## 3. 颜色系统

### 3.1 主色调
- Primary: `#6366f1` (Indigo)
- Secondary: `#8b5cf6` (Violet)

### 3.2 功能色
- Success: `#10b981` (Emerald)
- Warning: `#f59e0b` (Amber)
- Danger: `#ef4444` (Red)
- Info: `#3b82f6` (Blue)

### 3.3 中性色
- Dark-900: `#111827`
- Dark-800: `#1f2937`
- Dark-700: `#374151`
- Dark-600: `#4b5563`
- Dark-500: `#6b7280`
- Dark-400: `#9ca3af`
- Dark-300: `#d1d5db`
- Dark-200: `#e5e7eb`
- Dark-100: `#f3f4f6`
- Dark-50: `#f9fafb`

## 4. 字体规范

### 4.1 字体族
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### 4.2 字号规范
| 级别 | 大小 | 字重 | 用途 |
|------|------|------|------|
| 页面标题 | text-2xl | font-bold | 页面主标题 |
| 区块标题 | text-lg | font-semibold | 卡片标题 |
| 正文 | text-sm | font-normal | 普通文本 |
| 辅助文字 | text-xs | font-normal | 说明、提示 |

## 5. 间距规范

### 5.1 基础单位
- 4px 为基础单位
- 使用 Tailwind 默认间距 scale

### 5.2 常用间距
| 场景 | 间距 |
|------|------|
| 页面内边距 | px-4 sm:px-6 lg:px-8 |
| 卡片内边距 | p-6 |
| 表单元素间距 | space-y-4 |
| 按钮间距 | gap-3 |

## 6. 圆角规范

| 元素 | 圆角 |
|------|------|
| 卡片 | rounded-2xl |
| 按钮 | rounded-lg |
| 输入框 | rounded-lg |
| 标签 | rounded-full |

## 7. 阴影规范

| 级别 | 阴影 |
|------|------|
| 卡片 | shadow-soft |
| 弹框 | shadow-2xl |
| 按钮悬停 | shadow-md |
| 下拉菜单 | shadow-lg |

## 8. 动画规范

### 8.1 过渡时间
- 快速: 150ms (按钮悬停)
- 标准: 300ms (弹框打开)
- 慢速: 500ms (页面切换)

### 8.2 缓动函数
- 标准: ease-in-out
- 弹性: cubic-bezier(0.34, 1.56, 0.64, 1)

## 9. 响应式断点

| 断点 | 宽度 | 说明 |
|------|------|------|
| sm | 640px | 小屏手机 |
| md | 768px | 平板 |
| lg | 1024px | 小型桌面 |
| xl | 1280px | 标准桌面 |
| 2xl | 1536px | 大屏桌面 |

## 10. 组件规范

### 10.1 按钮
- 主按钮: `btn-primary`
- 次按钮: `btn-secondary`
- 危险按钮: `bg-red-600 hover:bg-red-700`
- 幽灵按钮: `hover:bg-dark-100`

### 10.2 输入框
- 标准输入: `input`
- 文本域: `input resize-none`
- 选择框: `input appearance-none`

### 10.3 卡片
- 标准卡片: `card`
- 可悬停卡片: `card card-hover`
- 统计卡片: `stat-card`

## 11. 图标规范

- 使用 Lucide React 图标库
- 标准尺寸: w-5 h-5 (20px)
- 小尺寸: w-4 h-4 (16px)
- 大尺寸: w-6 h-6 (24px)

## 12. 更新记录

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-02-12 | 1.0 | 初始版本，添加弹框设计规范 |
