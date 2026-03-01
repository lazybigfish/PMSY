-- 为 milestone_tasks 表添加 is_custom 字段
-- 用于标识任务是否为自定义添加的（非模板任务）

ALTER TABLE milestone_tasks
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;

-- 为现有数据设置默认值：没有 template_id 的任务视为自定义任务
UPDATE milestone_tasks
SET is_custom = true
WHERE template_id IS NULL;

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_is_custom ON milestone_tasks(is_custom);
