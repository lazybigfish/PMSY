-- 为 supplier_acceptances 表添加缺失字段
-- attachments: 附件列表, created_by: 创建者, description: 描述, result: 验收结果

ALTER TABLE supplier_acceptances
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS result TEXT CHECK (result IN ('passed', 'failed', 'pending'));

-- 添加注释
COMMENT ON COLUMN supplier_acceptances.attachments IS '验收附件列表';
COMMENT ON COLUMN supplier_acceptances.created_by IS '验收记录创建者ID';
COMMENT ON COLUMN supplier_acceptances.description IS '验收描述';
COMMENT ON COLUMN supplier_acceptances.result IS '验收结果：passed-通过, failed-不通过, pending-待定';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_supplier_acceptances_created_by ON supplier_acceptances(created_by);
CREATE INDEX IF NOT EXISTS idx_supplier_acceptances_result ON supplier_acceptances(result);
