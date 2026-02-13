-- PMSY 数据库初始化脚本
-- 创建核心表结构

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
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
create table if not exists public.projects (
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
create table if not exists public.project_members (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project Modules
create table if not exists public.project_modules (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  parent_id uuid references public.project_modules(id) on delete cascade,
  name text not null,
  description text,
  status text default 'not_started',
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project Milestones
create table if not exists public.project_milestones (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  description text,
  phase_order integer default 0,
  status text default 'not_started',
  planned_start_date timestamp with time zone,
  planned_end_date timestamp with time zone,
  actual_start_date timestamp with time zone,
  actual_end_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Milestone Tasks
create table if not exists public.milestone_tasks (
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
create table if not exists public.tasks (
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
create table if not exists public.suppliers (
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
create table if not exists public.risks (
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
create table if not exists public.reports (
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

-- Task Assignees
create table if not exists public.task_assignees (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  is_primary boolean default false,
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(task_id, user_id)
);

-- Notifications table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  content text,
  data jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Forum Posts
create table if not exists public.forum_posts (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content jsonb not null default '{}',
  author_id uuid references public.profiles(id) on delete cascade not null,
  category text default 'other',
  is_pinned boolean default false,
  is_essence boolean default false,
  view_count integer default 0,
  reply_count integer default 0,
  like_count integer default 0,
  last_reply_at timestamp with time zone,
  last_reply_by uuid references public.profiles(id),
  attachments jsonb default '[]',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Forum Replies
create table if not exists public.forum_replies (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.forum_posts(id) on delete cascade not null,
  content jsonb not null default '{}',
  author_id uuid references public.profiles(id) on delete cascade not null,
  parent_id uuid references public.forum_replies(id) on delete cascade,
  quoted_reply_id uuid references public.forum_replies(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Forum Post Likes
create table if not exists public.forum_post_likes (
  post_id uuid references public.forum_posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (post_id, user_id)
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
alter table public.task_assignees enable row level security;
alter table public.notifications enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_replies enable row level security;
alter table public.forum_post_likes enable row level security;

-- Basic RLS Policies
-- Profiles
create policy if not exists "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy if not exists "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy if not exists "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Projects
create policy if not exists "Projects viewable by members or public" on public.projects for select using (
  is_public = true or 
  auth.uid() = manager_id or
  exists (select 1 from public.project_members where project_id = id and user_id = auth.uid())
);
create policy if not exists "Managers can insert projects" on public.projects for insert with check (auth.uid() = manager_id);
create policy if not exists "Managers can update own projects" on public.projects for update using (auth.uid() = manager_id);

-- Grant permissions
grant select on public.profiles to anon;
grant select on public.projects to anon;
grant all on public.profiles to authenticated;
grant all on public.projects to authenticated;
grant all on public.project_members to authenticated;
grant all on public.project_modules to authenticated;
grant all on public.project_milestones to authenticated;
grant all on public.milestone_tasks to authenticated;
grant all on public.tasks to authenticated;
grant all on public.suppliers to authenticated;
grant all on public.risks to authenticated;
grant all on public.reports to authenticated;
grant all on public.task_assignees to authenticated;
grant all on public.notifications to authenticated;
grant all on public.forum_posts to authenticated;
grant all on public.forum_replies to authenticated;
grant all on public.forum_post_likes to authenticated;

-- Create admin user profile if not exists
-- 默认管理员账号: admin@pmsy.com / Willyou@2026
insert into public.profiles (id, username, full_name, role, email, created_at, updated_at)
select 
  '00000000-0000-0000-0000-000000000001',
  'admin',
  '系统管理员',
  'admin',
  'admin@pmsy.com',
  now(),
  now()
where not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000001');
