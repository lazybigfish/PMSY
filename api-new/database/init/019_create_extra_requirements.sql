-- 合同外需求表和支出表
-- 合并自 migrations/025_add_extra_requirements.sql

-- 合同外需求表
CREATE TABLE IF NOT EXISTS extra_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    estimated_cost DECIMAL(15, 2) CHECK (estimated_cost >= 0),
    actual_cost DECIMAL(15, 2) DEFAULT 0 CHECK (actual_cost >= 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    requested_by TEXT,
    request_date DATE,
    approval_date DATE,
    approved_by UUID REFERENCES profiles(id),
    completion_date DATE,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 合同外需求支出表
CREATE TABLE IF NOT EXISTS extra_requirement_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID REFERENCES extra_requirements(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_extra_requirements_project_id ON extra_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_extra_requirements_status ON extra_requirements(status);
CREATE INDEX IF NOT EXISTS idx_extra_req_expenses_requirement_id ON extra_requirement_expenses(requirement_id);
CREATE INDEX IF NOT EXISTS idx_extra_req_expenses_supplier_id ON extra_requirement_expenses(supplier_id);

-- 创建更新时间戳触发器
DROP TRIGGER IF EXISTS update_extra_requirements_updated_at ON extra_requirements;
CREATE TRIGGER update_extra_requirements_updated_at
    BEFORE UPDATE ON extra_requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_extra_req_expenses_updated_at ON extra_requirement_expenses;
CREATE TRIGGER update_extra_req_expenses_updated_at
    BEFORE UPDATE ON extra_requirement_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
