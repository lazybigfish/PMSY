-- 水漫金山模块数据库迁移
-- 创建论坛帖子表和论坛回复表

-- 论坛帖子表
CREATE TABLE IF NOT EXISTS forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'other',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_essence BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    last_reply_at TIMESTAMPTZ,
    last_reply_by UUID REFERENCES profiles(id),
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 论坛回复表
CREATE TABLE IF NOT EXISTS forum_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content JSONB NOT NULL DEFAULT '{}',
    parent_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
    quoted_reply_id UUID REFERENCES forum_replies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category);
CREATE INDEX IF NOT EXISTS idx_forum_posts_pinned ON forum_posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_last_reply ON forum_posts(last_reply_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author ON forum_replies(author_id);

-- 启用RLS
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

-- 创建策略
DROP POLICY IF EXISTS "Forum posts are viewable by everyone" ON forum_posts;
CREATE POLICY "Forum posts are viewable by everyone" 
ON forum_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own posts" ON forum_posts;
CREATE POLICY "Users can insert their own posts" 
ON forum_posts FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own posts" ON forum_posts;
CREATE POLICY "Users can update their own posts" 
ON forum_posts FOR UPDATE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own posts" ON forum_posts;
CREATE POLICY "Users can delete their own posts" 
ON forum_posts FOR DELETE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Forum replies are viewable by everyone" ON forum_replies;
CREATE POLICY "Forum replies are viewable by everyone" 
ON forum_replies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own replies" ON forum_replies;
CREATE POLICY "Users can insert their own replies" 
ON forum_replies FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own replies" ON forum_replies;
CREATE POLICY "Users can update their own replies" 
ON forum_replies FOR UPDATE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own replies" ON forum_replies;
CREATE POLICY "Users can delete their own replies" 
ON forum_replies FOR DELETE USING (author_id = auth.uid());

-- 添加评论数到hot_news表的触发器函数
CREATE OR REPLACE FUNCTION update_news_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_forum_posts_updated_at ON forum_posts;
CREATE TRIGGER update_forum_posts_updated_at
    BEFORE UPDATE ON forum_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_forum_replies_updated_at ON forum_replies;
CREATE TRIGGER update_forum_replies_updated_at
    BEFORE UPDATE ON forum_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 添加水漫金山模块权限配置
-- 为 admin 角色添加 water 模块权限
INSERT INTO role_permissions (role_key, module_key)
SELECT 'admin', 'water'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions WHERE role_key = 'admin' AND module_key = 'water'
);

-- 为 user 角色添加 water 模块权限
INSERT INTO role_permissions (role_key, module_key)
SELECT 'user', 'water'
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions WHERE role_key = 'user' AND module_key = 'water'
);
