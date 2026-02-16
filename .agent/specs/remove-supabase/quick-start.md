# 新架构快速开始指南

## 概述

本项目已完成从 Supabase 到 REST API + Service Layer 架构的迁移。本文档帮助开发者快速上手新架构。

## 架构概览

```
页面组件 → Service Layer → API Client → 后端 REST API
                ↓
         Supabase 兼容层（过渡方案）
```

## 如何使用

### 1. 使用 Service Layer（推荐）

新开发的组件应该直接使用 Service Layer：

```typescript
import { roleService, userService, taskService } from '../services';

// 获取角色列表
const roles = await roleService.getRoles();

// 获取用户列表
const users = await userService.getUsers();

// 创建任务
const task = await taskService.createTask({
  title: '新任务',
  project_id: 'project-123',
  status: 'pending',
});
```

### 2. 继续使用 supabase（兼容方案）

现有组件可以继续使用 supabase，调用会自动转发到 Service Layer：

```typescript
import { supabase } from '../lib/supabase';

// 这些调用会被自动转发到对应的 service
const { data: roles } = await supabase.from('app_roles').select('*');
const { data: users } = await supabase.from('profiles').select('*');
```

## Service 列表

| Service | 文件 | 主要功能 |
|---------|------|----------|
| authService | `src/services/authService.ts` | 登录/注册/登出 |
| userService | `src/services/userService.ts` | 用户管理 |
| roleService | `src/services/roleService.ts` | 角色权限管理 |
| taskService | `src/services/taskService.ts` | 任务管理 |
| projectService | `src/services/projectService.ts` | 项目管理 |
| fileService | `src/services/fileService.ts` | 文件管理 |
| systemService | `src/services/systemService.ts` | 系统配置 |
| forumService | `src/services/forumService.ts` | 论坛管理 |
| supplierService | `src/services/supplierService.ts` | 供应商管理 |
| clientService | `src/services/clientService.ts` | 客户管理 |
| analysisService | `src/services/analysisService.ts` | 分析报表 |

## 类型定义

所有类型定义位于 `src/types/` 目录：

```typescript
import type { User, Profile, Task, Project } from '../types';
```

## 开发规范

### 1. 新组件开发

- ✅ 使用 Service Layer 直接调用 API
- ✅ 使用 TypeScript 类型
- ✅ 避免直接使用 supabase

示例：

```typescript
import React, { useEffect, useState } from 'react';
import { roleService } from '../services';
import type { AppRole } from '../types';

export default function RoleList() {
  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    const data = await roleService.getRoles();
    setRoles(data);
  };

  return (
    <div>
      {roles.map(role => (
        <div key={role.key}>{role.name}</div>
      ))}
    </div>
  );
}
```

### 2. 旧组件改造

逐步将旧组件从 supabase 迁移到 Service Layer：

**改造前：**
```typescript
const { data } = await supabase
  .from('app_roles')
  .select('*')
  .order('name');
```

**改造后：**
```typescript
const data = await roleService.getRoles();
```

## 常见问题

### Q: 我应该使用 supabase 还是 service？

**A:** 
- 新组件：使用 Service Layer
- 旧组件：可以继续使用 supabase（兼容层会自动转发）
- 改造旧组件时：替换为 Service Layer

### Q: 类型错误怎么办？

**A:** 
1. 检查类型定义是否在 `src/types/` 中
2. 如果缺少字段，添加到对应的类型文件中
3. 类型错误不影响运行时功能

### Q: 如何添加新的 API 调用？

**A:**
1. 在对应的 service 文件中添加方法
2. 在类型文件中添加类型定义
3. 在组件中使用 service 方法

## 迁移进度

| 组件 | 状态 | 说明 |
|------|------|------|
| RoleManagement | ✅ 已迁移 | 使用 roleService |
| UserManagement | ✅ 已迁移 | 使用 userService |
| TaskDetailPage | ⏳ 待迁移 | 使用兼容层 |
| ProjectOverview | ⏳ 待迁移 | 使用兼容层 |
| ... | ⏳ 待迁移 | 共 30 个组件 |

## 后续计划

### 短期（1-2周）
- 修复剩余类型错误
- 迁移高频使用的组件

### 中期（1-2月）
- 添加请求缓存
- 完全移除兼容层

### 长期（3-6月）
- 考虑 GraphQL 迁移
- 后端微服务化

## 参考文档

- [架构改造总结](./architecture-summary.md)
- [详细实施计划](./implementation-plan.md)
- [项目开发日报](../../records/2026-02-14/2026-02-14-项目开发日报.md)

## 技术支持

如有问题，请参考：
1. 本文档
2. 架构改造总结
3. 现有组件示例（RoleManagement, UserManagement）
