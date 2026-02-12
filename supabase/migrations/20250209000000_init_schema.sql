
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text,
  full_name text,
  avatar_url text,
  role text default 'user', -- 'admin', 'project_manager', 'team_member'
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
  status text default 'pending', -- 'pending', 'in_progress', 'completed', 'paused'
  is_public boolean default false,
  manager_id uuid references public.profiles(id),
  current_milestone_id uuid, -- Reference to current milestone
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project Members table (for team management)
create table public.project_members (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member', -- 'manager', 'member'
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project Modules (Functional Modules)
create table public.project_modules (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  parent_id uuid references public.project_modules(id) on delete cascade,
  name text not null,
  description text,
  status text default 'not_started', -- 'not_started', 'in_progress', 'completed', 'paused'
  sort_order integer default 0,
  level integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Milestones (Standard Templates & Project Instances)
-- We'll just use a single table for project milestones, and populate from code or a template table if needed. 
-- For simplicity, let's create a template table and a project milestone table.

create table public.milestone_templates (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  phase_order integer not null, -- 1 to 7
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.project_milestones (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  description text,
  status text default 'pending', -- 'pending', 'in_progress', 'completed'
  start_date date,
  end_date date,
  phase_order integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.milestone_tasks (
  id uuid default uuid_generate_v4() primary key,
  milestone_id uuid references public.project_milestones(id) on delete cascade not null,
  name text not null,
  description text,
  is_required boolean default false,
  is_completed boolean default false,
  output_documents jsonb default '[]'::jsonb, -- Array of document objects {name, url}
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks table (General Tasks)
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  module_id uuid references public.project_modules(id) on delete set null,
  title text not null,
  description text,
  status text default 'todo', -- 'todo', 'in_progress', 'paused', 'done', 'canceled'
  priority text default 'medium', -- 'low', 'medium', 'high'
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
  project_id uuid references public.projects(id) on delete cascade, -- Optional: link to project directly or many-to-many
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Risks table
create table public.risks (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  level text default 'medium', -- 'low', 'medium', 'high'
  status text default 'open', -- 'open', 'handling', 'closed'
  owner_id uuid references public.profiles(id),
  impact text,
  mitigation_plan text,
  handling_records jsonb default '[]'::jsonb, -- Array of {date, content, handler_id}
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reports table (Daily/Weekly)
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  type text not null, -- 'daily', 'weekly'
  status text default 'draft', -- 'draft', 'published'
  content jsonb not null, -- Structured content {overview, risks, completed_work, plan}
  ai_analysis jsonb, -- AI analysis result
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Report Templates
create table public.report_templates (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  config jsonb not null, -- Template structure and style
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- AI Configuration
create table public.ai_providers (
  id uuid default uuid_generate_v4() primary key,
  name text not null, -- 'openai', 'deepseek', etc.
  api_endpoint text,
  api_key text, -- Encrypted or stored securely (be careful with this in frontend apps)
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

-- 任务处理人表（支持多处理人）
create table public.task_assignees (
    id uuid default uuid_generate_v4() primary key,
    task_id uuid references public.tasks(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    is_primary boolean default false, -- 是否为主要负责人
    assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(task_id, user_id)
);

-- Enable RLS
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

-- RLS Policies
-- Profiles: Everyone can read basic profile info (username, avatar). User can update own.
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Projects:
-- 1. Public projects are viewable by everyone (authenticated).
-- 2. Members can view their projects.
-- 3. Managers can update their projects.
create policy "Projects viewable by members or public" on public.projects for select using (
  is_public = true or 
  auth.uid() = manager_id or
  exists (select 1 from public.project_members where project_id = id and user_id = auth.uid())
);
create policy "Managers can insert projects" on public.projects for insert with check (auth.uid() = manager_id);
create policy "Managers can update own projects" on public.projects for update using (auth.uid() = manager_id);

-- Other tables generally follow project access rules.
-- For simplicity in this initial migration, we will grant full access to authenticated users for now to speed up development, 
-- and refine granular access later if needed, or stick to the "Project Member" check logic.

-- Let's use a simple "Authenticated users can do everything" for MVP development speed, 
-- BUT since the prompt asked for specific permission handling (anon/authenticated), I should be careful.
-- The prompt said: "If the user is not logged in, Grant basic read access to the anon role... If the user is already logged in, Grant full access to the authenticated role"
-- Okay, I will follow that guideline.

grant select on public.profiles to anon;
grant select on public.projects to anon; -- Only public ones ideally, but RLS handles rows.

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

-- Policies for Authenticated (Allow all for now as per "Grant full access to authenticated role")
create policy "Enable all for authenticated users" on public.projects for all to authenticated using (true) with check (true);
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

-- Insert default AI Role
insert into public.ai_roles (name, description, system_prompt, is_default) values 
('Senior Project Manager', 'Experienced project manager focusing on risk and progress analysis.', 'You are a Senior Project Manager. Analyze the provided project data including tasks, risks, and milestones. Provide a professional weekly/daily report summary with sections for Overview, Risks, Completed Work, and Future Plan. Be concise and highlight critical issues.', true);

-- Insert default Milestone Templates (7 phases)
-- Phase 1: 进场前阶段
insert into public.milestone_templates (name, phase_order) values ('进场前阶段', 1);
-- Phase 2: 启动阶段
insert into public.milestone_templates (name, phase_order) values ('启动阶段', 2);
-- Phase 3: 实施阶段
insert into public.milestone_templates (name, phase_order) values ('实施阶段', 3);
-- Phase 4: 初验阶段
insert into public.milestone_templates (name, phase_order) values ('初验阶段', 4);
-- Phase 5: 试运行阶段
insert into public.milestone_templates (name, phase_order) values ('试运行阶段', 5);
-- Phase 6: 终验阶段
insert into public.milestone_templates (name, phase_order) values ('终验阶段', 6);
-- Phase 7: 运维阶段
insert into public.milestone_templates (name, phase_order) values ('运维阶段', 7);

-- Insert default milestone tasks for each phase
-- 进场前阶段任务
insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents) 
select id, '获取基础材料', '收集项目可研文件、项目合同', true, '[{"name": "可研文件", "required": true}, {"name": "项目合同", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 1;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '明确干系人', '梳理甲方负责人及联系人，输出《项目干系人清单》', true, '[{"name": "项目干系人清单", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 1;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '组建项目团队', '根据建设方向（自研/外采）明确团队成员，输出《项目团队成员表》', true, '[{"name": "项目团队成员表", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 1;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '风险与预算分析', '基于可研和合同，输出《项目风险清单》和《项目预算规划表》', true, '[{"name": "项目风险清单", "required": true}, {"name": "项目预算规划表", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 1;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '召开内部启动会', '整合前期材料，形成会议纪要', true, '[{"name": "内部启动会会议纪要", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 1;

-- 启动阶段任务
insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '编制基础文档', '输出《项目经理授权函》《开工报审表》', true, '[{"name": "项目经理授权函", "required": true}, {"name": "开工报审表", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 2;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '拆解建设内容', '形成《项目实施功能清单》和《项目实施方案》', true, '[{"name": "项目实施功能清单", "required": true}, {"name": "项目实施方案", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 2;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '制定进度计划', '输出《项目实施计划表》', true, '[{"name": "项目实施计划表", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 2;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '召开项目启动会', '明确议程、参会人，最终输出《开工令》和《会议纪要》', true, '[{"name": "开工令", "required": true}, {"name": "项目启动会会议纪要", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 2;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '筹备服务器资源', '申请并确认资源，输出《服务器资源清单》', true, '[{"name": "服务器资源清单", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 2;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '供应商/硬件下单', '根据功能清单签订合同', false, '[{"name": "采购合同", "required": false}]'::jsonb
from public.milestone_templates where phase_order = 2;

-- 实施阶段任务
insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '需求调研', '输出全套设计文档（需求规格、数据库设计、概要/详细设计说明书）', true, '[{"name": "需求规格说明书", "required": true}, {"name": "数据库设计说明书", "required": true}, {"name": "概要设计说明书", "required": true}, {"name": "详细设计说明书", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 3;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '系统部署', '在已申请服务器上部署系统，更新《服务器资源清单》', true, '[{"name": "系统部署文档", "required": true}, {"name": "服务器资源清单（更新）", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 3;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '第三方测评', '开展软件测试、三级等保测评、商用密码测评（均需提前三个月筹备），输出对应报告', true, '[{"name": "软件测试报告", "required": true}, {"name": "三级等保测评报告", "required": true}, {"name": "商用密码测评报告", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 3;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '培训与自查', '组织用户培训并记录；项目组进行功能点自查，输出《功能点验表》', true, '[{"name": "用户培训记录", "required": true}, {"name": "功能点验表", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 3;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '监理核查', '由监理方对功能进行核验', true, '[{"name": "监理核查报告", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 3;

-- 初验阶段任务
insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '整理验收文档', '编制完整的《文档目录》', true, '[{"name": "文档目录", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 4;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '筹备并召开初验会', '提交初验申请，形成《初步验收报告》', true, '[{"name": "初验申请", "required": true}, {"name": "初步验收报告", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 4;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '整改专家意见', '针对问题输出《遗留问题整改报告》', true, '[{"name": "遗留问题整改报告", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 4;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '上线试运行', '提交《试运行申请》，系统进入试运行期', true, '[{"name": "试运行申请", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 4;

-- 试运行阶段任务
insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '试运行保障', '持续监控并记录运行情况', true, '[{"name": "试运行记录", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 5;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '项目结算与决算', '依次输出《结算报告》和《决算报告》', true, '[{"name": "结算报告", "required": true}, {"name": "决算报告", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 5;

-- 终验阶段任务
insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '试运行总结', '输出《试运行总结报告》', true, '[{"name": "试运行总结报告", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 6;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '终验筹备与召开', '提交终验申请，形成《终验报告》', true, '[{"name": "终验申请", "required": true}, {"name": "终验报告", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 6;

insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '终验整改', '再次整改专家意见，更新《遗留问题整改报告》', true, '[{"name": "遗留问题整改报告（更新）", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 6;

-- 运维阶段任务
insert into public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
select id, '项目移交', '整理全部过程材料，输出《移交清单》，正式移交运维', true, '[{"name": "移交清单", "required": true}, {"name": "项目过程材料归档", "required": true}]'::jsonb
from public.milestone_templates where phase_order = 7;

-- Create a trigger to automatically create a profile for new users
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
