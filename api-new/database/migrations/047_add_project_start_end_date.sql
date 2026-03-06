-- 为 projects 表添加开工日期和结束日期字段
-- 创建时间: 2026-03-04
-- 功能: 支持项目基本信息页面显示和编辑开工日期、结束日期

-- 添加开工日期字段
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS start_date DATE;

-- 添加结束日期字段
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date);
CREATE INDEX IF NOT EXISTS idx_projects_end_date ON projects(end_date);

-- 添加注释说明字段用途
COMMENT ON COLUMN projects.start_date IS '项目开工日期，由项目经理或系统管理员设置';
COMMENT ON COLUMN projects.end_date IS '项目结束日期，由项目经理或系统管理员设置';
