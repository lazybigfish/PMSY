-- 修复论坛表 RLS 策略
-- 临时禁用 RLS 以便测试

-- 禁用 forum_posts 表的 RLS
ALTER TABLE forum_posts DISABLE ROW LEVEL SECURITY;

-- 禁用 forum_replies 表的 RLS
ALTER TABLE forum_replies DISABLE ROW LEVEL SECURITY;

-- 如果需要重新启用，请使用以下命令：
-- ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
