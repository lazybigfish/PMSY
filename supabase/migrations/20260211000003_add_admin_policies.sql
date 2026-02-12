-- 添加管理员权限验证策略
-- 只有管理员可以置顶、加精、删除任意帖子

-- 删除旧策略
DROP POLICY IF EXISTS "Users can update their own posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON forum_posts;

-- 创建新的更新策略 - 允许用户更新自己的帖子，管理员可以更新所有帖子
CREATE POLICY "Users can update posts" 
ON forum_posts FOR UPDATE USING (
    author_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 创建新的删除策略 - 允许用户删除自己的帖子，管理员可以删除所有帖子
CREATE POLICY "Users can delete posts" 
ON forum_posts FOR DELETE USING (
    author_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 回复表的权限策略
DROP POLICY IF EXISTS "Users can update their own replies" ON forum_replies;
DROP POLICY IF EXISTS "Users can delete their own replies" ON forum_replies;

-- 创建新的更新策略 - 允许用户更新自己的回复，管理员可以更新所有回复
CREATE POLICY "Users can update replies" 
ON forum_replies FOR UPDATE USING (
    author_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 创建新的删除策略 - 允许用户删除自己的回复，管理员可以删除所有回复
CREATE POLICY "Users can delete replies" 
ON forum_replies FOR DELETE USING (
    author_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 创建函数检查用户是否为管理员
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = user_id 
        AND profiles.role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
