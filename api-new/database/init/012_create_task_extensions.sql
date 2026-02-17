-- 创建 task_progress_logs 表（任务进度日志）
CREATE TABLE IF NOT EXISTS task_progress_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id),
    progress INTEGER NOT NULL CHECK (progress >= 0 AND progress <= 100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_progress_logs_task_id ON task_progress_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_logs_user_id ON task_progress_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_logs_created_at ON task_progress_logs(created_at);

-- 创建 task_attachments 表（任务附件）
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON task_attachments(uploaded_by);

-- 创建 task_modules 表（任务模块关联）
CREATE TABLE IF NOT EXISTS task_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    module_id UUID REFERENCES project_modules(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(task_id, module_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_modules_task_id ON task_modules(task_id);
CREATE INDEX IF NOT EXISTS idx_task_modules_module_id ON task_modules(module_id);

-- 创建 task_progress_attachments 表（任务进度附件）
CREATE TABLE IF NOT EXISTS task_progress_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    progress_log_id UUID REFERENCES task_progress_logs(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_progress_attachments_progress_log_id ON task_progress_attachments(progress_log_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_attachments_uploaded_by ON task_progress_attachments(uploaded_by);
