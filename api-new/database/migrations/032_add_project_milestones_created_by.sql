-- 为 project_milestones 表添加 created_by 字段
-- 用于记录里程碑创建者

ALTER TABLE project_milestones
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 添加注释
COMMENT ON COLUMN project_milestones.created_by IS '里程碑创建者ID';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_milestones_created_by ON project_milestones(created_by);
