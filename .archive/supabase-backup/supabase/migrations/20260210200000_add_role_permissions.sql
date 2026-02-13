
-- Create app_roles table
CREATE TABLE IF NOT EXISTS public.app_roles (
    key text PRIMARY KEY,
    name text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    role_key text REFERENCES public.app_roles(key) ON DELETE CASCADE,
    module_key text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(role_key, module_key)
);

-- Enable RLS
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for app_roles
-- Everyone can read roles (for UI display)
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.app_roles;
CREATE POLICY "Allow read access for authenticated users" ON public.app_roles
    FOR SELECT TO authenticated USING (true);

-- Only admins can modify roles (Assuming we check profile role in app logic or trigger, 
-- but for simplicity here, we'll allow authenticated users to modify if they are admin.
-- Since Supabase auth role is 'authenticated', we need to check public.profiles.role)
DROP POLICY IF EXISTS "Allow full access for admins" ON public.app_roles;
CREATE POLICY "Allow full access for admins" ON public.app_roles
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Policies for role_permissions
-- Everyone can read permissions (to determine their own access)
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.role_permissions;
CREATE POLICY "Allow read access for authenticated users" ON public.role_permissions
    FOR SELECT TO authenticated USING (true);

-- Only admins can modify permissions
DROP POLICY IF EXISTS "Allow full access for admins" ON public.role_permissions;
CREATE POLICY "Allow full access for admins" ON public.role_permissions
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Seed initial data
INSERT INTO public.app_roles (key, name, description) VALUES
    ('admin', '管理员', '系统超级管理员，拥有所有权限'),
    ('manager', '项目经理', '负责项目管理和团队协作'),
    ('user', '普通用户', '参与项目执行的团队成员')
ON CONFLICT (key) DO NOTHING;

-- Seed permissions
-- Admin: All modules
INSERT INTO public.role_permissions (role_key, module_key) VALUES
    ('admin', 'dashboard'),
    ('admin', 'projects'),
    ('admin', 'tasks'),
    ('admin', 'suppliers'),
    ('admin', 'analysis'),
    ('admin', 'water'),
    ('admin', 'files'),
    ('admin', 'system')
ON CONFLICT (role_key, module_key) DO NOTHING;

-- Manager: All modules except system settings
INSERT INTO public.role_permissions (role_key, module_key) VALUES
    ('manager', 'dashboard'),
    ('manager', 'projects'),
    ('manager', 'tasks'),
    ('manager', 'suppliers'),
    ('manager', 'analysis'),
    ('manager', 'water'),
    ('manager', 'files')
ON CONFLICT (role_key, module_key) DO NOTHING;

-- User: Basic modules
INSERT INTO public.role_permissions (role_key, module_key) VALUES
    ('user', 'dashboard'),
    ('user', 'projects'),
    ('user', 'tasks'),
    ('user', 'suppliers'),
    ('user', 'water'),
    ('user', 'files')
ON CONFLICT (role_key, module_key) DO NOTHING;
