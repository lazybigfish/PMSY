
-- 1. Add missing columns to project_suppliers
ALTER TABLE public.project_suppliers
ADD COLUMN IF NOT EXISTS module_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS contract_file_url text;

-- 2. Add missing columns to supplier_payment_plans
ALTER TABLE public.supplier_payment_plans
ADD COLUMN IF NOT EXISTS payment_percentage decimal(5, 2),
ADD COLUMN IF NOT EXISTS payment_reason text,
ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]'::jsonb;

-- 3. Create construction_records table
CREATE TABLE IF NOT EXISTS public.construction_records (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_supplier_id uuid REFERENCES public.project_suppliers(id) ON DELETE CASCADE NOT NULL,
    construction_status text,
    registered_by uuid REFERENCES public.profiles(id),
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create progress_adjustments table
CREATE TABLE IF NOT EXISTS public.progress_adjustments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_supplier_id uuid REFERENCES public.project_suppliers(id) ON DELETE CASCADE NOT NULL,
    old_progress integer,
    new_progress integer,
    adjustment_reason text,
    adjusted_by uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.construction_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for authenticated users" ON public.construction_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.progress_adjustments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL PRIVILEGES ON public.construction_records TO authenticated;
GRANT ALL PRIVILEGES ON public.progress_adjustments TO authenticated;
