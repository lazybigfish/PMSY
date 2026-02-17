-- 创建 reports 表（日报/周报）
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    content JSONB NOT NULL,
    ai_analysis JSONB,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- 创建更新时间戳触发器
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 report_templates 表（报告模板）
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(type);
CREATE INDEX IF NOT EXISTS idx_report_templates_is_active ON report_templates(is_active);

-- 创建更新时间戳触发器
CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 ai_providers 表（AI 提供商配置）
CREATE TABLE IF NOT EXISTS ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    api_endpoint TEXT,
    api_key TEXT,
    model TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_providers_name ON ai_providers(name);
CREATE INDEX IF NOT EXISTS idx_ai_providers_is_active ON ai_providers(is_active);

-- 创建更新时间戳触发器
CREATE TRIGGER update_ai_providers_updated_at
    BEFORE UPDATE ON ai_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 ai_roles 表（AI 角色配置）
CREATE TABLE IF NOT EXISTS ai_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_roles_is_default ON ai_roles(is_default);

-- 创建更新时间戳触发器
CREATE TRIGGER update_ai_roles_updated_at
    BEFORE UPDATE ON ai_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 ai_analysis_results 表（AI 分析结果）
CREATE TABLE IF NOT EXISTS ai_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES ai_providers(id),
    role_id UUID REFERENCES ai_roles(id),
    result TEXT,
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_report_id ON ai_analysis_results(report_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_provider_id ON ai_analysis_results(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_role_id ON ai_analysis_results(role_id);

-- 插入默认 AI 角色
INSERT INTO ai_roles (name, description, system_prompt, is_default) VALUES
    ('Senior Project Manager', 'Experienced project manager focusing on risk and progress analysis.', 'You are a Senior Project Manager. Analyze the provided project data including tasks, risks, and milestones. Provide a professional weekly/daily report summary with sections for Overview, Risks, Completed Work, and Future Plan. Be concise and highlight critical issues.', true)
ON CONFLICT DO NOTHING;
