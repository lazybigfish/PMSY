# 模块03：项目管理模块需求文档

## 版本信息
- **版本**: 2.0
- **更新日期**: 2026-02-10
- **状态**: 已同步代码实现

---

## 一、模块概述

### 1.1 模块定位
项目管理模块是PMSY系统的核心模块，负责项目的全生命周期管理，包括项目创建、信息管理、功能模块管理、里程碑管理、风险管理、供应商关联等功能。

### 1.2 核心职责
- 项目创建与基础信息管理
- 功能模块的树形结构管理
- 7个标准里程碑阶段管理
- 项目风险登记与跟踪
- 供应商关联管理
- 项目健康度评估

---

## 二、用户角色与权限

### 2.1 角色定义

| 角色 | 说明 | 权限范围 |
|------|------|----------|
| 项目经理 | 项目创建者 | 拥有项目的完整管理权限 |
| 项目成员 | 被添加到项目的用户 | 查看项目，部分编辑权限 |
| 系统管理员 | 系统管理员 | 可查看所有项目 |

### 2.2 权限矩阵

| 功能 | 项目经理 | 项目成员 | 系统管理员 |
|------|----------|----------|-----------|
| 创建项目 | ✓ | ✗ | ✓ |
| 编辑项目信息 | ✓ | ✗ | ✓ |
| 删除项目 | ✓ | ✗ | ✓ |
| 管理功能模块 | ✓ | ✓ | ✓ |
| 管理里程碑 | ✓ | ✓ | ✓ |
| 管理风险 | ✓ | ✓ | ✓ |
| 关联供应商 | ✓ | ✓ | ✓ |
| 查看项目 | ✓ | ✓ | ✓ |

---

## 三、功能需求

### 3.1 项目列表页面

#### 3.1.1 页面头部
- **标题**: "项目管理"
- **副标题**: "管理项目全生命周期，跟踪进度与里程碑"
- **新建项目按钮**: 跳转到项目创建页面

#### 3.1.2 搜索与筛选
| 功能 | 说明 |
|------|------|
| 搜索框 | 支持按项目名称、客户名称、描述搜索 |
| 状态筛选 | 全部/未开始/进行中/已完成 |
| 筛选展开 | 点击筛选图标展开/收起筛选条件 |

#### 3.1.3 项目列表表格

| 列名 | 说明 |
|------|------|
| 序号 | 项目序号 |
| 项目信息 | 项目名称 + 客户名称 + 项目金额 |
| 当前阶段 | 显示当前里程碑阶段名称，带颜色标识 |
| 功能进度 | 完成功能模块数/总模块数 |
| 成员 | 项目成员数量 |
| 健康度 | 0-100分，根据风险计算 |
| 操作 | 查看、编辑、删除 |

**阶段颜色标识:**
| 阶段 | 颜色 |
|------|------|
| 进场前阶段 | 灰色 |
| 启动阶段 | 蓝色 |
| 实施阶段 | 靛蓝色 |
| 初验阶段 | 紫色 |
| 试运行阶段 | 黄色 |
| 终验阶段 | 橙色 |
| 运维阶段 | 绿色 |

**健康度计算规则:**
- 基础分: 100分
- 每个活跃高风险: -20分
- 每个活跃中风险: -10分
- 每个活跃低风险: -5分
- 最低: 0分

#### 3.1.4 空状态
- 显示提示: "暂无项目"
- 显示新建项目按钮

### 3.2 项目创建页面

#### 3.2.1 表单字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 项目名称 | 文本 | 是 | 项目名称 |
| 客户名称 | 文本 | 是 | 客户公司名称 |
| 项目金额 | 数字 | 否 | 项目合同金额 |
| 项目描述 | 文本域 | 否 | 项目详细描述 |
| 是否公开 | 开关 | 否 | 项目是否对团队成员可见 |

#### 3.2.2 创建流程
1. 填写项目基本信息
2. 点击"创建项目"
3. 系统自动：
   - 创建项目记录
   - 将创建者设为项目经理
   - 初始化7个里程碑阶段
   - 为每个阶段创建对应的必选任务
4. 跳转到项目详情页

#### 3.2.3 里程碑阶段定义

项目创建时自动初始化以下7个阶段：

| 顺序 | 阶段名称 | 说明 |
|------|----------|------|
| 1 | 进场前阶段 | 项目启动前的内部筹备 |
| 2 | 启动阶段 | 正式确立项目，完成资源协调 |
| 3 | 实施阶段 | 项目交付的核心阶段 |
| 4 | 初验阶段 | 项目成果初步验收 |
| 5 | 试运行阶段 | 系统稳定运行和财务结算 |
| 6 | 终验阶段 | 项目最终交付 |
| 7 | 运维阶段 | 项目正式移交运维 |

