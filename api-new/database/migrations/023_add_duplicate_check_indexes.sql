-- 为查重功能创建索引
-- 创建时间: 2026-02-18

-- 项目名称索引（已存在则跳过）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_projects_name'
    ) THEN
        CREATE INDEX idx_projects_name ON projects(name);
    END IF;
END $$;

-- 供应商名称索引（已存在则跳过）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_suppliers_name'
    ) THEN
        CREATE INDEX idx_suppliers_name ON suppliers(name);
    END IF;
END $$;

-- 客户名称索引（已存在则跳过）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_clients_name'
    ) THEN
        CREATE INDEX idx_clients_name ON clients(name);
    END IF;
END $$;

-- 任务标题+项目ID联合索引（用于任务查重）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_tasks_title_project_id'
    ) THEN
        CREATE INDEX idx_tasks_title_project_id ON tasks(title, project_id);
    END IF;
END $$;
