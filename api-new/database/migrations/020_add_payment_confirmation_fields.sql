-- 添加确认付款相关的字段到 supplier_payment_plans 表

-- 添加实际付款日期字段
ALTER TABLE supplier_payment_plans 
    ADD COLUMN IF NOT EXISTS actual_payment_date DATE;

-- 添加付款凭证URL字段
ALTER TABLE supplier_payment_plans 
    ADD COLUMN IF NOT EXISTS voucher_url TEXT;

-- 添加更新人字段
ALTER TABLE supplier_payment_plans 
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id);

-- 添加注释
COMMENT ON COLUMN supplier_payment_plans.actual_payment_date IS '实际付款日期';
COMMENT ON COLUMN supplier_payment_plans.voucher_url IS '付款凭证URL';
COMMENT ON COLUMN supplier_payment_plans.updated_by IS '更新人ID';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_updated_by ON supplier_payment_plans(updated_by);
