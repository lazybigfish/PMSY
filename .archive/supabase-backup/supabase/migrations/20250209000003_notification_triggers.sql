
-- Function to create notification on task assignment
create or replace function public.handle_new_task_assignment()
returns trigger as $$
begin
  insert into public.notifications (user_id, title, content, type, link)
  values (
    new.user_id,
    '新任务分配',
    '您被分配了一个新任务',
    'info',
    '/tasks'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for task assignment
drop trigger if exists on_task_assigned on public.task_assignees;
create trigger on_task_assigned
  after insert on public.task_assignees
  for each row execute procedure public.handle_new_task_assignment();

-- Function to create notification on task status change
create or replace function public.handle_task_status_change()
returns trigger as $$
begin
  if old.status <> new.status then
    -- Notify assignees
    insert into public.notifications (user_id, title, content, type, link)
    select 
      user_id,
      '任务状态更新',
      '任务 "' || new.title || '" 状态已更新为 ' || new.status,
      'info',
      '/tasks'
    from public.task_assignees
    where task_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for task status change
drop trigger if exists on_task_status_change on public.tasks;
create trigger on_task_status_change
  after update on public.tasks
  for each row execute procedure public.handle_task_status_change();
