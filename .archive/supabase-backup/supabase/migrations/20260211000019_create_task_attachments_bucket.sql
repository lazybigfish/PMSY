-- 创建任务附件存储桶
-- 用于存储任务进度更新的附件文件

-- 创建存储桶（如果使用的是 Supabase Storage 的 SQL 接口）
-- 注意：实际上存储桶通常需要通过 Supabase Dashboard 或 API 创建
-- 这里我们创建相应的表结构来支持文件元数据存储

-- 任务附件元数据表（如果还没有创建）
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 启用 RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- 授予权限
GRANT ALL PRIVILEGES ON public.task_attachments TO authenticated;

-- 创建 RLS 策略
DROP POLICY IF EXISTS "Task attachments viewable by authenticated" ON public.task_attachments;
CREATE POLICY "Task attachments viewable by authenticated" 
ON public.task_attachments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Task attachments insertable by authenticated" ON public.task_attachments;
CREATE POLICY "Task attachments insertable by authenticated" 
ON public.task_attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Task attachments deletable by owner" ON public.task_attachments;
CREATE POLICY "Task attachments deletable by owner" 
ON public.task_attachments FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON public.task_attachments(uploaded_by);

-- 注意：task-attachments storage bucket 需要通过 Supabase Dashboard 创建
-- 1. 登录 Supabase Dashboard
-- 2. 进入 Storage 页面
-- 3. 点击 "New bucket"
-- 4. 输入名称：task-attachments
-- 5. 设置为 Public
-- 6. 创建
