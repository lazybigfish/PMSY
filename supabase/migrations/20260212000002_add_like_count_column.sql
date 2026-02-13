-- 添加 like_count 列到 forum_posts 表
-- 修复点赞数显示异常问题

-- 创建 forum_post_likes 表（如果不存在）
CREATE TABLE IF NOT EXISTS forum_post_likes (
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_forum_post_likes_post ON forum_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_likes_user ON forum_post_likes(user_id);

-- 启用 RLS
ALTER TABLE forum_post_likes ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
DROP POLICY IF EXISTS "Forum post likes are viewable by everyone" ON forum_post_likes;
CREATE POLICY "Forum post likes are viewable by everyone"
ON forum_post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own likes" ON forum_post_likes;
CREATE POLICY "Users can insert their own likes"
ON forum_post_likes FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own likes" ON forum_post_likes;
CREATE POLICY "Users can delete their own likes"
ON forum_post_likes FOR DELETE USING (user_id = auth.uid());

-- 检查并添加 like_count 列
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'forum_posts' 
        AND column_name = 'like_count'
    ) THEN
        ALTER TABLE forum_posts ADD COLUMN like_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added like_count column to forum_posts';
    ELSE
        RAISE NOTICE 'like_count column already exists in forum_posts';
    END IF;
END $$;

-- 检查并添加 reply_count 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'forum_posts' 
        AND column_name = 'reply_count'
    ) THEN
        ALTER TABLE forum_posts ADD COLUMN reply_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added reply_count column to forum_posts';
    ELSE
        RAISE NOTICE 'reply_count column already exists in forum_posts';
    END IF;
END $$;

-- 检查并添加 is_essence 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'forum_posts' 
        AND column_name = 'is_essence'
    ) THEN
        ALTER TABLE forum_posts ADD COLUMN is_essence BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_essence column to forum_posts';
    ELSE
        RAISE NOTICE 'is_essence column already exists in forum_posts';
    END IF;
END $$;

-- 检查并添加 last_reply_at 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'forum_posts' 
        AND column_name = 'last_reply_at'
    ) THEN
        ALTER TABLE forum_posts ADD COLUMN last_reply_at TIMESTAMPTZ;
        RAISE NOTICE 'Added last_reply_at column to forum_posts';
    ELSE
        RAISE NOTICE 'last_reply_at column already exists in forum_posts';
    END IF;
END $$;

-- 检查并添加 last_reply_by 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'forum_posts' 
        AND column_name = 'last_reply_by'
    ) THEN
        ALTER TABLE forum_posts ADD COLUMN last_reply_by UUID REFERENCES profiles(id);
        RAISE NOTICE 'Added last_reply_by column to forum_posts';
    ELSE
        RAISE NOTICE 'last_reply_by column already exists in forum_posts';
    END IF;
END $$;

-- 检查并添加 attachments 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'forum_posts' 
        AND column_name = 'attachments'
    ) THEN
        ALTER TABLE forum_posts ADD COLUMN attachments JSONB DEFAULT '[]';
        RAISE NOTICE 'Added attachments column to forum_posts';
    ELSE
        RAISE NOTICE 'attachments column already exists in forum_posts';
    END IF;
END $$;

-- 更新现有数据，将 content 列从 text 改为 JSONB（如果需要）
-- 注意：这可能会丢失数据，请谨慎执行
-- ALTER TABLE forum_posts ALTER COLUMN content TYPE JSONB USING content::JSONB;
