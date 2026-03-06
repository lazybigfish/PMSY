-- 为 project_milestones 表添加 init_source 字段
-- 用于记录里程碑初始化来源（custom: 自定义, template: 模板）

ALTER TABLE project_milestones
ADD COLUMN IF NOT EXISTS init_source TEXT DEFAULT 'custom' CHECK (init_source IN ('custom', 'template'));

-- 添加注释
COMMENT ON COLUMN project_milestones.init_source IS '里程碑初始化来源: custom-自定义, template-模板';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_milestones_init_source ON project_milestones(init_source);
