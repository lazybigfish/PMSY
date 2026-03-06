# Figma 设计规范文档

## 项目概述

**项目名称**：PMSY 项目管理系统 - 里程碑功能升级  
**设计工具**：Figma  
**设计风格**：现代简洁、专业高效的企业级SaaS  
**目标用户**：项目经理、系统管理员

---

## 一、设计系统

### 1.1 色彩系统

#### 主色调
| 名称 | 色值 | 用途 |
|------|------|------|
| Primary | `#3B82F6` | 主按钮、链接、选中状态 |
| Primary Hover | `#2563EB` | 主按钮悬停 |
| Primary Light | `#EFF6FF` | 主色背景、选中背景 |

#### 中性色
| 名称 | 色值 | 用途 |
|------|------|------|
| Text Primary | `#111827` | 主要文字 |
| Text Secondary | `#6B7280` | 次要文字 |
| Text Tertiary | `#9CA3AF` | 辅助文字 |
| Border | `#E5E7EB` | 边框、分割线 |
| Background | `#F9FAFB` | 页面背景 |
| Surface | `#FFFFFF` | 卡片、弹窗背景 |

#### 功能色
| 名称 | 色值 | 用途 |
|------|------|------|
| Success | `#10B981` | 成功状态、启用 |
| Warning | `#F59E0B` | 警告状态 |
| Error | `#EF4444` | 错误、删除 |
| Info | `#3B82F6` | 信息提示 |

#### 系统模板标识色
| 名称 | 色值 | 用途 |
|------|------|------|
| System Badge | `#8B5CF6` | 系统模板标签 |
| System Light | `#F5F3FF` | 系统模板背景 |

### 1.2 字体系统

#### 字体家族
- **主字体**：Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
- **备用字体**：sans-serif

#### 字号规范
| 级别 | 大小 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| H1 | 24px | 600 | 32px | 页面标题 |
| H2 | 20px | 600 | 28px | 区块标题 |
| H3 | 16px | 600 | 24px | 卡片标题 |
| Body | 14px | 400 | 22px | 正文 |
| Small | 12px | 400 | 18px | 辅助文字 |
| Caption | 11px | 500 | 16px | 标签、徽章 |

### 1.3 间距系统

#### 基础单位：4px
| 名称 | 值 | 用途 |
|------|-----|------|
| xs | 4px | 图标间距 |
| sm | 8px | 紧凑间距 |
| md | 16px | 标准间距 |
| lg | 24px | 区块间距 |
| xl | 32px | 大区块间距 |
| 2xl | 48px | 页面边距 |

#### 圆角规范
| 名称 | 值 | 用途 |
|------|-----|------|
| sm | 4px | 小按钮、标签 |
| md | 6px | 输入框、小卡片 |
| lg | 8px | 卡片、按钮 |
| xl | 12px | 大卡片、弹窗 |
| full | 9999px | 圆形、胶囊按钮 |

### 1.4 阴影系统

| 名称 | 值 | 用途 |
|------|-----|------|
| Shadow SM | `0 1px 2px rgba(0,0,0,0.05)` | 小元素 |
| Shadow MD | `0 4px 6px -1px rgba(0,0,0,0.1)` | 卡片 |
| Shadow LG | `0 10px 15px -3px rgba(0,0,0,0.1)` | 弹窗、下拉 |
| Shadow XL | `0 20px 25px -5px rgba(0,0,0,0.1)` | 模态框 |

---

## 二、页面设计规范

### 页面1：里程碑初始化引导页

#### 布局
- 全屏居中布局
- 内容区域最大宽度：480px
- 垂直水平居中

#### 组件规范
**引导卡片**
- 背景：白色（#FFFFFF）
- 圆角：16px
- 阴影：Shadow LG
- 内边距：48px
- 宽度：100%，最大480px

**插图区域**
- 尺寸：120x120px
- 颜色：Primary Light背景 + Primary图标
- 圆角：full（圆形）

**标题**
- 字体：H1（24px, 600）
- 颜色：Text Primary
- 下边距：16px

**描述文字**
- 字体：Body（14px, 400）
- 颜色：Text Secondary
- 下边距：32px

**主按钮（选择模板初始化）**
- 背景：Primary
- 文字：白色，14px, 500
- 高度：44px
- 圆角：8px
- 宽度：100%
- 下边距：12px

**次按钮（自定义空白里程碑）**
- 背景：透明
- 边框：1px solid Border
- 文字：Text Primary，14px, 500
- 高度：44px
- 圆角：8px
- 宽度：100%

---

### 页面2：模板选择页面

#### 布局
- 左右分栏：左侧280px，右侧自适应
- 整体内边距：24px
- 最大宽度：1200px，居中

#### 左侧边栏
**分类标题**
- 字体：Small（12px, 600）
- 颜色：Text Tertiary
- 大写，字间距：0.5px
- 下边距：12px

**分类选项**
- 高度：36px
- 内边距：8px 12px
- 圆角：6px
- 默认：Text Secondary
- 选中：Primary背景（Primary Light），Primary文字
- 图标+文字布局，间距8px

**标签区域**
- 标签样式：胶囊形
- 背景：Background
- 边框：1px solid Border
- 内边距：4px 12px
- 字体：Caption（11px, 500）
- 圆角：full

