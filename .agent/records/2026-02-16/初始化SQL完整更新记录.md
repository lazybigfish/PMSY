# 初始化 SQL 完整更新记录

## 更新内容

将多个修复类的迁移文件合并到初始化 SQL 中，避免后续部署到服务器再次出现相同问题。

## 修改的文件

### 1. 004_create_tasks.sql

**修改内容**: 更新 `priority` 字段约束，添加 `urgent` 选项

```sql
-- 修改前
priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'))

-- 修改后
priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
```

**已合并的修复文件**: ~~`017_update_task_priority_constraint.sql`~~

### 2. 003_create_milestones.sql

**修改内容**: 在 `milestone_tasks` 表中添加 `completed_by` 字段和索引

```sql
-- 添加字段
completed_by UUID REFERENCES profiles(id)

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_completed_by ON milestone_tasks(completed_by);
```

**已合并的修复文件**:
- ~~`018_fix_milestone_tasks_table.sql`~~
- ~~`019_fix_milestone_tasks_foreign_key.sql`~~
- ~~`020_add_milestone_tasks_completed_by.sql`~~

### 3. 012_create_supplier_extensions.sql

**修改内容**: 在 `project_suppliers` 表中添加两个字段

```sql
-- 添加字段
module_ids JSONB DEFAULT '[]'::jsonb
contract_file_url TEXT

-- 添加注释
COMMENT ON COLUMN project_suppliers.module_ids IS '供应商负责的模块ID列表';
COMMENT ON COLUMN project_suppliers.contract_file_url IS '供应商合同文件URL';
```

**已合并的修复文件**:
- ~~`021_add_project_supplier_module_ids.sql`~~
- ~~`022_add_project_supplier_contract_file.sql`~~

## 删除的修复 SQL 文件

以下文件已合并到初始化 SQL 中，现已删除：

1. ~~`017_update_task_priority_constraint.sql`~~
2. ~~`018_fix_milestone_tasks_table.sql`~~
3. ~~`019_fix_milestone_tasks_foreign_key.sql`~~
4. ~~`020_add_milestone_tasks_completed_by.sql`~~
5. ~~`021_add_project_supplier_module_ids.sql`~~
6. ~~`022_add_project_supplier_contract_file.sql`~~

## 保留的迁移文件

以下文件是独立功能，需要保留：

- `005_add_task_history.sql` - 任务历史记录功能（独立功能）

## 更新后的迁移文件列表

```
database/migrations/
├── 001_create_profiles.sql
├── 002_create_projects.sql
├── 003_create_milestones.sql      # 已更新
├── 004_create_tasks.sql            # 已更新
├── 005_add_task_history.sql        # 保留（独立功能）
├── 005_create_suppliers_and_risks.sql
├── 006_create_files_and_notifications.sql
├── 007_create_reports_and_ai.sql
├── 008_create_water_module.sql
├── 009_create_app_roles.sql
├── 010_create_milestone_templates.sql
├── 011_create_task_extensions.sql
├── 012_create_supplier_extensions.sql  # 已更新
├── 013_create_client_tables.sql
├── 014_create_file_extensions.sql
├── 015_create_forum_extensions.sql
└── 016_create_system_tables.sql
```

## 更新原因

1. **避免重复问题**: 新部署的环境会自动包含这些修复，不会再出现字段缺失或约束错误
2. **简化部署**: 减少迁移文件数量，降低部署复杂度
3. **保持整洁**: 删除冗余的修复文件，只保留必要的独立功能迁移

## 更新时间

2026-02-16
