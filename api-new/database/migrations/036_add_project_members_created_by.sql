-- 为 project_members 表添加 created_by 字段
-- 用于记录项目成员添加者

ALTER TABLE project_members
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 添加注释
COMMENT ON COLUMN project_members.created_by IS '项目成员添加者ID';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_members_created_by ON project_members(created_by);