#### 右侧内容区
**搜索框**
- 高度：40px
- 背景：Surface
- 边框：1px solid Border
- 圆角：8px
- 左侧图标：Search（Text Tertiary）
- 内边距：左40px，右16px
- 占位符颜色：Text Tertiary

**模板卡片**
- 背景：Surface
- 边框：1px solid Border
- 圆角：12px
- 内边距：20px
- 间距：16px（卡片之间）

**卡片内容布局**
```
┌─────────────────────────────────────────────────────────┐
│ [图标]  模板名称                              [系统标签] │
│         版本 · 阶段数 · 任务数                           │
│         描述文字                                        │
│         🏷️标签1 🏷️标签2                                 │
│         创建者：用户名                                   │
│                                                         │
│         [查看详情]        [选择此模板]                   │
└─────────────────────────────────────────────────────────┘
```

**系统模板特殊样式**
- 左上角：系统徽章（紫色）
- 徽章样式：
  - 背景：System Light（#F5F3FF）
  - 文字：System Badge（#8B5CF6）
  - 字体：Caption（11px, 600）
  - 内边距：2px 8px
  - 圆角：4px

**从空白开始卡片**
- 边框：1px dashed Border
- 背景：透明
- 文字居中
- 图标：Plus（Primary）

---

### 页面3：模板详情弹窗

#### 布局
- 弹窗宽度：720px
- 最大高度：80vh
- 圆角：16px
- 阴影：Shadow XL

#### 头部区域
- 背景：Primary Light（淡蓝背景）
- 内边距：24px
- 圆角：16px 16px 0 0

**模板名称**
- 字体：H1（24px, 600）
- 颜色：Text Primary

**元信息**
- 字体：Small（12px, 400）
- 颜色：Text Secondary
- 格式：版本 | 创建者 | 阶段数 | 任务数

**描述**
- 字体：Body（14px, 400）
- 颜色：Text Secondary
- 上边距：8px

#### 内容区域
- 最大高度：50vh
- 溢出：滚动
- 内边距：24px

**阶段标题**
- 字体：H3（16px, 600）
- 颜色：Text Primary
- 图标：Flag（Primary）
- 左边距：24px（缩进）

**任务列表**
- 左边距：48px（更深层级）
- 任务项间距：8px
- 任务图标：
  - 必需任务：CheckCircle（Success）
  - 可选任务：Circle（Text Tertiary）
- 任务文字：Body（14px, 400）

#### 底部操作区
- 背景：Surface
- 边框顶部：1px solid Border
- 内边距：16px 24px
- 圆角：0 0 16px 16px
- 按钮布局：右对齐，间距12px

---

### 页面4：保存为模板弹窗

#### 布局
- 弹窗宽度：560px
- 圆角：16px
- 阴影：Shadow XL

#### 表单区域
- 内边距：24px

**分组标题**
- 字体：Small（12px, 600）
- 颜色：Text Tertiary
- 大写
- 下边距：16px
- 分割线：下边框1px solid Border

**输入框规范**
- 高度：40px
- 边框：1px solid Border
- 圆角：8px
- 内边距：0 12px
- 字体：Body（14px）
- Focus状态：边框Primary，阴影0 0 0 3px Primary Light

**标签输入**
- 容器：多行flex布局
- 已选标签：胶囊样式
- 输入框：无边框，flex: 1

**单选按钮组**
- 选项卡片式布局
- 选中状态：边框Primary，背景Primary Light
- 图标+标题+描述的垂直布局

**复选框**
- 尺寸：16x16px
- 圆角：4px
- 选中：Primary背景，白色对勾

---

### 页面5：系统管理 - 模板管理列表页

#### 布局
- 全宽布局
- 内边距：24px
- 最大宽度：1400px，居中

#### 页面头部
**标题区**
- 标题：H1（24px, 600）
- 右边距：auto
- 新建按钮：Primary样式

**筛选栏**
- 搜索框：宽度280px
- 下拉筛选：宽度160px
- 间距：12px

#### 表格规范
**表头**
- 背景：Background
- 字体：Small（12px, 600）
- 颜色：Text Secondary
- 大写
- 高度：40px
- 内边距：12px 16px

**表格行**
- 高度：64px
- 内边距：12px 16px
- 边框底部：1px solid Border
- Hover背景：Background

**状态徽章**
- 启用：
  - 背景：`#ECFDF5`（Success Light）
  - 文字：Success
  - 圆角：full
  - 内边距：2px 8px
- 禁用：
  - 背景：`#F3F4F6`（Gray 100）
  - 文字：Text Tertiary
  - 圆角：full
  - 内边距：2px 8px

**来源标识**
- 系统：紫色徽章（System Badge）
- 公开：蓝色徽章（Primary）
- 私有：灰色徽章（Text Tertiary）

**操作按钮**
- 图标按钮：32x32px
- 圆角：6px
- Hover背景：Background
- 图标颜色：Text Secondary

---

### 页面6：新建/编辑模板页面

#### 布局
- 两栏布局：左侧320px（信息），右侧自适应（配置）
- 间距：24px
- 最大宽度：1200px

#### 左侧信息区
**表单字段**
- 标签：Small（12px, 500），Text Secondary
- 下边距：4px
- 输入框：标准样式

**可见性选择**
- 卡片式单选
- 图标+标题+描述
- 选中：Primary边框