### 3.3 项目详情页面

#### 3.3.1 页面头部
- **返回按钮**: 返回项目列表
- **项目名称**: 显示/编辑项目名称
- **客户名称**: 显示客户信息
- **编辑按钮**: 项目经理可编辑项目信息

#### 3.3.2 Tab导航

| Tab | 标识 | 说明 |
|-----|------|------|
| 项目概览 | overview | 项目基本信息和统计 |
| 功能模块 | modules | 项目功能模块树形管理 |
| 里程碑 | milestones | 7个阶段管理 |
| 风险 | risks | 项目风险登记 |
| 供应商 | suppliers | 关联供应商管理 |
| 周日报 | reports | 项目报告管理 |

#### 3.3.3 项目概览Tab
- 项目基本信息展示
- 项目状态显示
- 项目经理信息
- 创建时间
- 是否公开标识

#### 3.3.4 功能模块Tab
- 树形结构展示功能模块
- 支持添加/编辑/删除模块
- 模块状态管理
- 模块层级支持（父模块-子模块）

#### 3.3.5 里程碑Tab
- 7个阶段列表展示
- 每个阶段显示：
  - 阶段名称和描述
  - 状态（未开始/进行中/已完成）
  - 必选任务列表
  - 任务完成状态
- 支持更新阶段状态
- 支持更新任务完成状态

#### 3.3.6 风险Tab
- 风险列表展示
- 支持添加/编辑/删除风险
- 风险等级：高/中/低
- 风险状态：待处理/处理中/已关闭
- 风险责任人
- 影响分析和应对措施

#### 3.3.7 供应商Tab
- 关联供应商列表
- 支持添加/移除供应商关联
- 显示供应商合同金额和进度

#### 3.3.8 周日报Tab
- 项目报告列表
- 支持创建/编辑报告

---

## 四、数据模型

### 4.1 核心数据表

#### projects（项目表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| name | text | 项目名称 |
| customer_name | text | 客户名称 |
| amount | decimal(15,2) | 项目金额 |
| description | text | 项目描述 |
| status | text | 状态：pending/in_progress/completed/paused |
| is_public | boolean | 是否公开 |
| manager_id | uuid | 项目经理ID |
| current_milestone_id | uuid | 当前里程碑ID |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

#### project_members（项目成员表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| project_id | uuid | 项目ID |
| user_id | uuid | 用户ID |
| role | text | 角色：manager/member |
| joined_at | timestamptz | 加入时间 |

#### project_modules（功能模块表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| project_id | uuid | 项目ID |
| parent_id | uuid | 父模块ID |
| name | text | 模块名称 |
| description | text | 模块描述 |
| status | text | 状态 |
| sort_order | integer | 排序序号 |
| level | integer | 层级 |

#### project_milestones（项目里程碑表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| project_id | uuid | 项目ID |
| name | text | 阶段名称 |
| description | text | 阶段描述 |
| status | text | 状态：pending/in_progress/completed |
| phase_order | integer | 阶段顺序（1-7） |
| start_date | date | 开始日期 |
| end_date | date | 结束日期 |

#### milestone_tasks（里程碑任务表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| milestone_id | uuid | 里程碑ID |
| name | text | 任务名称 |
| description | text | 任务描述 |
| is_required | boolean | 是否必选 |
| is_completed | boolean | 是否完成 |
| output_documents | jsonb | 输出文档列表 |

#### risks（风险表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| project_id | uuid | 项目ID |
| title | text | 风险标题 |
| description | text | 风险描述 |
| level | text | 等级：low/medium/high |
| status | text | 状态：open/handling/closed |
| owner_id | uuid | 责任人ID |
| impact | text | 影响分析 |
| mitigation_plan | text | 应对措施 |
| handling_records | jsonb | 处置记录 |

### 4.2 TypeScript类型定义

```typescript
interface Project {
  id: string;
  name: string;
  customer_name: string;
  amount: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'paused';
  is_public: boolean;
  manager_id: string;
  current_milestone_id?: string;
  created_at: string;
  updated_at: string;
}

interface ProjectModule {
  id: string;
  project_id: string;
  parent_id?: string;
  name: string;
  description: string;
  status: string;
  sort_order: number;
  level: number;
}

interface ProjectMilestone {
  id: string;
  project_id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  phase_order: number;
  start_date?: string;
  end_date?: string;
}

interface MilestoneTask {
  id: string;
  milestone_id: string;
  name: string;
  description: string;
  is_required: boolean;
  is_completed: boolean;
  output_documents: any[];
}

interface Risk {
  id: string;
  project_id: string;
  title: string;
  description: string;
  level: 'low' | 'medium' | 'high';
  status: 'open' | 'handling' | 'closed';
  owner_id: string;
  impact: string;
  mitigation_plan: string;
  handling_records: any[];
}
```

