
-- 1. Create task_progress_logs table
create table if not exists public.task_progress_logs (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  progress integer check (progress >= 0 and progress <= 100),
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create task_comments table
create table if not exists public.task_comments (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  content text not null,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create task_attachments table
create table if not exists public.task_attachments (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size integer,
  uploaded_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create notifications table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text,
  type text default 'info', -- 'info', 'success', 'warning', 'error'
  link text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Enable RLS for new tables
alter table public.task_progress_logs enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.notifications enable row level security;

-- 6. Grant permissions (following MVP broad access pattern for authenticated users)
grant all privileges on public.task_progress_logs to authenticated;
grant all privileges on public.task_comments to authenticated;
grant all privileges on public.task_attachments to authenticated;
grant all privileges on public.notifications to authenticated;

-- 7. RLS Policies for new tables (Broad access for now to match existing pattern)
create policy "Enable all for authenticated users" on public.task_progress_logs for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.task_comments for all to authenticated using (true) with check (true);
create policy "Enable all for authenticated users" on public.task_attachments for all to authenticated using (true) with check (true);
create policy "Users can see their own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "System/Users can insert notifications" on public.notifications for insert with check (true); -- Allow triggering notifications
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- 8. Refine RLS for Tasks (Optional: Sticking to MVP "Enable all" for now to ensure functionality first, but noted for future)
-- For now, we keep the existing broad policy to avoid breaking current functionality during this review.
