-- 为 task_comments 表添加 created_by 字段
-- 用于记录评论创建者，与 user_id 保持一致

ALTER TABLE task_comments
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 将现有的 user_id 数据复制到 created_by
UPDATE task_comments SET created_by = user_id WHERE created_by IS NULL;

-- 添加注释
COMMENT ON COLUMN task_comments.created_by IS '评论创建者ID，与 user_id 保持一致';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_comments_created_by ON task_comments(created_by);
