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
-- 合并了 017-020 的修改：添加 project_supplier_id, amount, percentage, reason, created_by, actual_payment_date, voucher_url, updated_by
-- 注意：project_supplier_id 外键在 013_create_supplier_extensions.sql 中创建 project_suppliers 后再添加
CREATE TABLE IF NOT EXISTS supplier_payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    project_supplier_id UUID,  -- 外键约束稍后添加
    phase_name TEXT,
    planned_amount DECIMAL(15, 2),
    planned_date DATE,
    actual_amount DECIMAL(15, 2),
    actual_date DATE,
    amount DECIMAL(15, 2),
    percentage DECIMAL(5, 2),
    reason TEXT,
    actual_payment_date DATE,
    voucher_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_supplier_id ON supplier_payment_plans(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_project_id ON supplier_payment_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_project_supplier_id ON supplier_payment_plans(project_supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_status ON supplier_payment_plans(status);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_created_by ON supplier_payment_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_updated_by ON supplier_payment_plans(updated_by);

-- 添加注释
COMMENT ON COLUMN supplier_payment_plans.project_supplier_id IS '项目供应商关联ID';
COMMENT ON COLUMN supplier_payment_plans.amount IS '付款金额';
COMMENT ON COLUMN supplier_payment_plans.percentage IS '付款比例（百分比）';
COMMENT ON COLUMN supplier_payment_plans.reason IS '付款原因/阶段说明';
COMMENT ON COLUMN supplier_payment_plans.created_by IS '创建人ID';
COMMENT ON COLUMN supplier_payment_plans.actual_payment_date IS '实际付款日期';
COMMENT ON COLUMN supplier_payment_plans.voucher_url IS '付款凭证URL';
COMMENT ON COLUMN supplier_payment_plans.updated_by IS '更新人ID';

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

-- 创建 supplier_contacts 表（供应商联系人表）
-- 用于存储供应商的多个联系人信息
CREATE TABLE IF NOT EXISTS supplier_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    position TEXT,
    phone TEXT,
    email TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier_id ON supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_is_primary ON supplier_contacts(is_primary);

-- 添加注释
COMMENT ON TABLE supplier_contacts IS '供应商联系人表';
COMMENT ON COLUMN supplier_contacts.supplier_id IS '关联的供应商ID';
COMMENT ON COLUMN supplier_contacts.name IS '联系人姓名';
COMMENT ON COLUMN supplier_contacts.position IS '职位';
COMMENT ON COLUMN supplier_contacts.phone IS '联系电话';
COMMENT ON COLUMN supplier_contacts.email IS '电子邮箱';
COMMENT ON COLUMN supplier_contacts.is_primary IS '是否为主要联系人';

-- 创建更新时间戳触发器
CREATE TRIGGER update_supplier_contacts_updated_at
    BEFORE UPDATE ON supplier_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
