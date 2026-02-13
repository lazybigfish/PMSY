
-- Re-create task_assignees table if it is missing
create table if not exists public.task_assignees (
    id uuid default uuid_generate_v4() primary key,
    task_id uuid references public.tasks(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    is_primary boolean default false,
    assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(task_id, user_id)
);

-- Enable RLS
alter table public.task_assignees enable row level security;

-- Grant permissions
grant all privileges on public.task_assignees to authenticated;

-- RLS Policy
create policy "Enable all for authenticated users" on public.task_assignees for all to authenticated using (true) with check (true);
