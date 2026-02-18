-- 创建 projects 表
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    customer_name TEXT,
    amount DECIMAL(15, 2),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'paused')),
    is_public BOOLEAN DEFAULT false,
    manager_id UUID REFERENCES profiles(id),
    created_by UUID REFERENCES profiles(id),
    current_milestone_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
-- 项目名称索引（用于查重功能）
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- 添加注释
COMMENT ON COLUMN projects.created_by IS '项目创建者ID';

-- 创建更新时间戳触发器
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 project_members 表
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('manager', 'member')),
    created_by UUID REFERENCES profiles(id),
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(project_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_created_by ON project_members(created_by);

-- 添加注释
COMMENT ON COLUMN project_members.created_by IS '项目成员添加者ID';

-- 创建 project_modules 表
CREATE TABLE IF NOT EXISTS project_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES project_modules(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'paused')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    sort_order INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_modules_project_id ON project_modules(project_id);
CREATE INDEX IF NOT EXISTS idx_project_modules_parent_id ON project_modules(parent_id);
CREATE INDEX IF NOT EXISTS idx_project_modules_status ON project_modules(status);

-- 创建更新时间戳触发器
CREATE TRIGGER update_project_modules_updated_at
    BEFORE UPDATE ON project_modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
