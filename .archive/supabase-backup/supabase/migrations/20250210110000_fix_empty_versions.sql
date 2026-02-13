-- Fix: Ensure at least one active version exists, even if milestone_templates is empty
DO $$
DECLARE
    v_id uuid;
BEGIN
    -- 1. Check if any version exists
    IF NOT EXISTS (SELECT 1 FROM public.template_versions) THEN
        -- Create V1.0
        INSERT INTO public.template_versions (version_name, description, is_active)
        VALUES ('V1.0', 'Initial System Version', true)
        RETURNING id INTO v_id;
        
        RAISE NOTICE 'Created default V1.0 version: %', v_id;
    END IF;

    -- 2. Ensure exactly one version is active (failsafe)
    IF NOT EXISTS (SELECT 1 FROM public.template_versions WHERE is_active = true) THEN
        UPDATE public.template_versions
        SET is_active = true
        WHERE created_at = (SELECT MAX(created_at) FROM public.template_versions);
    END IF;
    
    -- 3. If milestone_templates has rows with NULL version_id, link them to the active version
    UPDATE public.milestone_templates
    SET version_id = (SELECT id FROM public.template_versions WHERE is_active = true LIMIT 1)
    WHERE version_id IS NULL;
    
END $$;
