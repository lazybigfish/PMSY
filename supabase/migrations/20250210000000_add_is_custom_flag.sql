alter table public.project_milestones add column if not exists is_custom boolean default false;
alter table public.milestone_tasks add column if not exists is_custom boolean default false;
