-- 文件系统数据库表结构

-- 文件存储配置表
CREATE TABLE IF NOT EXISTS storage_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('local', 'aliyun_oss', 'tencent_cos', 'aws_s3', 'minio')),
    is_default BOOLEAN DEFAULT FALSE,
    config JSONB NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文件元数据表
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size BIGINT NOT NULL,
    extension TEXT,
    storage_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    storage_config_id UUID REFERENCES storage_configs(id),
    url TEXT,
    thumbnail_url TEXT,
    
    -- 文件分类
    category TEXT DEFAULT 'other' CHECK (category IN ('document', 'image', 'video', 'audio', 'archive', 'other')),
    tags TEXT[] DEFAULT '{}',
    
    -- 上传信息
    uploader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    uploader_name TEXT,
    
    -- 版本管理
    version INTEGER DEFAULT 1,
    parent_id UUID REFERENCES files(id) ON DELETE CASCADE,
    is_latest BOOLEAN DEFAULT TRUE,
    
    -- 访问统计
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    
    -- 安全相关
    checksum TEXT,
    is_scanned BOOLEAN DEFAULT FALSE,
    scan_result TEXT,
    
    -- 状态
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'archived')),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES profiles(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文件夹表
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    is_shared BOOLEAN DEFAULT FALSE,
    share_config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文件操作日志表
CREATE TABLE IF NOT EXISTS file_operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_type TEXT NOT NULL CHECK (operation_type IN ('upload', 'download', 'view', 'rename', 'move', 'copy', 'delete', 'restore', 'share')),
    file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    file_name TEXT,
    operator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    operator_name TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文件分享表
CREATE TABLE IF NOT EXISTS file_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    share_type TEXT DEFAULT 'link' CHECK (share_type IN ('link', 'password', 'email')),
    password TEXT,
    expire_at TIMESTAMPTZ,
    max_downloads INTEGER,
    download_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 存储配额表
CREATE TABLE IF NOT EXISTS storage_quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    total_quota BIGINT DEFAULT 10737418240, -- 默认10GB
    used_quota BIGINT DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_files_uploader ON files(uploader_id);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_parent ON files(parent_id);
CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at DESC);
-- 文件名搜索索引（使用简单配置）
CREATE INDEX IF NOT EXISTS idx_files_name ON files USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_owner ON folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_file_operation_logs_file ON file_operation_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_operation_logs_operator ON file_operation_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_file_operation_logs_created ON file_operation_logs(created_at DESC);

-- 启用RLS
ALTER TABLE storage_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_quotas ENABLE ROW LEVEL SECURITY;

-- 存储配置策略 - 仅管理员可管理
DROP POLICY IF EXISTS "Storage configs viewable by all" ON storage_configs;
CREATE POLICY "Storage configs viewable by all" 
ON storage_configs FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Storage configs manageable by admin" ON storage_configs;
CREATE POLICY "Storage configs manageable by admin" 
ON storage_configs FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 文件策略
DROP POLICY IF EXISTS "Files viewable by owner or shared" ON files;
CREATE POLICY "Files viewable by owner or shared" 
ON files FOR SELECT USING (
    status = 'active' AND (
        uploader_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    )
);

DROP POLICY IF EXISTS "Files insertable by authenticated" ON files;
CREATE POLICY "Files insertable by authenticated" 
ON files FOR INSERT WITH CHECK (uploader_id = auth.uid());

DROP POLICY IF EXISTS "Files updatable by owner or admin" ON files;
CREATE POLICY "Files updatable by owner or admin" 
ON files FOR UPDATE USING (
    uploader_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Files deletable by owner or admin" ON files;
CREATE POLICY "Files deletable by owner or admin" 
ON files FOR DELETE USING (
    uploader_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 文件夹策略
DROP POLICY IF EXISTS "Folders viewable by owner" ON folders;
CREATE POLICY "Folders viewable by owner" 
ON folders FOR SELECT USING (
    owner_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Folders manageable by owner" ON folders;
CREATE POLICY "Folders manageable by owner" 
ON folders FOR ALL USING (
    owner_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 操作日志策略 - 仅管理员可查看
DROP POLICY IF EXISTS "File operation logs viewable by admin" ON file_operation_logs;
CREATE POLICY "File operation logs viewable by admin" 
ON file_operation_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

DROP POLICY IF EXISTS "File operation logs insertable by authenticated" ON file_operation_logs;
CREATE POLICY "File operation logs insertable by authenticated" 
ON file_operation_logs FOR INSERT WITH CHECK (operator_id = auth.uid());

-- 分享策略
DROP POLICY IF EXISTS "File shares manageable by owner" ON file_shares;
CREATE POLICY "File shares manageable by owner" 
ON file_shares FOR ALL USING (
    created_by = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 配额策略
DROP POLICY IF EXISTS "Storage quotas viewable by owner or admin" ON storage_quotas;
CREATE POLICY "Storage quotas viewable by owner or admin" 
ON storage_quotas FOR SELECT USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS update_storage_configs_updated_at ON storage_configs;
CREATE TRIGGER update_storage_configs_updated_at
    BEFORE UPDATE ON storage_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_storage_quotas_updated_at ON storage_quotas;
CREATE TRIGGER update_storage_quotas_updated_at
    BEFORE UPDATE ON storage_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入默认本地存储配置
INSERT INTO storage_configs (name, type, is_default, config)
SELECT '本地存储', 'local', true, '{"basePath": "uploads", "maxFileSize": 10737418240}'
WHERE NOT EXISTS (
    SELECT 1 FROM storage_configs WHERE is_default = true
);

-- 为所有现有用户创建存储配额
INSERT INTO storage_quotas (user_id, total_quota, used_quota, file_count)
SELECT id, 10737418240, 0, 0
FROM profiles
WHERE NOT EXISTS (
    SELECT 1 FROM storage_quotas WHERE storage_quotas.user_id = profiles.id
);
