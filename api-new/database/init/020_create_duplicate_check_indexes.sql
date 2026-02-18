-- 为查重功能创建索引
-- 合并自 migrations/023_add_duplicate_check_indexes.sql

-- 项目名称索引
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- 供应商名称索引
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- 客户名称索引
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- 任务标题+项目ID联合索引（用于任务查重）
CREATE INDEX IF NOT EXISTS idx_tasks_title_project_id ON tasks(title, project_id);
