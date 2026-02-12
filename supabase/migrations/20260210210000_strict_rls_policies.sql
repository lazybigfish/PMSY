
-- 1. Create Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_member(project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = $1 AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing lenient policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Projects viewable by members or public" ON public.projects;
DROP POLICY IF EXISTS "Managers can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can update own projects" ON public.projects;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.tasks;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.project_members;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.project_milestones;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.project_modules;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.risks;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.project_suppliers;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.reports;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.task_assignees;

-- 3. Projects Table Policies
-- Visibility: Admin OR Manager OR Member
CREATE POLICY "Projects visibility" ON public.projects
FOR SELECT TO authenticated
USING (
  public.is_admin() OR 
  manager_id = auth.uid() OR 
  public.is_project_member(id)
);

-- Insert: Admin OR Manager (Anyone can create, but must be manager of it?)
CREATE POLICY "Projects insert" ON public.projects
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin() OR 
  manager_id = auth.uid()
);

-- Update: Admin OR Manager
CREATE POLICY "Projects update" ON public.projects
FOR UPDATE TO authenticated
USING (
  public.is_admin() OR 
  manager_id = auth.uid()
);

-- Delete: Admin OR Manager
CREATE POLICY "Projects delete" ON public.projects
FOR DELETE TO authenticated
USING (
  public.is_admin() OR 
  manager_id = auth.uid()
);

-- 4. Sub-tables Policies (Tasks, Members, Milestones, etc.)

-- Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks visibility" ON public.tasks
FOR SELECT TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = tasks.project_id AND (
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);

CREATE POLICY "Tasks modification" ON public.tasks
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = tasks.project_id AND (
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);

-- Task Assignees (Associating users to tasks)
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task assignees access" ON public.task_assignees
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.tasks
    JOIN public.projects ON projects.id = tasks.project_id
    WHERE tasks.id = task_assignees.task_id AND (
      projects.manager_id = auth.uid() OR
      public.is_project_member(projects.id)
    )
  )
);

-- Project Members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members visibility" ON public.project_members
FOR SELECT TO authenticated
USING (
  public.is_admin() OR
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_members.project_id AND (
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);

CREATE POLICY "Members modification" ON public.project_members
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_members.project_id AND (
      manager_id = auth.uid() -- Only Manager/Admin can manage members
    )
  )
);

-- Project Milestones
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Milestones access" ON public.project_milestones
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_milestones.project_id AND (
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);

-- Project Modules
ALTER TABLE public.project_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modules access" ON public.project_modules
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_modules.project_id AND (
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);

-- Risks
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Risks access" ON public.risks
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = risks.project_id AND (
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);

-- Project Suppliers
ALTER TABLE public.project_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project suppliers access" ON public.project_suppliers
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_suppliers.project_id AND (
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);

-- Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports access" ON public.reports
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = reports.project_id AND (
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);
