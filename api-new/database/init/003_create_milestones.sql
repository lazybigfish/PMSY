-- 创建 milestone_templates 表
CREATE TABLE IF NOT EXISTS milestone_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    phase_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_milestone_templates_phase_order ON milestone_templates(phase_order);
CREATE INDEX IF NOT EXISTS idx_milestone_templates_is_active ON milestone_templates(is_active);

-- 创建 project_milestones 表
CREATE TABLE IF NOT EXISTS project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES milestone_templates(id),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    start_date DATE,
    end_date DATE,
    phase_order INTEGER NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones(status);
CREATE INDEX IF NOT EXISTS idx_project_milestones_phase_order ON project_milestones(phase_order);
CREATE INDEX IF NOT EXISTS idx_project_milestones_is_current ON project_milestones(is_current);
CREATE INDEX IF NOT EXISTS idx_project_milestones_created_by ON project_milestones(created_by);

-- 添加注释
COMMENT ON COLUMN project_milestones.created_by IS '里程碑创建者ID';

-- 创建更新时间戳触发器
CREATE TRIGGER update_project_milestones_updated_at
    BEFORE UPDATE ON project_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 milestone_tasks 表
CREATE TABLE IF NOT EXISTS milestone_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID REFERENCES project_milestones(id) ON DELETE CASCADE,
    template_id UUID REFERENCES milestone_task_templates(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES profiles(id),
    output_documents JSONB DEFAULT '[]'::jsonb,
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_milestone_id ON milestone_tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_template_id ON milestone_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_is_completed ON milestone_tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_is_required ON milestone_tasks(is_required);
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_status ON milestone_tasks(status);
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_created_by ON milestone_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_completed_by ON milestone_tasks(completed_by);

-- 创建更新时间戳触发器
CREATE TRIGGER update_milestone_tasks_updated_at
    BEFORE UPDATE ON milestone_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
