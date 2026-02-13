-- 为验收记录表增加类型字段
ALTER TABLE public.supplier_acceptances 
ADD COLUMN IF NOT EXISTS acceptance_type text DEFAULT 'phase';

-- 添加约束确保类型值有效
ALTER TABLE public.supplier_acceptances 
DROP CONSTRAINT IF EXISTS check_acceptance_type;

ALTER TABLE public.supplier_acceptances 
ADD CONSTRAINT check_acceptance_type 
CHECK (acceptance_type IN ('initial', 'final', 'phase'));

-- 为已有数据设置默认值（阶段性验收）
UPDATE public.supplier_acceptances 
SET acceptance_type = 'phase' 
WHERE acceptance_type IS NULL;
