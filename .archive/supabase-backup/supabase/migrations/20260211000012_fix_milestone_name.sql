-- 修复 supplier_payment_plans 表结构
-- 移除不需要的 milestone_name 列，或将其设为可空

-- 检查 milestone_name 列是否存在
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'milestone_name'
    ) THEN
        -- 将 milestone_name 设为可空
        ALTER TABLE supplier_payment_plans ALTER COLUMN milestone_name DROP NOT NULL;
        RAISE NOTICE 'Made milestone_name nullable';
    END IF;
END $$;

-- 或者如果 milestone_name 不需要，可以删除它
-- DO $$
-- BEGIN
--     IF EXISTS (
--         SELECT 1 FROM information_schema.columns 
--         WHERE table_name = 'supplier_payment_plans' AND column_name = 'milestone_name'
--     ) THEN
--         ALTER TABLE supplier_payment_plans DROP COLUMN milestone_name;
--         RAISE NOTICE 'Dropped milestone_name column';
--     END IF;
-- END $$;

-- 检查 planned_amount 列（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'supplier_payment_plans' AND column_name = 'planned_amount'
    ) THEN
        -- 将 planned_amount 设为可空
        ALTER TABLE supplier_payment_plans ALTER COLUMN planned_amount DROP NOT NULL;
        RAISE NOTICE 'Made planned_amount nullable';
    END IF;
END $$;

-- 验证修复后的表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'supplier_payment_plans'
ORDER BY ordinal_position;
