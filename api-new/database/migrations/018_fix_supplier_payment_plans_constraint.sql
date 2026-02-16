-- 修复 supplier_payment_plans 表的非空约束问题
-- 将 supplier_id 和 project_id 改为可空，因为前端使用 project_supplier_id 替代

-- 1. 修改 supplier_id 字段，移除 NOT NULL 约束
ALTER TABLE supplier_payment_plans 
    ALTER COLUMN supplier_id DROP NOT NULL;

-- 2. 修改 project_id 字段，移除 NOT NULL 约束
ALTER TABLE supplier_payment_plans 
    ALTER COLUMN project_id DROP NOT NULL;

-- 3. 修改 project_supplier_id 字段，添加 NOT NULL 约束（如果前端总是提供此字段）
-- 注意：先确保所有现有数据都有值，或者保持可空
-- ALTER TABLE supplier_payment_plans 
--     ALTER COLUMN project_supplier_id SET NOT NULL;
