-- 创建任务附件存储桶的 RLS 策略
-- 注意：存储桶本身需要通过 Supabase Dashboard 或 CLI 手动创建
-- 
-- 手动创建存储桶步骤：
-- 1. 登录 Supabase Dashboard
-- 2. 进入 Storage 页面
-- 3. 点击 "New bucket"
-- 4. 输入名称：task-attachments
-- 5. 设置为 Public
-- 6. 点击 "Create bucket"
--
-- 或者使用 Supabase CLI：
-- supabase storage create task-attachments --public

-- 创建存储桶的RLS策略

-- 允许所有认证用户查看任务附件
DROP POLICY IF EXISTS "Allow authenticated users to view task attachments" ON storage.objects;
CREATE POLICY "Allow authenticated users to view task attachments"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'task-attachments');

-- 允许所有认证用户上传任务附件
DROP POLICY IF EXISTS "Allow authenticated users to upload task attachments" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload task attachments"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'task-attachments'
    );

-- 允许所有认证用户更新任务附件
DROP POLICY IF EXISTS "Allow authenticated users to update task attachments" ON storage.objects;
CREATE POLICY "Allow authenticated users to update task attachments"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'task-attachments')
    WITH CHECK (bucket_id = 'task-attachments');

-- 允许所有认证用户删除任务附件
DROP POLICY IF EXISTS "Allow authenticated users to delete task attachments" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete task attachments"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'task-attachments');
