-- 检查和修复 supplier_payment_plans 表
-- 这个脚本会检查表结构并修复任何问题

-- 1. 检查表是否存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'supplier_payment_plans'
    ) THEN
        -- 创建表
        CREATE TABLE supplier_payment_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_supplier_id UUID NOT NULL,
            planned_date DATE NOT NULL,
            amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
            percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
            reason TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            actual_payment_date DATE,
            voucher_url TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created supplier_payment_plans table';
    ELSE
        RAISE NOTICE 'Table supplier_payment_plans already exists';
    END IF;
END $$;

-- 2. 检查并添加外键约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'supplier_payment_plans_project_supplier_id_fkey'
    ) THEN
        ALTER TABLE supplier_payment_plans 
        ADD CONSTRAINT supplier_payment_plans_project_supplier_id_fkey 
        FOREIGN KEY (project_supplier_id) REFERENCES project_suppliers(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint';
    END IF;
END $$;

-- 3. 检查所有必需的列
DO $$
DECLARE
    col_name TEXT;
    col_type TEXT;
BEGIN
    -- 检查 project_supplier_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'project_supplier_id'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN project_supplier_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
        RAISE NOTICE 'Added project_supplier_id column';
    END IF;
    
    -- 检查 planned_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'planned_date'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN planned_date DATE NOT NULL DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Added planned_date column';
    END IF;
    
    -- 检查 amount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'amount'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN amount DECIMAL(12, 2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added amount column';
    END IF;
    
    -- 检查 percentage
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'percentage'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN percentage DECIMAL(5, 2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added percentage column';
    END IF;
    
    -- 检查 reason
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'reason'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN reason TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added reason column';
    END IF;
    
    -- 检查 status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'status'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
        RAISE NOTICE 'Added status column';
    END IF;
    
    -- 检查 actual_payment_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'actual_payment_date'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN actual_payment_date DATE;
        RAISE NOTICE 'Added actual_payment_date column';
    END IF;
    
    -- 检查 voucher_url
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'voucher_url'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN voucher_url TEXT;
        RAISE NOTICE 'Added voucher_url column';
    END IF;
    
    -- 检查 created_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;
    
    -- 检查 updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE supplier_payment_plans ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
END $$;

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_project_supplier_id 
    ON supplier_payment_plans(project_supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_status 
    ON supplier_payment_plans(status);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_planned_date 
    ON supplier_payment_plans(planned_date);

-- 5. 创建更新时间触发器
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

-- 6. 启用 RLS
ALTER TABLE supplier_payment_plans ENABLE ROW LEVEL SECURITY;

-- 7. 创建 RLS 策略
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

-- 8. 验证表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'supplier_payment_plans'
ORDER BY ordinal_position;
