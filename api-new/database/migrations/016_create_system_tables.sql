-- 创建 system_configs 表（系统配置）
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(key);
CREATE INDEX IF NOT EXISTS idx_system_configs_is_public ON system_configs(is_public);

-- 创建更新时间戳触发器
CREATE TRIGGER update_system_configs_updated_at
    BEFORE UPDATE ON system_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入默认系统配置
INSERT INTO system_configs (key, value, description, is_public) VALUES
    ('site_name', 'PMSY 项目管理系统', '站点名称', true),
    ('site_logo', '/logo.png', '站点Logo', true),
    ('max_file_size', '52428800', '最大文件大小（字节）', false),
    ('default_storage_quota', '10737418240', '默认存储配额（字节）', false)
ON CONFLICT (key) DO NOTHING;

-- 创建 operation_logs 表（操作日志）
CREATE TABLE IF NOT EXISTS operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);
CREATE INDEX IF NOT EXISTS idx_operation_logs_resource ON operation_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);

-- 创建 news_comments 表（新闻评论）
CREATE TABLE IF NOT EXISTS news_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID REFERENCES hot_news(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES news_comments(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_news_comments_news_id ON news_comments(news_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_parent_id ON news_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_author_id ON news_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_status ON news_comments(status);
CREATE INDEX IF NOT EXISTS idx_news_comments_created_at ON news_comments(created_at);

-- 创建更新时间戳触发器
CREATE TRIGGER update_news_comments_updated_at
    BEFORE UPDATE ON news_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 stakeholders 表（项目干系人）
CREATE TABLE IF NOT EXISTS stakeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    organization TEXT,
    phone TEXT,
    email TEXT,
    influence TEXT CHECK (influence IN ('high', 'medium', 'low')),
    interest TEXT CHECK (interest IN ('high', 'medium', 'low')),
    strategy TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_influence ON stakeholders(influence);
CREATE INDEX IF NOT EXISTS idx_stakeholders_interest ON stakeholders(interest);

-- 创建更新时间戳触发器
CREATE TRIGGER update_stakeholders_updated_at
    BEFORE UPDATE ON stakeholders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
