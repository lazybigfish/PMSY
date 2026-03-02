-- 备份记录表
-- 用于存储系统数据备份的记录信息

-- 确保 update_updated_at_column 函数存在
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS backup_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,           -- 备份文件相对路径
    file_size BIGINT NOT NULL,         -- 文件大小（字节）
    manifest JSONB NOT NULL,           -- 备份元数据
    status TEXT DEFAULT 'processing' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,                -- 失败时的错误信息
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,  -- 更新时间
    completed_at TIMESTAMPTZ
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_backup_records_status ON backup_records(status);
CREATE INDEX IF NOT EXISTS idx_backup_records_created_by ON backup_records(created_by);
CREATE INDEX IF NOT EXISTS idx_backup_records_created_at ON backup_records(created_at);

-- 创建更新时间戳触发器
DROP TRIGGER IF EXISTS update_backup_records_updated_at ON backup_records;
CREATE TRIGGER update_backup_records_updated_at
    BEFORE UPDATE ON backup_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE backup_records IS '系统数据备份记录表';
COMMENT ON COLUMN backup_records.file_path IS '备份文件相对路径，相对于 backups 目录';
COMMENT ON COLUMN backup_records.manifest IS '备份元数据，包含版本、统计信息、表清单等';
COMMENT ON COLUMN backup_records.status IS '备份状态：pending-等待中, processing-处理中, completed-完成, failed-失败';