---

## 五、接口规范

### 5.1 项目列表

```typescript
// 获取项目列表（含关联数据）
const { data: projectsData, error } = await supabase
  .from('projects')
  .select(`
    *,
    milestones:project_milestones(status, name, phase_order),
    modules:project_modules(status),
    risks(level, status),
    members:project_members(count)
  `)
  .order('created_at', { ascending: false });
```

### 5.2 项目详情

```typescript
// 获取项目详情
const { data: projectData, error } = await supabase
  .from('projects')
  .select(`
    *,
    manager:profiles(id, full_name, email)
  `)
  .eq('id', id)
  .single();

// 检查编辑权限
const { data: memberData } = await supabase
  .from('project_members')
  .select('role')
  .eq('project_id', id)
  .eq('user_id', user.id)
  .single();
```

### 5.3 创建项目

```typescript
// 创建项目
const { data: project, error } = await supabase
  .from('projects')
  .insert({
    name,
    customer_name,
    amount,
    description,
    manager_id: user.id,
    is_public: true
  })
  .select()
  .single();

// 添加项目经理到成员表
await supabase.from('project_members').insert({
  project_id: project.id,
  user_id: user.id,
  role: 'manager'
});

// 初始化里程碑（从模板）
const { data: templates } = await supabase
  .from('milestone_templates')
  .select('*')
  .eq('is_active', true)
  .order('phase_order');

// 创建里程碑和任务...
```

### 5.4 更新项目

```typescript
const { error } = await supabase
  .from('projects')
  .update({
    name,
    customer_name,
    amount,
    description,
    is_public
  })
  .eq('id', id);
```

### 5.5 删除项目

```typescript
const { error } = await supabase
  .from('projects')
  .delete()
  .eq('id', projectId);
```

---

## 六、界面原型

### 6.1 项目列表

```
┌─────────────────────────────────────────────────────────────────────┐
│ 项目管理                                            [+ 新建项目]      │
│ 管理项目全生命周期，跟踪进度与里程碑                                   │
├─────────────────────────────────────────────────────────────────────┤
│ [搜索项目...] [筛选 ▼]                                              │
├─────────────────────────────────────────────────────────────────────┤
│ 序号 │ 项目信息              │ 当前阶段   │ 功能进度 │ 成员 │ 健康度 │
├──────┼───────────────────────┼────────────┼──────────┼──────┼────────┤
│  1   │ 项目名称A             │ [实施阶段] │ 60%      │  5   │  80    │
│      │ 客户：某某公司        │            │          │      │        │
│      │ 金额：¥100,000        │            │          │      │        │
├──────┼───────────────────────┼────────────┼──────────┼──────┼────────┤
│  2   │ 项目名称B             │ [启动阶段] │ 30%      │  3   │  100   │
│      │ 客户：另一公司        │            │          │      │        │
│      │ 金额：¥50,000         │            │          │      │        │
└──────┴───────────────────────┴────────────┴──────────┴──────┴────────┘
```

### 6.2 项目详情

```
┌─────────────────────────────────────────────────────────────────────┐
│ [←] 项目名称A                                          [编辑项目]    │
│     客户：某某公司                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ [项目概览] [功能模块] [里程碑] [风险] [供应商] [周日报]              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  项目概览内容...                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 七、验收标准

### 7.1 功能验收

| 验收项 | 验收标准 | 状态 |
|--------|----------|------|
| 项目列表 | 显示所有项目，支持搜索筛选 | 已实现 |
| 项目创建 | 创建后自动初始化7个里程碑 | 已实现 |
| 项目编辑 | 项目经理可编辑项目信息 | 已实现 |
| 项目删除 | 项目经理可删除项目 | 已实现 |
| 功能模块 | 支持树形结构管理 | 已实现 |
| 里程碑 | 7个阶段管理，任务完成状态 | 已实现 |
| 风险 | 风险登记、等级、状态管理 | 已实现 |
| 供应商 | 供应商关联管理 | 已实现 |
| 健康度 | 根据风险自动计算 | 已实现 |

### 7.2 性能验收

| 验收项 | 标准 | 状态 |
|--------|------|------|
| 列表加载 | < 3秒 | 已实现 |
| 详情加载 | < 2秒 | 已实现 |
| 创建项目 | < 5秒（含初始化） | 已实现 |

---

## 八、修订记录

| 版本 | 日期 | 修订内容 | 修订人 |
|------|------|----------|--------|
| 1.0 | 2025-02-09 | 初始版本 | AI Assistant |
| 2.0 | 2026-02-10 | 同步代码实现，更新项目列表、详情、里程碑、健康度计算 | AI Assistant |
