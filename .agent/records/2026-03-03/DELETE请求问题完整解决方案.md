# DELETE 请求被拦截问题 - 完整解决方案

## 问题背景

服务器环境的云安全防护（如阿里云盾、腾讯云防护等）会拦截 DELETE 请求，导致出现 `ERR_CONNECTION_RESET` 错误。

## 影响范围统计

经全面排查，共有 **30+ 处** 删除功能受到影响：

### 1. 项目管理模块
| 功能 | 文件路径 | 当前实现 |
|------|----------|----------|
| 删除项目 | `src/services/projectService.ts:149` | `api.db.from('projects').delete()` |
| 删除项目模块 | `src/services/projectService.ts:195` | `api.db.from('project_modules').delete()` |
| 删除里程碑 | `src/services/projectService.ts:254` | `api.db.from('project_milestones').delete()` |
| 删除风险 | `src/services/projectService.ts:314` | `api.db.from('risks').delete()` |
| 删除项目成员 | `src/services/projectService.ts:381` | `api.db.from('project_members').delete()` |
| 删除功能模块 | `src/pages/projects/tabs/FunctionalModules.tsx:554` | `api.db.from('project_modules').delete()` |

### 2. 任务管理模块
| 功能 | 文件路径 | 当前实现 |
|------|----------|----------|
| 删除任务 | `src/services/taskService.ts:218` | `api.db.from('tasks').delete()` |
| 批量删除任务 | `src/services/taskService.ts:456` | 已使用 POST ✅ |
| 删除任务分配 | `src/services/taskService.ts:295` | `api.db.from('task_assignees').delete()` |
| 删除任务模块关联 | `src/services/taskService.ts:314` | `api.db.from('task_modules').delete()` |
| 删除任务依赖 | `src/services/taskService.ts:551` | `apiClient.delete()` |
| 任务列表删除 | `src/pages/tasks/TaskList.tsx:903,961` | `api.db.from('tasks').delete()` |

### 3. 文件管理模块
| 功能 | 文件路径 | 当前实现 |
|------|----------|----------|
| 删除文件 | `src/services/fileService.ts:173` | `api.db.from('files').delete()` |
| 删除文件夹 | `src/services/fileService.ts:180` | `api.db.from('folders').delete()` |

### 4. 系统管理模块
| 功能 | 文件路径 | 当前实现 |
|------|----------|----------|
| 删除角色 | `src/services/roleService.ts:105` | `api.db.from('app_roles').delete()` |
| 删除用户 | `src/services/userService.ts:65` | `api.db.from('profiles').delete()` |
| 删除客户 | `src/services/clientService.ts:100` | `api.db.from('client_contacts').delete()` |
| 删除供应商 | `src/services/supplierService.ts:110` | `api.db.from('suppliers').delete()` |
| 删除项目供应商 | `src/services/supplierService.ts:149` | `api.db.from('project_suppliers').delete()` |
| 删除备份 | `src/services/backupApi.ts:72` | `apiClient.delete()` |
| 删除 AI 提供商 | `src/services/systemService.ts:103` | `api.db.from('ai_providers').delete()` |
| 删除 AI 角色 | `src/services/systemService.ts:150` | `api.db.from('ai_roles').delete()` |
| 删除里程碑模板 | `src/services/systemService.ts:228` | `api.db.from('milestone_templates').delete()` |
| 删除里程碑任务模板 | `src/services/systemService.ts:260` | `api.db.from('milestone_task_templates').delete()` |

### 5. 论坛/社区模块
| 功能 | 文件路径 | 当前实现 |
|------|----------|----------|
| 删除帖子 | `src/services/forumService.ts:172` | `api.db.from('forum_posts').delete()` |
| 删除回复 | `src/services/forumService.ts:239` | `api.db.from('forum_replies').delete()` |
| 取消点赞 | `src/pages/water/ForumTab.tsx:266` | `.delete()` |

### 6. 通知模块
| 功能 | 文件路径 | 当前实现 |
|------|----------|----------|
| 删除通知 | `src/services/notificationService.ts:69` | `.delete()` |

### 7. 回款管理
| 功能 | 文件路径 | 当前实现 |
|------|----------|----------|
| 删除回款记录 | `src/pages/projects/tabs/ClientPayments.tsx:114` | 通过 hook 调用 |

## 解决方案对比

### 方案 1：前端自动降级（推荐）

