-- 为 notifications 表添加缺失字段
-- link: 通知链接，priority: 通知优先级

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS link TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high'));

-- 添加注释
COMMENT ON COLUMN notifications.link IS '通知链接，点击后跳转的URL';
COMMENT ON COLUMN notifications.priority IS '通知优先级：low-低, normal-普通, high-高';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
