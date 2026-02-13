-- Create project_suppliers table to support Many-to-Many relationship and contract details
CREATE TABLE IF NOT EXISTS public.project_suppliers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    cooperation_type text DEFAULT 'service', -- 'development', 'product', 'service'
    contract_amount decimal(15, 2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, supplier_id)
);

-- Enable RLS
ALTER TABLE public.project_suppliers ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL PRIVILEGES ON public.project_suppliers TO authenticated;
GRANT ALL PRIVILEGES ON public.project_suppliers TO service_role;

-- Policies
CREATE POLICY "Enable all for authenticated users" ON public.project_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