**思路**：修改 `api.ts` 中的 delete 方法，当 DELETE 请求失败时自动使用 POST 替代。

**优点**：
- 无需修改每个调用点
- 对业务代码无侵入
- 一次修改，全局生效

**缺点**：
- 需要解析 filter 字符串转换为 conditions 对象
- 复杂的 filter 条件可能转换不准确

**实现状态**：✅ 已完成基础实现

### 方案 2：统一封装删除服务

**思路**：创建 `deleteService.ts`，所有删除操作都通过该服务调用。

**优点**：
- 集中管理删除逻辑
- 便于统一处理错误
- 可以灵活切换请求方式

**缺点**：
- 需要修改所有调用点
- 工作量较大

### 方案 3：后端提供批量操作端点

**思路**：后端提供统一的 POST /rest/v1/batch-delete 端点，支持批量删除。

**优点**：
- 最符合 RESTful 设计
- 支持批量操作，性能更好

**缺点**：
- 需要前后端都修改
- 需要处理复杂的查询条件

### 方案 4：直接全部改用 POST（最稳妥）

**思路**：将所有 `api.db.from('xxx').delete()` 改为直接调用 POST /rest/v1/delete

**优点**：
- 彻底解决问题
- 实现简单直接

**缺点**：
- 需要修改 30+ 处代码
- 代码可读性略有下降

## 推荐实施方案

### 第一阶段：完善前端自动降级（已完成）

已在 `src/lib/api.ts` 中实现：
```typescript
// 首先尝试 DELETE 请求
try {
  await request(endpoint, { method: 'DELETE' });
  return { data: null, error: null };
} catch (error: any) {
  // 如果是连接重置错误，尝试使用 POST 替代
  if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
    // 使用 POST /rest/v1/delete 替代
    const conditions = parseFilterToConditions(filters);
    await request('/rest/v1/delete', {
      method: 'POST',
      body: JSON.stringify({ table, conditions }),
    });
  }
}
```

### 第二阶段：后端新增通用删除端点（已完成）

已在 `api-new/src/routes/rest.ts` 中添加：
```typescript
POST /rest/v1/delete
Body: { table: string, conditions: Record<string, any> }
```

### 第三阶段：修复 filter 解析问题（待实施）

当前实现的问题是：filter 格式为 `eq.id=xxx`，需要正确解析为 `{ id: xxx }`。

**修复方案**：
```typescript
const parseFilterToConditions = (filters: Record<string, any>): Record<string, any> => {
  const conditions: Record<string, any> = {};
  
  Object.keys(filters).forEach(key => {
    // 处理 eq.column 格式
    const eqMatch = key.match(/^eq\.(\w+)$/);
    if (eqMatch) {
      conditions[eqMatch[1]] = filters[key];
      return;
    }
    
    // 处理其他操作符
    const match = key.match(/^(\w+)\.(\w+)$/);
    if (match) {
      const [, operator, column] = match;
      // 对于非 eq 操作符，可以存储为对象或跳过
      if (operator === 'eq') {
        conditions[column] = filters[key];
      }
    }
  });
  
  return conditions;
};
```

### 第四阶段：针对复杂删除的专项处理（待评估）

对于以下复杂场景，可能需要专项处理：

1. **批量删除** - 已使用 POST ✅
2. **级联删除** - 如删除帖子同时删除回复
3. **带复杂条件的删除** - 如 `in`, `gt`, `like` 等

## 立即修复步骤

### 步骤 1：修复 filter 解析逻辑

修改 `src/lib/api.ts` 中的 `executeDelete` 方法，完善 filter 到 conditions 的转换。

### 步骤 2：测试验证

测试以下删除功能：
- [ ] 删除项目
- [ ] 删除任务
- [ ] 删除文件
- [ ] 删除角色
- [ ] 删除用户

### 步骤 3：部署上线

1. 构建前端
2. 部署后端
3. 重启服务

## 备选方案

如果自动降级方案不稳定，建议采用**方案 4：直接全部改用 POST**，逐一批量修改服务层代码。

## 相关文件

- `src/lib/api.ts` - API 客户端（自动降级逻辑）
- `api-new/src/routes/rest.ts` - 后端路由（POST /rest/v1/delete）
- `src/services/*.ts` - 各业务服务（30+ 处删除调用）

## 修复记录

- 2026-03-03：发现问题，初步修复角色权限和项目删除
- 2026-03-03：全面排查，整理完整解决方案
