# 初始化 SQL 更新记录

## 更新内容

将本次供应商相关修复合并到初始化 SQL 文件中，避免后续部署到服务器再次出现相同问题。

## 修改的文件

### 1. 更新初始化 SQL

**文件**: `api-new/database/migrations/012_create_supplier_extensions.sql`

**修改内容**:
在 `project_suppliers` 表中添加两个新字段：
- `module_ids JSONB DEFAULT '[]'::jsonb` - 供应商负责的模块ID列表
- `contract_file_url TEXT` - 供应商合同文件URL

**修改后表结构**:
```sql
CREATE TABLE IF NOT EXISTS project_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    contract_amount DECIMAL(15, 2),
    contract_date DATE,
    delivery_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated')),
    notes TEXT,
    module_ids JSONB DEFAULT '[]'::jsonb,        -- 新增
    contract_file_url TEXT,                      -- 新增
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(project_id, supplier_id)
);

-- 添加注释
COMMENT ON COLUMN project_suppliers.module_ids IS '供应商负责的模块ID列表';
COMMENT ON COLUMN project_suppliers.contract_file_url IS '供应商合同文件URL';
```

### 2. 删除已合并的修复 SQL 文件

以下文件已合并到初始化 SQL 中，现已删除：

- ~~`api-new/database/migrations/021_add_project_supplier_module_ids.sql`~~
- ~~`api-new/database/migrations/022_add_project_supplier_contract_file.sql`~~

## 更新原因

这些字段是供应商功能必需的：
1. `module_ids` - 用于存储供应商负责的功能模块ID列表
2. `contract_file_url` - 用于存储供应商合同文件的URL

之前这些字段通过单独的迁移文件添加，现在合并到初始化 SQL 中，确保新部署的环境自动包含这些字段。

## 更新时间

2026-02-16
