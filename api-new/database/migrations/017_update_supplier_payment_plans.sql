-- 修改 supplier_payment_plans 表结构，使其与前端代码保持一致

-- 1. 添加新字段
ALTER TABLE supplier_payment_plans 
    ADD COLUMN IF NOT EXISTS project_supplier_id UUID REFERENCES project_suppliers(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS amount DECIMAL(15, 2),
    ADD COLUMN IF NOT EXISTS percentage DECIMAL(5, 2),
    ADD COLUMN IF NOT EXISTS reason TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 2. 删除旧字段（在确认数据迁移完成后执行）
-- 注意：先保留旧字段以确保兼容性，后续可以删除
-- ALTER TABLE supplier_payment_plans DROP COLUMN IF EXISTS supplier_id;
-- ALTER TABLE supplier_payment_plans DROP COLUMN IF EXISTS phase_name;
-- ALTER TABLE supplier_payment_plans DROP COLUMN IF EXISTS planned_amount;
-- ALTER TABLE supplier_payment_plans DROP COLUMN IF EXISTS actual_amount;
-- ALTER TABLE supplier_payment_plants DROP COLUMN IF EXISTS actual_date;
-- ALTER TABLE supplier_payment_plans DROP COLUMN IF EXISTS notes;

-- 3. 创建新索引
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_project_supplier_id ON supplier_payment_plans(project_supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_plans_created_by ON supplier_payment_plans(created_by);

-- 4. 添加注释
COMMENT ON COLUMN supplier_payment_plans.project_supplier_id IS '项目供应商关联ID';
COMMENT ON COLUMN supplier_payment_plans.amount IS '付款金额';
COMMENT ON COLUMN supplier_payment_plans.percentage IS '付款比例（百分比）';
COMMENT ON COLUMN supplier_payment_plans.reason IS '付款原因/阶段说明';
COMMENT ON COLUMN supplier_payment_plans.created_by IS '创建人ID';
