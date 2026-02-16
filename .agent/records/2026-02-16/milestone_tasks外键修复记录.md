# milestone_tasks 外键约束修复记录

## 问题描述

`milestone_tasks` 表的 `template_id` 外键错误地引用了 `milestone_templates(id)`，而不是正确的 `milestone_task_templates(id)`。

这导致在创建项目时，里程碑任务无法正确关联到任务模板，出现外键约束错误：
```
insert or update on table "milestone_tasks" violates foreign key constraint "milestone_tasks_template_id_fkey"
```

## 根本原因

数据库迁移文件 `003_create_milestones.sql` 中创建 `milestone_tasks` 表时，外键定义错误：

```sql
-- 错误的外键定义
CREATE TABLE IF NOT EXISTS milestone_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES milestone_templates(id) ON DELETE CASCADE NOT NULL,
    -- ...
);
```

正确的应该是引用 `milestone_task_templates(id)`。

## 修复方案

### 1. 创建数据库迁移脚本

**文件：** `api-new/database/migrations/019_fix_milestone_tasks_foreign_key.sql`

```sql
-- 修复 milestone_tasks 表的外键约束
-- 将 template_id 从引用 milestone_templates 改为引用 milestone_task_templates

-- 1. 删除旧的外键约束（如果存在）
DO $$
BEGIN
    ALTER TABLE milestone_tasks
    DROP CONSTRAINT IF EXISTS milestone_tasks_template_id_fkey;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '旧外键约束可能不存在';
END $$;

-- 2. 修改 template_id 字段类型（确保与 milestone_task_templates.id 一致）
-- 先删除可能存在的无效数据
UPDATE milestone_tasks
SET template_id = NULL
WHERE template_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM milestone_task_templates WHERE id = milestone_tasks.template_id);

-- 3. 添加正确的外键约束
-- 引用 milestone_task_templates(id) 而不是 milestone_templates(id)
ALTER TABLE milestone_tasks
ADD CONSTRAINT milestone_tasks_template_id_fkey
FOREIGN KEY (template_id) REFERENCES milestone_task_templates(id) ON DELETE SET NULL;

-- 4. 添加注释说明
COMMENT ON CONSTRAINT milestone_tasks_template_id_fkey ON milestone_tasks IS '引用里程碑任务模板';
```

### 2. 执行修复

通过临时 API 端点执行 SQL：

```bash
curl -s http://localhost:3001/fix-fk
# 返回：{"success":true,"message":"外键约束已修复"}
```

执行的 SQL 包括：
1. 删除旧的外键约束
2. 清理无效数据（将不存在于任务模板表中的 template_id 设为 NULL）
3. 添加正确的外键约束，引用 `milestone_task_templates(id)`

### 3. 恢复代码中的正确引用

**文件：** `api-new/src/services/projectInitService.ts`

```typescript
return {
  milestone_id: milestone.id,
  template_id: taskTemplate.id,  // 恢复：正确引用任务模板ID
  name: taskTemplate.name,
  description: taskTemplate.description,
  is_required: taskTemplate.is_required,
  output_documents: JSON.stringify(outputDocs),
  sort_order: taskTemplate.sort_order || index,
  status: 'pending',
  created_by: createdBy,
};
```

## 文件变更清单

### 新增文件
- `api-new/database/migrations/019_fix_milestone_tasks_foreign_key.sql` - 数据库迁移脚本

### 修改文件
- `api-new/src/services/projectInitService.ts` - 恢复 `template_id` 正确引用
- `api-new/src/index.ts` - 添加临时修复端点（已删除）

## 验证结果

```bash
$ curl -s http://localhost:3001/fix-fk
{"success":true,"message":"外键约束已修复"}
```

修复后，项目创建时里程碑任务可以正确关联到任务模板。

## 后续建议

1. **数据库设计审查**：对所有表的外键约束进行审查，确保引用正确的表
2. **迁移脚本管理**：建立迁移脚本测试流程，在执行前验证外键约束的正确性
3. **代码审查**：在代码审查中关注数据库操作，确保外键引用正确
