-- 任务进度更新功能增强
-- 1. 扩展现有 task_progress_logs 表，添加附件支持
-- 2. 创建进度更新附件表

-- 1. 确保 task_progress_logs 表有正确的字段
-- 检查并添加 progress 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'task_progress_logs' AND column_name = 'progress') THEN
    ALTER TABLE public.task_progress_logs ADD COLUMN progress integer DEFAULT 0 CHECK (progress >= 0 and progress <= 100);
  END IF;
END $$;

-- 2. 创建进度更新附件表
CREATE TABLE IF NOT EXISTS public.task_progress_attachments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  progress_log_id uuid REFERENCES public.task_progress_logs(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 启用 RLS
ALTER TABLE public.task_progress_attachments ENABLE ROW LEVEL SECURITY;

-- 4. 授予权限
GRANT ALL PRIVILEGES ON public.task_progress_attachments TO authenticated;

-- 5. 创建 RLS 策略
CREATE POLICY "Enable all for authenticated users" ON public.task_progress_attachments 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_task_progress_attachments_log_id ON public.task_progress_attachments(progress_log_id);

-- 7. 更新现有 task_progress_logs 表的 progress 字段（如果没有的话）
UPDATE public.task_progress_logs 
SET progress = CASE 
  WHEN description LIKE '%100%' THEN 100
  WHEN description LIKE '%75%' THEN 75
  WHEN description LIKE '%50%' THEN 50
  WHEN description LIKE '%25%' THEN 25
  ELSE 0
END
WHERE progress IS NULL OR progress = 0;
