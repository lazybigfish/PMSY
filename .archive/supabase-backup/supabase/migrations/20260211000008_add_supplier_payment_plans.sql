-- 供应商付款计划表
-- 用于管理供应商的付款计划和付款记录

-- 创建付款计划表
CREATE TABLE IF NOT EXISTS supplier_payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_supplier_id UUID NOT NULL REFERENCES project_suppliers(id) ON DELETE CASCADE,
    planned_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    actual_payment_date DATE,
    voucher_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_project_supplier_id 
    ON supplier_payment_plans(project_supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_status 
    ON supplier_payment_plans(status);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_planned_date 
    ON supplier_payment_plans(planned_date);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_supplier_payment_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_supplier_payment_plans_updated_at 
    ON supplier_payment_plans;

CREATE TRIGGER trigger_update_supplier_payment_plans_updated_at
    BEFORE UPDATE ON supplier_payment_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_supplier_payment_plans_updated_at();

-- 启用RLS
ALTER TABLE supplier_payment_plans ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 所有认证用户都可以查看付款计划
DROP POLICY IF EXISTS "Allow authenticated users to view payment plans" ON supplier_payment_plans;
CREATE POLICY "Allow authenticated users to view payment plans"
    ON supplier_payment_plans
    FOR SELECT
    TO authenticated
    USING (true);

-- 所有认证用户都可以创建付款计划
DROP POLICY IF EXISTS "Allow authenticated users to create payment plans" ON supplier_payment_plans;
CREATE POLICY "Allow authenticated users to create payment plans"
    ON supplier_payment_plans
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 所有认证用户都可以更新付款计划
DROP POLICY IF EXISTS "Allow authenticated users to update payment plans" ON supplier_payment_plans;
CREATE POLICY "Allow authenticated users to update payment plans"
    ON supplier_payment_plans
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 所有认证用户都可以删除付款计划
DROP POLICY IF EXISTS "Allow authenticated users to delete payment plans" ON supplier_payment_plans;
CREATE POLICY "Allow authenticated users to delete payment plans"
    ON supplier_payment_plans
    FOR DELETE
    TO authenticated
    USING (true);

-- 添加表注释
COMMENT ON TABLE supplier_payment_plans IS '供应商付款计划表，用于管理供应商的付款计划和付款记录';
COMMENT ON COLUMN supplier_payment_plans.project_supplier_id IS '关联的项目供应商ID';
COMMENT ON COLUMN supplier_payment_plans.planned_date IS '计划付款日期';
COMMENT ON COLUMN supplier_payment_plans.amount IS '付款金额';
COMMENT ON COLUMN supplier_payment_plans.percentage IS '付款比例(%)';
COMMENT ON COLUMN supplier_payment_plans.reason IS '付款事由';
COMMENT ON COLUMN supplier_payment_plans.status IS '付款状态：pending-待付款, paid-已付款';
COMMENT ON COLUMN supplier_payment_plans.actual_payment_date IS '实际付款日期';
COMMENT ON COLUMN supplier_payment_plans.voucher_url IS '付款凭证URL';
