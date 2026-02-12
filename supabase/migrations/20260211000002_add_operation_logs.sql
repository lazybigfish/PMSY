-- 添加操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    operator_name TEXT,
    operation_type TEXT NOT NULL, -- 'pin', 'unpin', 'essence', 'unessence', 'delete_post', 'delete_reply'
    target_type TEXT NOT NULL, -- 'post', 'reply'
    target_id UUID NOT NULL,
    target_title TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_operator ON operation_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_target ON operation_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at DESC);

-- 启用RLS
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- 创建策略 - 只有管理员可以查看操作日志
DROP POLICY IF EXISTS "Operation logs viewable by admin" ON operation_logs;
CREATE POLICY "Operation logs viewable by admin" 
ON operation_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Users can insert operation logs" ON operation_logs;
CREATE POLICY "Users can insert operation logs" 
ON operation_logs FOR INSERT WITH CHECK (operator_id = auth.uid());
