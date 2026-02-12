-- 1. Update suppliers table
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS type text DEFAULT 'service', -- 'development', 'product', 'service'
ADD COLUMN IF NOT EXISTS address text;

-- 2. Update project_suppliers table
ALTER TABLE public.project_suppliers
ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_completion_date date,
ADD COLUMN IF NOT EXISTS actual_completion_date date;

-- 3. Create Acceptance Records table
CREATE TABLE IF NOT EXISTS public.supplier_acceptances (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_supplier_id uuid REFERENCES public.project_suppliers(id) ON DELETE CASCADE NOT NULL,
    acceptance_date date NOT NULL,
    result text DEFAULT 'pass', -- 'pass', 'fail'
    description text,
    attachments jsonb DEFAULT '[]'::jsonb, -- Array of {name, url}
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Payment Plans table
CREATE TABLE IF NOT EXISTS public.supplier_payment_plans (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_supplier_id uuid REFERENCES public.project_suppliers(id) ON DELETE CASCADE NOT NULL,
    milestone_name text NOT NULL, -- e.g., "Signing", "Delivery", "Acceptance"
    planned_amount decimal(15, 2) NOT NULL,
    planned_date date,
    status text DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Payment Records table
CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_supplier_id uuid REFERENCES public.project_suppliers(id) ON DELETE CASCADE NOT NULL,
    payment_plan_id uuid REFERENCES public.supplier_payment_plans(id) ON DELETE SET NULL, -- Optional link to a plan
    amount decimal(15, 2) NOT NULL,
    payment_date date NOT NULL,
    voucher_url text, -- Payment proof
    remark text,
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for new tables
ALTER TABLE public.supplier_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL PRIVILEGES ON public.supplier_acceptances TO authenticated;
GRANT ALL PRIVILEGES ON public.supplier_payment_plans TO authenticated;
GRANT ALL PRIVILEGES ON public.supplier_payments TO authenticated;

-- Create Policies (Simple authenticated access for now, similar to others)
CREATE POLICY "Enable all for authenticated users" ON public.supplier_acceptances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.supplier_payment_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON public.supplier_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
