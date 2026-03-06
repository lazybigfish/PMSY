-- 为 project_milestones 表添加 is_custom 字段
-- 用于标记是否为用户自定义的里程碑阶段

ALTER TABLE project_milestones
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;

-- 添加注释
COMMENT ON COLUMN project_milestones.is_custom IS '是否为用户自定义的里程碑阶段';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_milestones_is_custom ON project_milestones(is_custom);
