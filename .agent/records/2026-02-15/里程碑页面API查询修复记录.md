# 里程碑页面 API 查询修复记录

## 问题描述

项目详情的里程碑页面打开后，内容显示不完整，初始化的阶段、任务都没有加载出来。浏览器控制台报错：

```
GET http://localhost:3001/rest/v1/project_milestones?select=*%2C+milestone_tasks%28id%2C+is_completed%29&eq.project_id=d8c4dc32-1511-4b4b-a54b-2dea31a21e16&order=phase_order.asc 500 (Internal Server Error)

Error fetching milestones: {
  error: 'error',
  code: 'INTERNAL_ERROR',
  message: 'select *, "milestone_tasks(id", "is_completed)" from "project_milestones" where "project_id" = $1 order by "phase_order" asc - column "milestone_tasks(id" does not exist',
  statusCode: 500
}
```

## 问题分析

### 根本原因

前端代码使用了 PostgREST 风格的嵌入查询语法：
```typescript
.select('*, milestone_tasks(id, is_completed)')
```

这种语法是 Supabase/PostgREST 特有的**嵌入资源（embedded resources）**查询方式，用于在查询主表时同时获取关联表的数据。

### 后端问题

后端 `dbService.ts` 只是简单地将 select 参数按逗号分割：
```typescript
const fields = options.select.split(',').map(f => f.trim());
query = query.select(fields);
```

这导致 `milestone_tasks(id` 和 `is_completed)` 被当作普通字段名，最终生成的 SQL 语句为：
```sql
select *, "milestone_tasks(id", "is_completed)" from "project_milestones" ...
```

由于数据库中不存在名为 `milestone_tasks(id` 的列，所以报错。

## 修复方案

将嵌套查询改为两次独立查询：

1. 先查询所有里程碑数据
2. 再为每个里程碑查询任务统计信息

### 修改前代码
```typescript
const { data, error } = await api.db
  .from('project_milestones')
  .select('*, milestone_tasks(id, is_completed)')
  .eq('project_id', projectId)
  .order('phase_order', { ascending: true });

const milestonesData = (data || []).map((m: { milestone_tasks?: { is_completed: boolean }[] } & Milestone) => {
  const tasks = m.milestone_tasks || [];
  const total = tasks.length;
  const completed = tasks.filter((t) => t.is_completed).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { ...m, progress };
});
```

### 修改后代码
```typescript
const { data, error } = await api.db
  .from('project_milestones')
  .select('*')
  .eq('project_id', projectId)
  .order('phase_order', { ascending: true });

if (error) throw error;

const milestonesData = (data || []) as Milestone[];

// 获取每个里程碑的任务统计
const milestonesWithProgress = await Promise.all(
  milestonesData.map(async (m) => {
    const { data: tasksData } = await api.db
      .from('milestone_tasks')
      .select('id, is_completed')
      .eq('milestone_id', m.id);

    const tasks = tasksData || [];
    const total = tasks.length;
    const completed = tasks.filter((t: { is_completed: boolean }) => t.is_completed).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { ...m, progress };
  })
);
```

## 修复结果

- 里程碑页面现在可以正常加载所有阶段
- 每个阶段的进度统计正确显示
- 控制台无报错

## 相关文件

- `src/pages/projects/tabs/Milestones.tsx`

## 修复时间

2026-02-15
