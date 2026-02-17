-- 创建 storage_configs 表（存储配置）
CREATE TABLE IF NOT EXISTS storage_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT DEFAULT 'minio' CHECK (provider IN ('minio', 's3', 'oss')),
    endpoint TEXT,
    bucket TEXT,
    access_key TEXT,
    secret_key TEXT,
    region TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_storage_configs_is_default ON storage_configs(is_default);
CREATE INDEX IF NOT EXISTS idx_storage_configs_is_active ON storage_configs(is_active);

-- 创建更新时间戳触发器
CREATE TRIGGER update_storage_configs_updated_at
    BEFORE UPDATE ON storage_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入默认存储配置
INSERT INTO storage_configs (provider, bucket, is_default, is_active)
VALUES ('minio', 'files', true, true)
ON CONFLICT DO NOTHING;

-- 创建 file_shares 表（文件分享）
CREATE TABLE IF NOT EXISTS file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
    share_token TEXT UNIQUE NOT NULL,
    password TEXT,
    expire_at TIMESTAMPTZ,
    download_limit INTEGER,
    download_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares(file_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_share_token ON file_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_file_shares_expire_at ON file_shares(expire_at);

-- 创建更新时间戳触发器
CREATE TRIGGER update_file_shares_updated_at
    BEFORE UPDATE ON file_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
