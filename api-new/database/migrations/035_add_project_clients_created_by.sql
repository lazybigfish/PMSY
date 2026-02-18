-- 为 project_clients 表添加 created_by 字段
-- 用于记录项目-客户关联的创建者

ALTER TABLE project_clients
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 添加注释
COMMENT ON COLUMN project_clients.created_by IS '项目-客户关联创建者ID';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_clients_created_by ON project_clients(created_by);
