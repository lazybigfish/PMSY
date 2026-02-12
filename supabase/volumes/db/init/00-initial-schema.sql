-- ==========================================
-- Supabase 初始化和 PMSY 数据库架构
-- ==========================================

-- 启用必要的扩展
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 创建 anon 和 authenticated 角色（如果不存在）
do $$
begin
    if not exists (select from pg_roles where rolname = 'anon') then
        create role anon;
    end if;
    if not exists (select from pg_roles where rolname = 'authenticated') then
        create role authenticated;
    end if;
    if not exists (select from pg_roles where rolname = 'service_role') then
        create role service_role;
    end if;
end
$$;

-- 创建 auth  schema
CREATE SCHEMA IF NOT EXISTS auth;

-- 创建 auth.users 表（Supabase Auth 兼容）
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    encrypted_password VARCHAR(255),
    email_confirmed_at TIMESTAMPTZ,
    invited_at TIMESTAMPTZ,
    confirmation_token VARCHAR(255),
    confirmation_sent_at TIMESTAMPTZ,
    recovery_token VARCHAR(255),
    recovery_sent_at TIMESTAMPTZ,
    email_change_token VARCHAR(255),
    email_change VARCHAR(255),
    email_change_sent_at TIMESTAMPTZ,
    new_email VARCHAR(255),
    raw_app_meta_data JSONB DEFAULT '{}'::JSONB,
    raw_user_meta_data JSONB DEFAULT '{}'::JSONB,
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    phone VARCHAR(15) UNIQUE,
    phone_confirmed_at TIMESTAMPTZ,
    phone_change VARCHAR(15),
    phone_change_token VARCHAR(255),
    phone_change_sent_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ GENERATED ALWAYS AS (
        LEAST(email_confirmed_at, phone_confirmed_at)
    ) STORED,
    email_change_confirm_status SMALLINT DEFAULT 0,
    banned_until TIMESTAMPTZ,
    reauthentication_token VARCHAR(255),
    reauthentication_sent_at TIMESTAMPTZ,
    is_sso_user BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ
);

-- 创建 auth.uid() 函数
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT 
        coalesce(
            current_setting('request.jwt.claim.sub', true),
            current_setting('request.jwt.claims', true)::jsonb->>'sub'
        )::uuid
$$;

-- 创建 auth.role() 函数
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT 
        coalesce(
            current_setting('request.jwt.claim.role', true),
            current_setting('request.jwt.claims', true)::jsonb->>'role'
        )::text
$$;

-- 创建 auth.email() 函数
CREATE OR REPLACE FUNCTION auth.email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT 
        coalesce(
            current_setting('request.jwt.claim.email', true),
            current_setting('request.jwt.claims', true)::jsonb->>'email'
        )::text
$$;

-- ==========================================
-- PMSY 应用表结构
-- ==========================================

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text,
  full_name text,
  avatar_url text,
  role text default 'user',
  email text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Projects table
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  customer_name text,
  amount decimal(15, 2),
  description text,
  status text default 'pending',
  is_public boolean default false,
  manager_id uuid references public.profiles(id),
  current_milestone_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project Members table
