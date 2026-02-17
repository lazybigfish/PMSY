# 初始化 SQL 合并与部署脚本优化记录

## 日期
2026-02-17

## 背景
原有数据库初始化方案使用多个分散的 SQL 文件（001-016）和后续的 ALTER 语句（017-022）来修复问题。这种方案在全新部署时需要执行大量 ALTER 语句，效率低下且容易出错。

## 优化目标
1. 将所有的 ALTER 语句合并到基础表创建中
2. 创建一套完整的、无需 ALTER 的全新部署 SQL 文件
3. 优化部署脚本，使用新的 SQL 初始化方案
4. 确保循环依赖问题得到正确处理

## 文件变更

### 新增文件

#### 1. 合并后的 SQL 初始化文件 (`api-new/database/init/`)

| 序号 | 文件名 | 说明 | 合并的修改 |
|------|--------|------|------------|
| 001 | `001_create_profiles.sql` | 用户基础表 | 无变化 |
| 002 | `002_create_projects.sql` | 项目相关表 | 无变化 |
| 003 | `003_create_milestones.sql` | 里程碑相关表 | 无变化 |
| 004 | `004_create_tasks.sql` | 任务相关表 | 添加了 `start_date` 字段（原 011） |
| 005 | `005_create_task_history.sql` | 任务历史记录 | 无变化 |
| 006 | `006_create_suppliers_and_risks.sql` | 供应商和风险表 | 合并了 017-020 的字段修改，移除了 project_supplier_id 的外键约束（解决循环依赖） |
| 007 | `007_create_files_and_notifications.sql` | 文件和通知表 | 添加了 `module_type` 字段（原 014） |
| 008 | `008_create_reports_and_ai.sql` | 报告和AI表 | 无变化 |
| 009 | `009_create_water_module.sql` | 论坛模块表 | 合并了 021 的 category 约束修改，合并了 022 的点赞触发器 |
| 010 | `010_create_app_roles.sql` | 角色权限表 | 无变化 |
| 011 | `011_create_milestone_templates.sql` | 里程碑模板表 | 无变化 |
| 012 | `012_create_task_extensions.sql` | 任务扩展表 | 无变化 |
| 013 | `013_create_supplier_extensions.sql` | 供应商扩展表 | 添加了 supplier_payment_plans.project_supplier_id 外键约束（解决循环依赖） |
| 014 | `014_create_client_tables.sql` | 客户相关表 | 无变化 |
| 015 | `015_create_file_extensions.sql` | 文件扩展表 | 无变化 |
| 016 | `016_create_forum_extensions.sql` | 论坛扩展表 | 无变化 |
| 017 | `017_create_system_tables.sql` | 系统表 | 无变化 |
| 999 | `999_complete_schema.sql` | 完整 Schema 说明 | 文档说明文件 |

#### 2. 新的部署脚本

- **`deploy/fresh-install/deploy-v2.sh`** - 全新部署脚本 v2.0
  - 使用新的 SQL 初始化方案
  - 支持在线/半离线/完全离线三种部署模式
  - 自动检测 SQL 文件
  - 优化了数据库初始化流程

### 关键修改说明

#### 1. 供应商付款计划表 (supplier_payment_plans)

**原问题：**
- 017_update_supplier_payment_plans.sql - 添加新字段
- 018_fix_supplier_payment_plans_constraint.sql - 修改约束
- 019_fix_supplier_payment_plans_phase_name.sql - 修改 phase_name 约束
- 020_add_payment_confirmation_fields.sql - 添加确认字段

**解决方案：**
在 `006_create_suppliers_and_risks.sql` 中直接创建包含所有字段的表：

```sql
CREATE TABLE IF NOT EXISTS supplier_payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    project_supplier_id UUID,  -- 外键约束稍后添加（解决循环依赖）
    phase_name TEXT,  -- 改为可空
    planned_amount DECIMAL(15, 2),  -- 改为可空
    -- ... 其他字段
    amount DECIMAL(15, 2),
    percentage DECIMAL(5, 2),
    reason TEXT,
    actual_payment_date DATE,
    voucher_url TEXT,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    -- ...
);
```

#### 2. 论坛帖子表 (forum_posts)

**原问题：**
- 021_fix_forum_posts_category.sql - 修改 category 约束

**解决方案：**
在 `009_create_water_module.sql` 中直接使用新的约束：

```sql
CREATE TABLE IF NOT EXISTS forum_posts (
    -- ...
    category TEXT DEFAULT 'other' CHECK (category IN ('tech', 'experience', 'help', 'chat', 'other')),
    -- ...
);
```

#### 3. 论坛点赞触发器

**原问题：**
- 022_add_forum_likes_triggers.sql - 添加触发器

**解决方案：**
在 `009_create_water_module.sql` 中直接创建触发器：

```sql
CREATE TRIGGER trg_forum_likes_insert
    AFTER INSERT ON forum_likes
    FOR EACH ROW
    WHEN (NEW.target_type = 'post')
    EXECUTE FUNCTION increment_post_like_count();
```

#### 4. 循环依赖处理

**问题：** `supplier_payment_plans` 和 `project_suppliers` 互相引用

**解决方案：**
1. 在 `006_create_suppliers_and_risks.sql` 中创建 `supplier_payment_plans` 表时不添加 `project_supplier_id` 的外键约束
2. 在 `013_create_supplier_extensions.sql` 中创建 `project_suppliers` 表后，再添加外键约束：

```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_supplier_payment_plans_project_supplier_id'
        AND table_name = 'supplier_payment_plans'
    ) THEN
        ALTER TABLE supplier_payment_plans
        ADD CONSTRAINT fk_supplier_payment_plans_project_supplier_id
        FOREIGN KEY (project_supplier_id) REFERENCES project_suppliers(id) ON DELETE CASCADE;
    END IF;
END $$;
```

## 部署脚本优化

### 新脚本特性

1. **SQL 文件检测**
   - 自动检测 `database/init/` 目录下的 SQL 文件
   - 显示 SQL 文件列表供确认

2. **数据库初始化流程**
   - 使用合并后的 SQL 文件直接初始化
   - 无需执行 ALTER 语句
   - 部署速度更快

3. **三种部署模式**
   - 在线部署：服务器可连接 Docker Hub
   - 半离线部署：导出镜像后上传
   - 完全离线部署：生成离线部署包

### 使用方法

```bash
# 全新部署（使用 v2.0 脚本）
./deploy/fresh-install/deploy-v2.sh

# 原有脚本仍然可用（使用旧的 migrations 方式）
./deploy/fresh-install/deploy.sh
```

## 验证清单

- [x] 所有 SQL 文件已合并
- [x] 循环依赖已解决
- [x] 外键约束正确设置
- [x] 索引已创建
- [x] 触发器已创建
- [x] 默认值已设置
- [x] 注释已添加
- [x] 部署脚本已测试

## 注意事项

1. **新旧脚本共存**：原有 `deploy.sh` 仍然可用，适用于需要逐步执行 migrations 的场景
2. **生产环境**：建议使用 v2.0 脚本进行全新部署，速度更快
3. **数据迁移**：如果是现有环境升级，请继续使用原有的 migrations 方式

## 后续建议

1. 定期清理旧的 migrations 文件（当确认所有环境都已升级后）
2. 保持 `database/init/` 目录的更新，确保新功能及时合并
3. 考虑使用数据库版本控制工具（如 Flyway、Liquibase）替代手动管理
