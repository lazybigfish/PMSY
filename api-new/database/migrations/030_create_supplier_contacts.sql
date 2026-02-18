-- 创建 supplier_contacts 表（供应商联系人表）
-- 用于存储供应商的多个联系人信息

CREATE TABLE IF NOT EXISTS supplier_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    position TEXT,
    phone TEXT,
    email TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier_id ON supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_is_primary ON supplier_contacts(is_primary);

-- 添加注释
COMMENT ON TABLE supplier_contacts IS '供应商联系人表';
COMMENT ON COLUMN supplier_contacts.supplier_id IS '关联的供应商ID';
COMMENT ON COLUMN supplier_contacts.name IS '联系人姓名';
COMMENT ON COLUMN supplier_contacts.position IS '职位';
COMMENT ON COLUMN supplier_contacts.phone IS '联系电话';
COMMENT ON COLUMN supplier_contacts.email IS '电子邮箱';
COMMENT ON COLUMN supplier_contacts.is_primary IS '是否为主要联系人';

-- 创建更新时间戳触发器
CREATE TRIGGER update_supplier_contacts_updated_at
    BEFORE UPDATE ON supplier_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