create table public.project_members (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project Modules
create table public.project_modules (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  parent_id uuid references public.project_modules(id) on delete cascade,
  name text not null,
  description text,
  status text default 'not_started',
  sort_order integer default 0,
  level integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Milestone Templates
create table public.milestone_templates (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  phase_order integer not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project Milestones
create table public.project_milestones (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  description text,
  status text default 'pending',
  start_date date,
  end_date date,
  phase_order integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Milestone Tasks
create table public.milestone_tasks (
  id uuid default uuid_generate_v4() primary key,
  milestone_id uuid references public.project_milestones(id) on delete cascade not null,
  name text not null,
  description text,
  is_required boolean default false,
  is_completed boolean default false,
  output_documents jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks table
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  module_id uuid references public.project_modules(id) on delete set null,
  title text not null,
  description text,
  status text default 'todo',
  priority text default 'medium',
  is_public boolean default false,
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Suppliers table
create table public.suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  contact_person text,
  phone text,
  email text,
  description text,
  status text default 'active',
  project_id uuid references public.projects(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Risks table
create table public.risks (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  level text default 'medium',
  status text default 'open',
  owner_id uuid references public.profiles(id),
  impact text,
  mitigation_plan text,
  handling_records jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reports table
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  type text not null,
  status text default 'draft',
  content jsonb not null,
  ai_analysis jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Report Templates
create table public.report_templates (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  config jsonb not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- AI Configuration
create table public.ai_providers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  api_endpoint text,
  api_key text,
  model text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.ai_roles (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  system_prompt text not null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.ai_analysis_results (
  id uuid default uuid_generate_v4() primary key,
  report_id uuid references public.reports(id) on delete cascade,
  provider_id uuid references public.ai_providers(id),
  role_id uuid references public.ai_roles(id),
  result text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Task Assignees
create table public.task_assignees (
    id uuid default uuid_generate_v4() primary key,
    task_id uuid references public.tasks(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    is_primary boolean default false,
    assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(task_id, user_id)
);

-- ==========================================
-- RLS 策略
-- ==========================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_modules enable row level security;
alter table public.project_milestones enable row level security;
alter table public.milestone_tasks enable row level security;
alter table public.tasks enable row level security;
alter table public.suppliers enable row level security;
alter table public.risks enable row level security;
alter table public.reports enable row level security;
alter table public.report_templates enable row level security;
alter table public.ai_providers enable row level security;
alter table public.ai_roles enable row level security;
alter table public.ai_analysis_results enable row level security;
alter table public.task_assignees enable row level security;

-- Profiles 策略
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Projects 策略
create policy "Projects viewable by members or public" on public.projects for select using (
  is_public = true or 
  auth.uid() = manager_id or
  exists (select 1 from public.project_members where project_id = id and user_id = auth.uid())
);
create policy "Managers can insert projects" on public.projects for insert with check (auth.uid() = manager_id);
create policy "Managers can update own projects" on public.projects for update using (auth.uid() = manager_id);

-- 其他表的通用策略
create policy "Enable all for authenticated users" on public.project_members for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.project_modules for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.project_milestones for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.milestone_tasks for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.tasks for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.suppliers for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.risks for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.reports for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.report_templates for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.ai_providers for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.ai_roles for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.ai_analysis_results for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.task_assignees for all to authenticated using (true) with check (true);

-- 权限授予
grant select on public.profiles to anon;
grant select on public.projects to anon;
grant all privileges on public.profiles to authenticated;
grant all privileges on public.projects to authenticated;
grant all privileges on public.project_members to authenticated;
grant all privileges on public.project_modules to authenticated;
grant all privileges on public.project_milestones to authenticated;
grant all privileges on public.milestone_tasks to authenticated;
grant all privileges on public.tasks to authenticated;
grant all privileges on public.suppliers to authenticated;
grant all privileges on public.risks to authenticated;
grant all privileges on public.reports to authenticated;
grant all privileges on public.report_templates to authenticated;
grant all privileges on public.ai_providers to authenticated;
grant all privileges on public.ai_roles to authenticated;
grant all privileges on public.ai_analysis_results to authenticated;
grant all privileges on public.task_assignees to authenticated;

-- ==========================================
-- 触发器
-- ==========================================

-- 自动创建用户资料
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- 初始化数据
-- ==========================================

-- 默认 AI 角色
insert into public.ai_roles (name, description, system_prompt, is_default) values 
('Senior Project Manager', 'Experienced project manager focusing on risk and progress analysis.', 'You are a Senior Project Manager. Analyze the provided project data including tasks, risks, and milestones. Provide a professional weekly/daily report summary with sections for Overview, Risks, Completed Work, and Future Plan. Be concise and highlight critical issues.', true);

-- 里程碑模板
insert into public.milestone_templates (name, phase_order) values
('进场前阶段', 1),
('启动阶段', 2),
('实施阶段', 3),
('初验阶段', 4),
('试运行阶段', 5),
('终验阶段', 6),
('运维阶段', 7);
