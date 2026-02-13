-- 创建 milestone_task_templates 表（里程碑任务模板）
CREATE TABLE IF NOT EXISTS milestone_task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES milestone_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    output_documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_milestone_task_templates_template_id ON milestone_task_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_milestone_task_templates_sort_order ON milestone_task_templates(sort_order);

-- 创建更新时间戳触发器
CREATE TRIGGER update_milestone_task_templates_updated_at
    BEFORE UPDATE ON milestone_task_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 template_versions 表（模板版本）
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES milestone_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(template_id, version_number)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_is_active ON template_versions(is_active);

-- 创建更新时间戳触发器
CREATE TRIGGER update_template_versions_updated_at
    BEFORE UPDATE ON template_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为 milestone_templates 添加 version_id 字段
ALTER TABLE milestone_templates ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES template_versions(id);
