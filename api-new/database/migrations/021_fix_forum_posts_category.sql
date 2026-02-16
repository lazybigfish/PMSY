-- 修复 forum_posts 表的 category 字段约束，使其与前端分类值匹配
-- 前端使用的分类: tech, experience, help, chat, other

-- 删除旧的 check 约束
ALTER TABLE forum_posts DROP CONSTRAINT IF EXISTS forum_posts_category_check;

-- 添加新的 check 约束，匹配前端分类值
ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_category_check 
    CHECK (category IN ('tech', 'experience', 'help', 'chat', 'other'));

-- 更新现有的数据，将旧分类值映射到新分类值
UPDATE forum_posts SET category = 'tech' WHERE category = 'share';
UPDATE forum_posts SET category = 'help' WHERE category = 'question';
UPDATE forum_posts SET category = 'chat' WHERE category = 'discussion';
UPDATE forum_posts SET category = 'other' WHERE category = 'general';

-- 设置默认值为 'other'
ALTER TABLE forum_posts ALTER COLUMN category SET DEFAULT 'other';
