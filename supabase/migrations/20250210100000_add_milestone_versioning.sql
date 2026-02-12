-- 1. Create template_versions table
CREATE TABLE IF NOT EXISTS public.template_versions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    version_name text NOT NULL,
    description text,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON public.template_versions TO authenticated;
CREATE POLICY "Enable all for authenticated users" ON public.template_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Add version_id to milestone_templates
ALTER TABLE public.milestone_templates ADD COLUMN IF NOT EXISTS version_id uuid REFERENCES public.template_versions(id) ON DELETE CASCADE;

-- 3. Seed initial version
DO $$
DECLARE
    v_id uuid;
BEGIN
    -- Check if we already have data to migrate
    IF EXISTS (SELECT 1 FROM public.milestone_templates WHERE version_id IS NULL) THEN
        -- Create V1.0
        INSERT INTO public.template_versions (version_name, description, is_active)
        VALUES ('V1.0', 'Initial System Version', true)
        RETURNING id INTO v_id;

        -- Link existing templates to V1.0
        UPDATE public.milestone_templates
        SET version_id = v_id
        WHERE version_id IS NULL;
    END IF;
END $$;

-- 4. Update Trigger Function to use Active Version
CREATE OR REPLACE FUNCTION public.handle_new_project_milestones()
RETURNS trigger AS $$
DECLARE
    active_version_id UUID;
    template_record RECORD;
    new_milestone_id UUID;
    first_phase_id UUID;
BEGIN
    -- Get active version
    SELECT id INTO active_version_id FROM public.template_versions WHERE is_active = true LIMIT 1;

    -- If no active version, do nothing or raise error (fallback to V1.0 logic if needed, but better to have active version)
    IF active_version_id IS NULL THEN
        RAISE NOTICE 'No active milestone template version found.';
        RETURN NEW;
    END IF;

    -- 遍历里程碑模板，按顺序插入
    FOR template_record IN 
        SELECT * FROM public.milestone_templates 
        WHERE version_id = active_version_id 
        ORDER BY phase_order ASC
    LOOP
        -- 插入项目里程碑
        INSERT INTO public.project_milestones (project_id, name, description, phase_order, status)
        VALUES (
            NEW.id, 
            template_record.name, 
            template_record.description, 
            template_record.phase_order,
            CASE WHEN template_record.phase_order = 1 THEN 'in_progress' ELSE 'pending' END
        )
        RETURNING id INTO new_milestone_id;

        -- 如果是第一个阶段，记录ID以便更新项目当前阶段
        IF template_record.phase_order = 1 THEN
            first_phase_id := new_milestone_id;
        END IF;

        -- 插入对应的任务
        INSERT INTO public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
        SELECT 
            new_milestone_id,
            name,
            description,
            is_required,
            output_documents
        FROM public.milestone_task_templates
        WHERE milestone_template_id = template_record.id;
    END LOOP;

    -- 更新项目的当前阶段
    IF first_phase_id IS NOT NULL THEN
        UPDATE public.projects SET current_milestone_id = first_phase_id WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
