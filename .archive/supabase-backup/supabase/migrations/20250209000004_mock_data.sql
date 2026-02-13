
-- Insert Mock Users (Profiles) if not exist
-- Note: In real Supabase, profiles are linked to auth.users. 
-- For mocking purpose without creating real auth users, we might run into issues if we strictly enforce foreign keys to auth.users.
-- However, our profiles table references auth.users(id). 
-- We will assume some users might already exist or we try to insert into profiles directly if constraint allows (usually it does not).
-- STRATEGY: We will fetch existing profiles to use as assignees. If none, we can't easily mock "auth" users via SQL.
-- BUT, for the purpose of this task, let's assume there are at least the current user.
-- We will create a few "Project" and "Task" data.

-- 1. Create Projects
insert into public.projects (id, name, description, status, manager_id, is_public)
select 
  uuid_generate_v4(),
  '电商平台重构项目', 
  '全渠道电商平台升级与重构', 
  'in_progress', 
  auth.uid(), -- Assign to current user as manager
  true
where not exists (select 1 from public.projects where name = '电商平台重构项目');

insert into public.projects (id, name, description, status, manager_id, is_public)
select 
  uuid_generate_v4(),
  '内部CRM系统', 
  '客户关系管理系统开发', 
  'pending', 
  auth.uid(),
  false
where not exists (select 1 from public.projects where name = '内部CRM系统');

-- 2. Create Tasks (Various Statuses & Priorities)
do $$
declare
  v_project_id uuid;
  v_user_id uuid;
  v_task_id uuid;
begin
  -- Get a project and a user
  select id into v_project_id from public.projects limit 1;
  select id into v_user_id from public.profiles limit 1;
  
  if v_project_id is null then
    -- Fallback if no project (shouldn't happen with above insert, but safety first)
    return; 
  end if;

  if v_user_id is null then
    -- If no user profiles, we might use auth.uid() if running in context, but sql migration runs as admin.
    -- We'll skip assignment if no user found.
    v_user_id := null;
  end if;

  -- Task 1: High Priority, Todo
  insert into public.tasks (title, description, project_id, status, priority, is_public, due_date, created_by)
  values ('完成系统架构设计', '需包含高可用方案', v_project_id, 'todo', 'high', true, now() + interval '2 days', v_user_id)
  returning id into v_task_id;
  
  if v_user_id is not null then
    insert into public.task_assignees (task_id, user_id, is_primary) values (v_task_id, v_user_id, true) on conflict do nothing;
  end if;

  -- Task 2: Medium Priority, In Progress
  insert into public.tasks (title, description, project_id, status, priority, is_public, due_date, created_by)
  values ('前端首页开发', '响应式布局适配', v_project_id, 'in_progress', 'medium', true, now() + interval '5 days', v_user_id)
  returning id into v_task_id;
  
  if v_user_id is not null then
    insert into public.task_assignees (task_id, user_id, is_primary) values (v_task_id, v_user_id, true) on conflict do nothing;
  end if;

  -- Task 3: Low Priority, Done
  insert into public.tasks (title, description, project_id, status, priority, is_public, due_date, created_by, completed_at)
  values ('需求调研报告', '收集各部门需求', v_project_id, 'done', 'low', false, now() - interval '1 day', v_user_id, now())
  returning id into v_task_id;

  -- Task 4: Overdue Task
  insert into public.tasks (title, description, project_id, status, priority, is_public, due_date, created_by)
  values ('服务器采购', '需紧急处理', v_project_id, 'todo', 'high', false, now() - interval '3 days', v_user_id)
  returning id into v_task_id;

  -- Task 5: Complex Task with comments
  insert into public.tasks (title, description, project_id, status, priority, is_public, due_date, created_by)
  values ('API接口联调', '支付接口与用户中心对接', v_project_id, 'handling', 'high', true, now() + interval '1 week', v_user_id)
  returning id into v_task_id;
  
  -- Add comments
  if v_user_id is not null then
     insert into public.task_comments (task_id, content, created_by) values (v_task_id, '接口文档已更新', v_user_id);
     insert into public.task_comments (task_id, content, created_by) values (v_task_id, '测试环境已部署', v_user_id);
  end if;

end $$;
