
-- 1. Fix Helper Function to be more robust and prevent search_path hijacking
-- Since policies depend on this function, we must drop it with CASCADE.
-- This will automatically drop all policies that use it, so we need to recreate them all.
DROP FUNCTION IF EXISTS public.is_project_member(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.is_project_member(target_project_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if the current user exists in the project_members table for the given project
  -- SECURITY DEFINER ensures this runs with owner permissions, bypassing RLS on project_members
  -- to avoid infinite recursion (Project -> RLS -> is_project_member -> project_members -> RLS -> Project...)
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = target_project_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update Projects Visibility Policy
-- Note: 'Projects visibility' policy was dropped by CASCADE above, so we just create it.
-- But to be safe and idempotent, we use DROP IF EXISTS anyway.

DROP POLICY IF EXISTS "Projects visibility" ON public.projects;

CREATE POLICY "Projects visibility" ON public.projects
FOR SELECT TO authenticated
USING (
  public.is_admin() OR          -- Admin sees all
  is_public = true OR           -- Public projects visible to all authenticated
  manager_id = auth.uid() OR    -- Manager sees own projects
  public.is_project_member(id)  -- Members see joined projects
);

-- 3. Recreate ALL other policies that depended on is_project_member
-- Because CASCADE dropped them, we MUST redefine them here.

-- Tasks
DROP POLICY IF EXISTS "Tasks visibility" ON public.tasks;
CREATE POLICY "Tasks visibility" ON public.tasks
FOR SELECT TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = tasks.project_id AND (
      is_public = true OR           -- Allow if parent project is public
      manager_id = auth.uid() OR    -- Allow if manager
      public.is_project_member(id)  -- Allow if member
    )
  )
);

DROP POLICY IF EXISTS "Tasks modification" ON public.tasks;
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

-- Task Assignees
DROP POLICY IF EXISTS "Task assignees access" ON public.task_assignees;
CREATE POLICY "Task assignees access" ON public.task_assignees
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.tasks
    JOIN public.projects ON projects.id = tasks.project_id
    WHERE tasks.id = task_assignees.task_id AND (
      projects.is_public = true OR
      projects.manager_id = auth.uid() OR
      public.is_project_member(projects.id)
    )
  )
);

-- Project Members
DROP POLICY IF EXISTS "Members visibility" ON public.project_members;
CREATE POLICY "Members visibility" ON public.project_members
FOR SELECT TO authenticated
USING (
  public.is_admin() OR
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_members.project_id AND (
      is_public = true OR           -- Allow if parent project is public
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);

DROP POLICY IF EXISTS "Members modification" ON public.project_members;
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
DROP POLICY IF EXISTS "Milestones access" ON public.project_milestones;
CREATE POLICY "Milestones access" ON public.project_milestones
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_milestones.project_id AND (
      (is_public = true AND current_setting('request.method', true) = 'GET') OR -- Allow read for public
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);

-- Project Modules
DROP POLICY IF EXISTS "Modules access" ON public.project_modules;
CREATE POLICY "Modules access" ON public.project_modules
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_modules.project_id AND (
      (is_public = true AND current_setting('request.method', true) = 'GET') OR
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);

-- Risks
DROP POLICY IF EXISTS "Risks access" ON public.risks;
CREATE POLICY "Risks access" ON public.risks
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = risks.project_id AND (
      (is_public = true AND current_setting('request.method', true) = 'GET') OR
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);

-- Project Suppliers
DROP POLICY IF EXISTS "Project suppliers access" ON public.project_suppliers;
CREATE POLICY "Project suppliers access" ON public.project_suppliers
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_suppliers.project_id AND (
      (is_public = true AND current_setting('request.method', true) = 'GET') OR
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);

-- Reports
DROP POLICY IF EXISTS "Reports access" ON public.reports;
CREATE POLICY "Reports access" ON public.reports
FOR ALL TO authenticated
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = reports.project_id AND (
      (is_public = true AND current_setting('request.method', true) = 'GET') OR
      manager_id = auth.uid() OR
      public.is_project_member(id)
    )
  )
);
