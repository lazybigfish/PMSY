-- 创建 clients 表（客户）
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    type TEXT DEFAULT 'enterprise' CHECK (type IN ('enterprise', 'government', 'individual')),
    industry TEXT,
    scale TEXT,
    address TEXT,
    location TEXT,
    website TEXT,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(type);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- 创建更新时间戳触发器
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 client_contacts 表（客户联系人）
CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    position TEXT,
    department TEXT,
    phone TEXT,
    email TEXT,
    wechat TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_is_primary ON client_contacts(is_primary);

-- 创建更新时间戳触发器
CREATE TRIGGER update_client_contacts_updated_at
    BEFORE UPDATE ON client_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 project_clients 表（项目客户关联）
CREATE TABLE IF NOT EXISTS project_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES client_contacts(id),
    role TEXT DEFAULT 'primary' CHECK (role IN ('primary', 'secondary')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(project_id, client_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_clients_project_id ON project_clients(project_id);
CREATE INDEX IF NOT EXISTS idx_project_clients_client_id ON project_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_project_clients_contact_id ON project_clients(contact_id);
