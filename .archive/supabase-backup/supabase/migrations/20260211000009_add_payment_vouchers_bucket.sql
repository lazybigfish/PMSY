-- 创建付款凭证存储桶的 RLS 策略
-- 注意：存储桶本身需要通过 Supabase Dashboard 或 CLI 手动创建
-- 
-- 手动创建存储桶步骤：
-- 1. 登录 Supabase Dashboard
-- 2. 进入 Storage 页面
-- 3. 点击 "New bucket"
-- 4. 输入名称：payment-vouchers
-- 5. 设置为 Public
-- 6. 点击 "Create bucket"
--
-- 或者使用 Supabase CLI：
-- supabase storage create payment-vouchers --public

-- 创建存储桶的RLS策略

-- 允许所有认证用户查看付款凭证
DROP POLICY IF EXISTS "Allow authenticated users to view payment vouchers" ON storage.objects;
CREATE POLICY "Allow authenticated users to view payment vouchers"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'payment-vouchers');

-- 允许所有认证用户上传付款凭证
DROP POLICY IF EXISTS "Allow authenticated users to upload payment vouchers" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload payment vouchers"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'payment-vouchers'
        AND (
            storage.extension(name) IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf')
        )
    );

-- 允许所有认证用户更新付款凭证
DROP POLICY IF EXISTS "Allow authenticated users to update payment vouchers" ON storage.objects;
CREATE POLICY "Allow authenticated users to update payment vouchers"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'payment-vouchers')
    WITH CHECK (bucket_id = 'payment-vouchers');

-- 允许所有认证用户删除付款凭证
DROP POLICY IF EXISTS "Allow authenticated users to delete payment vouchers" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete payment vouchers"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'payment-vouchers');
