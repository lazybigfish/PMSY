-- 修复点赞数更新问题 - 使用触发器自动维护 like_count
-- 这样就不需要在应用层更新 like_count，避免 RLS 限制

-- 创建触发器函数：当点赞表发生变化时自动更新 like_count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 新增点赞时，like_count + 1
        UPDATE forum_posts
        SET like_count = like_count + 1
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- 取消点赞时，like_count - 1（但不小于 0）
        UPDATE forum_posts
        SET like_count = GREATEST(0, like_count - 1)
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 删除已存在的触发器（如果有）
DROP TRIGGER IF EXISTS trigger_update_like_count ON forum_post_likes;

-- 创建触发器
CREATE TRIGGER trigger_update_like_count
    AFTER INSERT OR DELETE ON forum_post_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_like_count();

-- 恢复原始的 RLS 策略（只允许作者和管理员更新帖子）
DROP POLICY IF EXISTS "Users can update posts" ON forum_posts;

CREATE POLICY "Users can update posts"
ON forum_posts FOR UPDATE USING (
    author_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);
