-- 创建 project_suppliers 表（项目供应商关联）
CREATE TABLE IF NOT EXISTS project_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    contract_amount DECIMAL(15, 2),
    contract_date DATE,
    delivery_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(project_id, supplier_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_suppliers_project_id ON project_suppliers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_suppliers_supplier_id ON project_suppliers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_project_suppliers_status ON project_suppliers(status);

-- 创建更新时间戳触发器
CREATE TRIGGER update_project_suppliers_updated_at
    BEFORE UPDATE ON project_suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 supplier_acceptances 表（供应商验收）
CREATE TABLE IF NOT EXISTS supplier_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_supplier_id UUID REFERENCES project_suppliers(id) ON DELETE CASCADE NOT NULL,
    acceptance_type TEXT NOT NULL CHECK (acceptance_type IN ('initial', 'final')),
    acceptance_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed')),
    notes TEXT,
    next_acceptance_date DATE,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_supplier_acceptances_project_supplier_id ON supplier_acceptances(project_supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_acceptances_acceptance_type ON supplier_acceptances(acceptance_type);
CREATE INDEX IF NOT EXISTS idx_supplier_acceptances_status ON supplier_acceptances(status);

-- 创建更新时间戳触发器
CREATE TRIGGER update_supplier_acceptances_updated_at
    BEFORE UPDATE ON supplier_acceptances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 supplier_payments 表（供应商付款记录）
CREATE TABLE IF NOT EXISTS supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_plan_id UUID REFERENCES supplier_payment_plans(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT,
    voucher_no TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_supplier_payments_payment_plan_id ON supplier_payments(payment_plan_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_payment_date ON supplier_payments(payment_date);

-- 创建更新时间戳触发器
CREATE TRIGGER update_supplier_payments_updated_at
    BEFORE UPDATE ON supplier_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 construction_records 表（施工记录）
CREATE TABLE IF NOT EXISTS construction_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_supplier_id UUID REFERENCES project_suppliers(id) ON DELETE CASCADE NOT NULL,
    record_date DATE NOT NULL,
    content TEXT NOT NULL,
    progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    issues TEXT,
    solutions TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_construction_records_project_supplier_id ON construction_records(project_supplier_id);
CREATE INDEX IF NOT EXISTS idx_construction_records_record_date ON construction_records(record_date);

-- 创建更新时间戳触发器
CREATE TRIGGER update_construction_records_updated_at
    BEFORE UPDATE ON construction_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 progress_adjustments 表（进度调整）
CREATE TABLE IF NOT EXISTS progress_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_supplier_id UUID REFERENCES project_suppliers(id) ON DELETE CASCADE NOT NULL,
    original_date DATE NOT NULL,
    adjusted_date DATE NOT NULL,
    reason TEXT NOT NULL,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_progress_adjustments_project_supplier_id ON progress_adjustments(project_supplier_id);
CREATE INDEX IF NOT EXISTS idx_progress_adjustments_status ON progress_adjustments(status);

-- 创建更新时间戳触发器
CREATE TRIGGER update_progress_adjustments_updated_at
    BEFORE UPDATE ON progress_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
