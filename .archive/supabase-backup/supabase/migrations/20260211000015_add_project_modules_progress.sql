-- Add progress column to project_modules table
alter table public.project_modules
add column if not exists progress integer default 0;
