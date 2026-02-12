-- PMSY 数据库简化初始化脚本
-- 使用 gen_random_uuid() 替代 uuid_generate_v4()

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
  id uuid default gen_random_uuid() primary key,
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
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks table
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  status text default 'todo',
  priority text default 'medium',
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  content text,
  data jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;

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

-- Tasks
create policy if not exists "Tasks viewable by project members" on public.tasks for select using (
  exists (select 1 from public.projects where id = project_id and (
    is_public = true or 
    auth.uid() = manager_id or
    exists (select 1 from public.project_members where project_id = projects.id and user_id = auth.uid())
  ))
);

-- Grant permissions
grant select on public.profiles to anon;
grant select on public.projects to anon;
grant all on public.profiles to authenticated;
grant all on public.projects to authenticated;
grant all on public.project_members to authenticated;
grant all on public.tasks to authenticated;
grant all on public.notifications to authenticated;

-- Create admin user in auth.users if not exists
insert into auth.users (
  id, email, encrypted_password, email_confirmed_at, created_at, updated_at, is_sso_user
) values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin@pmsy.com',
  crypt('admin123', gen_salt('bf')),
  now(), now(), now(), false
)
on conflict do nothing;

-- Create admin profile
insert into public.profiles (id, username, full_name, role, email, created_at, updated_at)
select 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin',
  '系统管理员',
  'admin',
  'admin@pmsy.com',
  now(),
  now()
where not exists (select 1 from public.profiles where id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
