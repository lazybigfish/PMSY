-- 创建触发器函数：当添加点赞时，更新 forum_posts 的 like_count
CREATE OR REPLACE FUNCTION increment_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE forum_posts
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = NEW.target_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器函数：当删除点赞时，更新 forum_posts 的 like_count
CREATE OR REPLACE FUNCTION decrement_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE forum_posts
    SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
    WHERE id = OLD.target_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 删除已存在的触发器（如果存在）
DROP TRIGGER IF EXISTS trg_forum_likes_insert ON forum_likes;
DROP TRIGGER IF EXISTS trg_forum_likes_delete ON forum_likes;

-- 创建触发器：插入点赞记录时增加 like_count
CREATE TRIGGER trg_forum_likes_insert
    AFTER INSERT ON forum_likes
    FOR EACH ROW
    WHEN (NEW.target_type = 'post')
    EXECUTE FUNCTION increment_post_like_count();

-- 创建触发器：删除点赞记录时减少 like_count
CREATE TRIGGER trg_forum_likes_delete
    AFTER DELETE ON forum_likes
    FOR EACH ROW
    WHEN (OLD.target_type = 'post')
    EXECUTE FUNCTION decrement_post_like_count();
