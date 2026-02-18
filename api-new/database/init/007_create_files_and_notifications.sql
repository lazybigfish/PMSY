-- 创建 folders 表（文件夹）
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_folders_project_id ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(path);

-- 创建更新时间戳触发器
CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 files 表（文件）
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    original_name TEXT,
    mime_type TEXT,
    size BIGINT,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT DEFAULT 'files',
    url TEXT,
    created_by UUID REFERENCES profiles(id),
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    milestone_id UUID REFERENCES project_milestones(id) ON DELETE SET NULL,
    module_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_created_by ON files(created_by);
CREATE INDEX IF NOT EXISTS idx_files_task_id ON files(task_id);
CREATE INDEX IF NOT EXISTS idx_files_milestone_id ON files(milestone_id);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);
CREATE INDEX IF NOT EXISTS idx_files_module_type ON files(module_type);

-- 创建更新时间戳触发器
CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 file_operation_logs 表（文件操作日志）
CREATE TABLE IF NOT EXISTS file_operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    operation TEXT NOT NULL CHECK (operation IN ('create', 'read', 'update', 'delete', 'download')),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_file_operation_logs_file_id ON file_operation_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_operation_logs_user_id ON file_operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_operation_logs_operation ON file_operation_logs(operation);
CREATE INDEX IF NOT EXISTS idx_file_operation_logs_created_at ON file_operation_logs(created_at);

-- 创建 notifications 表（通知）
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('task', 'project', 'system', 'mention')),
    title TEXT NOT NULL,
    content TEXT,
    link TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- 添加注释
COMMENT ON COLUMN notifications.link IS '通知链接，点击后跳转的URL';
COMMENT ON COLUMN notifications.priority IS '通知优先级：low-低, normal-普通, high-高';

-- 创建 storage_quotas 表（存储配额）
CREATE TABLE IF NOT EXISTS storage_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    total_quota BIGINT DEFAULT 10737418240, -- 10GB in bytes
    used_quota BIGINT DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(project_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_storage_quotas_project_id ON storage_quotas(project_id);

-- 创建更新时间戳触发器
CREATE TRIGGER update_storage_quotas_updated_at
    BEFORE UPDATE ON storage_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
