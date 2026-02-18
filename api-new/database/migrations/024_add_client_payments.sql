-- 客户回款记录表
-- 创建时间: 2026-02-18

CREATE TABLE IF NOT EXISTS client_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_method TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_client_payments_project_id ON client_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_client_id ON client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_payment_date ON client_payments(payment_date);

-- 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_client_payments_updated_at ON client_payments;
CREATE TRIGGER update_client_payments_updated_at
    BEFORE UPDATE ON client_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
