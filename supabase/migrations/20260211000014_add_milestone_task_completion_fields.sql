-- Add completed_at and completed_by columns to milestone_tasks table
alter table public.milestone_tasks
add column if not exists completed_at timestamp with time zone,
add column if not exists completed_by uuid references public.profiles(id);
