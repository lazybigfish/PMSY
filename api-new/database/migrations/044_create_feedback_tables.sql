-- 创建 feedback 表（优化与反馈）
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'other')),
    images JSONB DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'developing', 'testing', 'ready', 'completed')),

    -- 提交人信息
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_by_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- 处理信息
    handled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    handled_by_name VARCHAR(100),
    handled_at TIMESTAMPTZ,
    handle_result VARCHAR(20) CHECK (handle_result IN ('accepted', 'rejected')),
    handle_remark TEXT,

    -- 开发进度
    dev_status VARCHAR(20) CHECK (dev_status IN ('developing', 'testing', 'ready')),
    dev_status_updated_at TIMESTAMPTZ,
    dev_status_updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_by ON feedback(created_by);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);

-- 创建更新时间戳触发器
CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 feedback_comments 表（反馈评论）
CREATE TABLE IF NOT EXISTS feedback_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,

    -- 评论人信息
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_by_name VARCHAR(100) NOT NULL,
    created_by_avatar VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- 回复功能
    reply_to UUID REFERENCES feedback_comments(id) ON DELETE SET NULL,
    reply_to_name VARCHAR(100),

    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_feedback_comments_feedback_id ON feedback_comments(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_created_at ON feedback_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_reply_to ON feedback_comments(reply_to);

-- 创建更新时间戳触发器
CREATE TRIGGER update_feedback_comments_updated_at
    BEFORE UPDATE ON feedback_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
