# 模块08：系统管理模块需求文档

## 版本信息
- **版本**: 2.0
- **更新日期**: 2026-02-10
- **状态**: 已同步代码实现

---

## 一、模块概述

### 1.1 模块定位
系统管理模块是PMSY系统的后台管理模块，提供用户管理、角色权限、系统配置等管理功能，仅对管理员开放。

### 1.2 核心职责
- 用户账号管理
- 角色权限配置
- 里程碑模板管理
- 报告模板配置
- AI服务配置
- 热点新闻配置
- 系统通用设置

---

## 二、用户角色与权限

### 2.1 角色定义

| 角色 | 说明 | 权限范围 |
|------|------|----------|
| 系统管理员 | 系统超级管理员 | 所有功能 |
| 普通用户 | 普通项目成员 | 仅查看自己的信息 |

### 2.2 权限矩阵

| 功能 | 系统管理员 | 普通用户 |
|------|-----------|----------|
| 用户管理 | ✓ | ✗ |
| 角色权限 | ✓ | ✗ |
| 里程碑模板 | ✓ | ✗ |
| 报告模板 | ✓ | ✗ |
| AI配置 | ✓ | ✗ |
| 热点配置 | ✓ | ✗ |
| 通用设置 | ✓ | ✗ |

---

## 三、功能需求

### 3.1 Tab导航

| Tab | 标识 | 说明 | 权限 |
|-----|------|------|------|
| 用户管理 | users | 管理系统用户 | 管理员 |
| 角色权限 | roles | 配置角色和权限 | 管理员 |
| 里程碑模板 | milestone-templates | 管理项目里程碑模板 | 管理员 |
| 报告模板 | report-templates | 配置报告模板 | 管理员 |
| AI配置 | ai-config | 配置AI服务 | 管理员 |
| 热点配置 | hot-news | 配置热点关键词 | 仅管理员 |
| 通用设置 | general | 系统通用配置 | 管理员 |

### 3.2 用户管理

#### 3.2.1 用户列表
- 显示所有用户信息
- 支持搜索用户名/邮箱
- 显示用户角色和状态

#### 3.2.2 创建用户
- 用户名
- 邮箱
- 密码
- 角色
- 全名

#### 3.2.3 编辑用户
- 修改用户信息
- 重置密码
- 修改角色

#### 3.2.4 删除用户
- 支持删除用户账号

### 3.3 角色权限管理

#### 3.3.1 角色列表
- 显示系统角色
- 显示角色权限

#### 3.3.2 权限配置
- 为角色分配模块权限
- 模块：dashboard/projects/tasks/suppliers/analysis/system

### 3.4 里程碑模板管理

#### 3.4.1 模板列表
- 显示7个标准阶段
- 支持编辑阶段信息

#### 3.4.2 阶段配置
- 阶段名称
- 阶段描述
- 阶段顺序
- 必选任务

### 3.5 报告模板配置

#### 3.5.1 模板类型
- 日报模板
- 周报模板

#### 3.5.2 模板编辑
- 模板标题
- 模板内容
- 变量支持

### 3.6 AI配置

#### 3.6.1 AI提供商配置
- 提供商名称
- API密钥
- 模型选择
- 启用状态

#### 3.6.2 AI角色预设
- 角色名称
- 角色描述
- 系统提示词

### 3.7 热点配置（仅管理员）

#### 3.7.1 关键词配置
- 添加关注关键词
- 删除关键词
- 设置抓取频率

#### 3.7.2 热点新闻管理
- 查看抓取的新闻
- 手动添加新闻
- 删除新闻

### 3.8 通用设置

#### 3.8.1 系统配置
- 系统名称
- Logo设置
- 主题配置

---

## 四、数据模型

### 4.1 核心数据表

#### profiles（用户资料表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| username | text | 用户名 |
| full_name | text | 全名 |
| email | text | 邮箱 |
| role | text | 角色：admin/user |
| created_at | timestamptz | 创建时间 |

#### role_permissions（角色权限表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| role_key | text | 角色标识 |
| module_key | text | 模块标识 |

#### milestone_templates（里程碑模板表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| name | text | 阶段名称 |
| description | text | 阶段描述 |
| phase_order | integer | 阶段顺序 |
| is_active | boolean | 是否启用 |

#### ai_providers（AI提供商表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| name | text | 提供商名称 |
| api_key | text | API密钥 |
| model | text | 模型名称 |
| is_active | boolean | 是否启用 |

#### system_configs（系统配置表）
| 字段 | 类型 | 说明 |
|------|------|------|
| key | text | 主键 |
| value | text | 配置值 |
| description | text | 描述 |

---

## 五、接口规范

### 5.1 用户管理

```typescript
// 获取用户列表
const { data } = await supabase.from('profiles').select('*');

// 创建用户（通过Auth API）
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { username, full_name, role } }
});

// 更新用户
const { error } = await supabase
  .from('profiles')
  .update({ full_name, role })
  .eq('id', userId);

// 删除用户
const { error } = await supabase.auth.admin.deleteUser(userId);
```

### 5.2 角色权限

```typescript
// 获取角色权限
const { data } = await supabase
  .from('role_permissions')
  .select('*')
  .eq('role_key', role);

// 更新权限
const { error } = await supabase
  .from('role_permissions')
  .insert({ role_key, module_key });
```

### 5.3 里程碑模板

```typescript
// 获取模板
const { data } = await supabase
  .from('milestone_templates')
  .select('*')
  .eq('is_active', true)
  .order('phase_order');

// 更新模板
const { error } = await supabase
  .from('milestone_templates')
  .update({ name, description })
  .eq('id', id);
```

### 5.4 AI配置

```typescript
// 获取AI配置
const { data } = await supabase.from('ai_providers').select('*');

// 更新AI配置
const { error } = await supabase
  .from('ai_providers')
  .update({ api_key, model, is_active })
  .eq('id', id);
```

---

## 六、界面原型

```
┌─────────────────────────────────────────────────────────────────────┐
│ 系统设置                                                             │
├─────────────────────────────────────────────────────────────────────┤
│ [用户管理][角色权限][里程碑模板][报告模板][AI配置][热点配置][通用设置]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  当前Tab内容...                                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 七、验收标准

### 7.1 功能验收

| 验收项 | 验收标准 | 状态 |
|--------|----------|------|
| 用户管理 | CRUD操作正常 | 已实现 |
| 角色权限 | 权限配置生效 | 已实现 |
| 里程碑模板 | 7个阶段可配置 | 已实现 |
| 报告模板 | 模板可编辑 | 部分实现 |
| AI配置 | 提供商配置可保存 | 已实现 |
| 热点配置 | 关键词配置生效 | 已实现 |
| 通用设置 | 系统配置可修改 | 已实现 |

### 7.2 性能验收

| 验收项 | 标准 | 状态 |
|--------|------|------|
| 页面加载 | < 3秒 | 已实现 |
| 配置保存 | < 2秒 | 已实现 |

---

## 八、修订记录

| 版本 | 日期 | 修订内容 | 修订人 |
|------|------|----------|--------|
| 1.0 | 2025-02-09 | 初始版本 | AI Assistant |
| 2.0 | 2026-02-10 | 同步代码实现，更新所有管理功能 | AI Assistant |
