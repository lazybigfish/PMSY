-- Fix: Atomic Version Switching and Trigger Logic

-- 1. Create a function to atomically set the active version
CREATE OR REPLACE FUNCTION public.set_active_template_version(target_version_id UUID)
RETURNS void AS $$
BEGIN
    -- Deactivate all versions
    UPDATE public.template_versions
    SET is_active = false
    WHERE is_active = true;

    -- Activate the target version
    UPDATE public.template_versions
    SET is_active = true
    WHERE id = target_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure only one version is active (Data Cleanup)
DO $$
DECLARE
    latest_active_id UUID;
BEGIN
    -- Find the most recently created 'active' version
    SELECT id INTO latest_active_id
    FROM public.template_versions
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    -- If we found one, make it the ONLY active one
    IF latest_active_id IS NOT NULL THEN
        PERFORM public.set_active_template_version(latest_active_id);
    ELSE
        -- If no active version exists at all, try to find the latest version and activate it
        SELECT id INTO latest_active_id
        FROM public.template_versions
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF latest_active_id IS NOT NULL THEN
            PERFORM public.set_active_template_version(latest_active_id);
        END IF;
    END IF;
END $$;

-- 3. Re-define the project creation trigger function to be absolutely sure
CREATE OR REPLACE FUNCTION public.handle_new_project_milestones()
RETURNS trigger AS $$
DECLARE
    active_version_id UUID;
    template_record RECORD;
    new_milestone_id UUID;
    first_phase_id UUID;
BEGIN
    -- Get active version (Strictly one)
    SELECT id INTO active_version_id 
    FROM public.template_versions 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1;

    -- If no active version, do nothing
    IF active_version_id IS NULL THEN
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
