-- 创建反馈状态历史记录表
CREATE TABLE IF NOT EXISTS feedback_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE NOT NULL,
    
    -- 状态变更信息
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    
    -- 备注
    remark TEXT,
    
    -- 操作人信息
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_by_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_feedback_status_history_feedback_id ON feedback_status_history(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status_history_created_at ON feedback_status_history(created_at);
