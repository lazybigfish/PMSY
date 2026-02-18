-- 创建 suppliers 表
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    category TEXT,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_suppliers_project_id ON suppliers(project_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- 创建更新时间戳触发器
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 supplier_payment_plans 表（供应商付款计划）
CREATE TABLE IF NOT EXISTS supplier_payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    phase_name TEXT NOT NULL,
    planned_amount DECIMAL(15, 2) NOT NULL,
    planned_date DATE,
    actual_amount DECIMAL(15, 2),
    actual_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_supplier_id ON supplier_payment_plans(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_project_id ON supplier_payment_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_status ON supplier_payment_plans(status);

-- 创建更新时间戳触发器
CREATE TRIGGER update_supplier_payment_plans_updated_at
    BEFORE UPDATE ON supplier_payment_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 supplier_acceptance_records 表（供应商验收记录）
CREATE TABLE IF NOT EXISTS supplier_acceptance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    acceptance_type TEXT NOT NULL CHECK (acceptance_type IN ('initial', 'final')),
    acceptance_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed')),
    notes TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_supplier_acceptance_records_supplier_id ON supplier_acceptance_records(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_acceptance_records_project_id ON supplier_acceptance_records(project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_acceptance_records_acceptance_type ON supplier_acceptance_records(acceptance_type);
CREATE INDEX IF NOT EXISTS idx_supplier_acceptance_records_status ON supplier_acceptance_records(status);

-- 创建更新时间戳触发器
CREATE TRIGGER update_supplier_acceptance_records_updated_at
    BEFORE UPDATE ON supplier_acceptance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 risks 表
CREATE TABLE IF NOT EXISTS risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    level TEXT DEFAULT 'medium' CHECK (level IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'handling', 'closed')),
    owner_id UUID REFERENCES profiles(id),
    impact TEXT,
    mitigation_plan TEXT,
    handling_records JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_level ON risks(level);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_owner_id ON risks(owner_id);

-- 创建更新时间戳触发器
CREATE TRIGGER update_risks_updated_at
    BEFORE UPDATE ON risks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
