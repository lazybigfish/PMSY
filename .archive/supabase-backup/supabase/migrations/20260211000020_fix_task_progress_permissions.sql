-- 修复任务进度更新功能的权限问题

-- 1. 确保 task_progress_logs 表有正确的 RLS 策略
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.task_progress_logs;
CREATE POLICY "Enable all for authenticated users" 
ON public.task_progress_logs 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- 2. 确保 task_progress_attachments 表有正确的 RLS 策略
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.task_progress_attachments;
CREATE POLICY "Enable all for authenticated users" 
ON public.task_progress_attachments 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. 确保 task_assignees 表有正确的 RLS 策略
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.task_assignees;
CREATE POLICY "Enable all for authenticated users" 
ON public.task_assignees 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. 确保 task_modules 表有正确的 RLS 策略
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.task_modules;
CREATE POLICY "Enable all for authenticated users" 
ON public.task_modules 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- 5. 确保 task_comments 表有正确的 RLS 策略
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.task_comments;
CREATE POLICY "Enable all for authenticated users" 
ON public.task_comments 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- 6. 确保 notifications 表有正确的 RLS 策略
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.notifications;
CREATE POLICY "Enable all for authenticated users" 
ON public.notifications 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- 7. 重新授予权限
GRANT ALL PRIVILEGES ON public.task_progress_logs TO authenticated;
GRANT ALL PRIVILEGES ON public.task_progress_attachments TO authenticated;
GRANT ALL PRIVILEGES ON public.task_assignees TO authenticated;
GRANT ALL PRIVILEGES ON public.task_modules TO authenticated;
GRANT ALL PRIVILEGES ON public.task_comments TO authenticated;
GRANT ALL PRIVILEGES ON public.notifications TO authenticated;

-- 8. 确保序列权限（如果有）
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
