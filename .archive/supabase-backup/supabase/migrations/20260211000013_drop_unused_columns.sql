-- 删除 supplier_payment_plans 表中不需要的列
-- 这些列是旧的表结构遗留的

-- 删除 milestone_name 列
ALTER TABLE supplier_payment_plans DROP COLUMN IF EXISTS milestone_name;

-- 删除 planned_amount 列（我们用 amount 代替）
ALTER TABLE supplier_payment_plans DROP COLUMN IF EXISTS planned_amount;

-- 删除 payment_percentage 列（我们用 percentage 代替）
ALTER TABLE supplier_payment_plans DROP COLUMN IF EXISTS payment_percentage;

-- 删除 payment_reason 列（我们用 reason 代替）
ALTER TABLE supplier_payment_plans DROP COLUMN IF EXISTS payment_reason;

-- 删除 materials 列
ALTER TABLE supplier_payment_plans DROP COLUMN IF EXISTS materials;

-- 验证修复后的表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'supplier_payment_plans'
ORDER BY ordinal_position;
