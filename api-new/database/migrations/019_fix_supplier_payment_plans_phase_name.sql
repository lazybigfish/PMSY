-- 修复 supplier_payment_plans 表的 phase_name 非空约束问题
-- 前端使用 reason 字段替代 phase_name，所以将 phase_name 改为可空

-- 修改 phase_name 字段，移除 NOT NULL 约束
ALTER TABLE supplier_payment_plans 
    ALTER COLUMN phase_name DROP NOT NULL;

-- 修改 planned_amount 字段，移除 NOT NULL 约束（因为前端使用 amount 替代）
ALTER TABLE supplier_payment_plans 
    ALTER COLUMN planned_amount DROP NOT NULL;
