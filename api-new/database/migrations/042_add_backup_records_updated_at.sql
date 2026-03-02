-- 为 backup_records 表添加 updated_at 字段
-- 修复创建备份时出现的 500 错误

-- 确保 update_updated_at_column 函数存在
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 添加 updated_at 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'backup_records' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE backup_records ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
        
        -- 创建更新时间戳触发器
        DROP TRIGGER IF EXISTS update_backup_records_updated_at ON backup_records;
        CREATE TRIGGER update_backup_records_updated_at
            BEFORE UPDATE ON backup_records
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE '已添加 updated_at 字段和触发器到 backup_records 表';
    ELSE
        RAISE NOTICE 'updated_at 字段已存在，跳过';
    END IF;
END $$;
