-- 创建系统设置表
-- 用于存储系统级配置，如主题设置、登录页配置等

-- 确保 update_updated_at_column 函数存在（用于触发器）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- 创建更新时间戳触发器
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入默认主题配置
INSERT INTO system_settings (key, value, description)
VALUES (
    'theme_config',
    '{
        "theme": "v1",
        "loginBackground": {
            "type": "gradient",
            "value": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        },
        "loginLogo": {
            "type": "text",
            "value": "PMSY"
        },
        "loginTitle": "项目管理系统",
        "loginSubtitle": "Project Management System"
    }'::jsonb,
    '系统主题配置，包括主题版本、登录页样式等'
)
ON CONFLICT (key) DO NOTHING;

-- 插入默认登录页配置
INSERT INTO system_settings (key, value, description)
VALUES (
    'login_page_config',
    '{
        "showLogo": true,
        "showTitle": true,
        "showSubtitle": true,
        "showVersion": true,
        "version": "v2.0.0"
    }'::jsonb,
    '登录页面显示配置'
)
ON CONFLICT (key) DO NOTHING;
