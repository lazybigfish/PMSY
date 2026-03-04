# DELETE 改 POST 实施方案（最稳妥方案）

## 实施策略

采用**方案4：直接全部改用 POST**，将所有 `api.db.from('xxx').delete()` 改为直接调用 `POST /rest/v1/delete`

## 实施批次规划

### 批次1：核心模块（优先级：高）
影响主要业务流程，优先修复

| 序号 | 功能 | 文件路径 | 修改内容 |
|------|------|----------|----------|
| 1 | 删除项目 | `src/services/projectService.ts:149` | 改用 POST /rest/v1/delete |
| 2 | 删除项目模块 | `src/services/projectService.ts:195` | 改用 POST /rest/v1/delete |
| 3 | 删除里程碑 | `src/services/projectService.ts:254` | 改用 POST /rest/v1/delete |
| 4 | 删除风险 | `src/services/projectService.ts:314` | 改用 POST /rest/v1/delete |
| 5 | 删除项目成员 | `src/services/projectService.ts:381` | 改用 POST /rest/v1/delete |
| 6 | 删除任务 | `src/services/taskService.ts:218` | 改用 POST /rest/v1/delete |
| 7 | 删除任务分配 | `src/services/taskService.ts:295` | 改用 POST /rest/v1/delete |
| 8 | 删除任务模块关联 | `src/services/taskService.ts:314` | 改用 POST /rest/v1/delete |
| 9 | 删除文件 | `src/services/fileService.ts:173` | 改用 POST /rest/v1/delete |
| 10 | 删除文件夹 | `src/services/fileService.ts:180` | 改用 POST /rest/v1/delete |

**预计工作量**：10处，约30分钟

---

### 批次2：系统管理模块（优先级：高）
管理员常用功能

| 序号 | 功能 | 文件路径 | 修改内容 |
|------|------|----------|----------|
| 11 | 删除角色 | `src/services/roleService.ts:105` | 改用 POST /rest/v1/delete |
| 12 | 删除用户 | `src/services/userService.ts:65` | 改用 POST /rest/v1/delete |
| 13 | 删除客户 | `src/services/clientService.ts:100` | 改用 POST /rest/v1/delete |
| 14 | 删除供应商 | `src/services/supplierService.ts:110` | 改用 POST /rest/v1/delete |
| 15 | 删除项目供应商 | `src/services/supplierService.ts:149` | 改用 POST /rest/v1/delete |
| 16 | 删除备份 | `src/services/backupApi.ts:72` | 改用 POST /rest/v1/delete |
| 17 | 删除 AI 提供商 | `src/services/systemService.ts:103` | 改用 POST /rest/v1/delete |
| 18 | 删除 AI 角色 | `src/services/systemService.ts:150` | 改用 POST /rest/v1/delete |
| 19 | 删除里程碑模板 | `src/services/systemService.ts:228` | 改用 POST /rest/v1/delete |
| 20 | 删除里程碑任务模板 | `src/services/systemService.ts:260` | 改用 POST /rest/v1/delete |

**预计工作量**：10处，约30分钟

---

### 批次3：其他模块（优先级：中）
论坛、通知等功能

| 序号 | 功能 | 文件路径 | 修改内容 |
|------|------|----------|----------|
| 21 | 删除帖子 | `src/services/forumService.ts:172` | 改用 POST /rest/v1/delete |
| 22 | 删除回复 | `src/services/forumService.ts:239` | 改用 POST /rest/v1/delete |
| 23 | 删除通知 | `src/services/notificationService.ts:69` | 改用 POST /rest/v1/delete |
| 24 | 取消点赞 | `src/pages/water/ForumTab.tsx:266` | 改用 POST /rest/v1/delete |
| 25 | 删除功能模块 | `src/pages/projects/tabs/FunctionalModules.tsx:554` | 改用 POST /rest/v1/delete |
| 26 | 任务列表删除 | `src/pages/tasks/TaskList.tsx:903` | 改用 POST /rest/v1/delete |
| 27 | 任务列表删除2 | `src/pages/tasks/TaskList.tsx:961` | 改用 POST /rest/v1/delete |
| 28 | 删除任务依赖 | `src/services/taskService.ts:551` | 改用 POST /rest/v1/delete |

**预计工作量**：8处，约25分钟

---

## 修改示例

### 修改前
```typescript
// src/services/projectService.ts
export async function deleteProject(projectId: string): Promise<void> {
  await api.db.from('projects').delete().eq('id', projectId);
}
```

### 修改后
```typescript
// src/services/projectService.ts
export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.post('/rest/v1/delete', {
    table: 'projects',
    conditions: { id: projectId }
  });
}
```

---

## 实施检查清单

### 批次1检查项
- [ ] 删除项目功能正常
- [ ] 删除项目模块功能正常
- [ ] 删除里程碑功能正常
- [ ] 删除风险功能正常
- [ ] 删除项目成员功能正常
- [ ] 删除任务功能正常
- [ ] 删除任务分配功能正常
- [ ] 删除任务模块关联功能正常
- [ ] 删除文件功能正常
- [ ] 删除文件夹功能正常

### 批次2检查项
- [ ] 删除角色功能正常
- [ ] 删除用户功能正常
- [ ] 删除客户功能正常
- [ ] 删除供应商功能正常
- [ ] 删除项目供应商功能正常
- [ ] 删除备份功能正常
- [ ] 删除 AI 提供商功能正常
- [ ] 删除 AI 角色功能正常
- [ ] 删除里程碑模板功能正常
- [ ] 删除里程碑任务模板功能正常

### 批次3检查项
- [ ] 删除帖子功能正常
- [ ] 删除回复功能正常
- [ ] 删除通知功能正常
- [ ] 取消点赞功能正常
- [ ] 删除功能模块功能正常
- [ ] 任务列表删除功能正常

---

## 部署流程

每批次完成后：
1. **本地构建测试**：`npm run build`
2. **提交代码**：git commit
3. **部署后端**：重启 api 容器
4. **部署前端**：重启 nginx 容器
5. **功能验证**：按检查清单测试

---

## 风险评估

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 修改遗漏 | 中 | 高 | 按清单逐一检查 |
| 参数传递错误 | 低 | 高 | 严格按示例修改 |
| 后端端点问题 | 低 | 高 | 已测试可用 |
| 部署失败 | 低 | 中 | 保留原代码备份 |

---

## 回滚方案

如出现问题，可快速回滚：
1. 使用 git 回滚到修改前版本
2. 重新部署
3. 恢复服务

---

## 时间估算

| 批次 | 修改数量 | 预计时间 |
|------|----------|----------|
| 批次1 | 10处 | 30分钟 |
| 批次2 | 10处 | 30分钟 |
| 批次3 | 8处 | 25分钟 |
| 测试验证 | - | 30分钟 |
| 部署上线 | - | 20分钟 |
| **总计** | **28处** | **约2.5小时** |

---

## 开始实施

请确认后开始第一批次实施。
