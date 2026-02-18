-- 为 projects 表添加 created_by 字段
-- 用于记录项目创建者

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 添加注释
COMMENT ON COLUMN projects.created_by IS '项目创建者ID';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
