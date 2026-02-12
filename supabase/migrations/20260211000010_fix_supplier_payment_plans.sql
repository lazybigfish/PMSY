-- 修复供应商付款计划表
-- 添加可能缺失的列

-- 添加 amount 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'amount'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN amount DECIMAL(12, 2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 添加 percentage 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'percentage'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN percentage DECIMAL(5, 2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 添加 reason 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'reason'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN reason TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- 添加 status 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'status'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
    END IF;
END $$;

-- 添加 actual_payment_date 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'actual_payment_date'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN actual_payment_date DATE;
    END IF;
END $$;

-- 添加 voucher_url 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'voucher_url'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN voucher_url TEXT;
    END IF;
END $$;

-- 添加 created_at 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 添加 updated_at 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 添加 planned_date 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'planned_date'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN planned_date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- 添加 project_supplier_id 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'project_supplier_id'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN project_supplier_id UUID;
    END IF;
END $$;

-- 确保表存在
CREATE TABLE IF NOT EXISTS supplier_payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_supplier_id UUID REFERENCES project_suppliers(id) ON DELETE CASCADE,
    planned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
    reason TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
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
DROP POLICY IF EXISTS "Allow authenticated users to view payment plans" ON supplier_payment_plans;
CREATE POLICY "Allow authenticated users to view payment plans"
    ON supplier_payment_plans
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to create payment plans" ON supplier_payment_plans;
CREATE POLICY "Allow authenticated users to create payment plans"
    ON supplier_payment_plans
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update payment plans" ON supplier_payment_plans;
CREATE POLICY "Allow authenticated users to update payment plans"
    ON supplier_payment_plans
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete payment plans" ON supplier_payment_plans;
CREATE POLICY "Allow authenticated users to delete payment plans"
    ON supplier_payment_plans
    FOR DELETE
    TO authenticated
    USING (true);
