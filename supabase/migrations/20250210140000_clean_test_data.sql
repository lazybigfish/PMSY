-- Clean up all test data for Projects, Tasks, and Suppliers

DO $$
BEGIN
    -- 1. Disable triggers temporarily if needed (optional, but safer for massive deletes)
    -- SET session_replication_role = 'replica';

    -- 2. Clean Project-related data (Cascades to most tables)
    -- Deleting from 'projects' will cascade to:
    --   - project_members
    --   - project_modules
    --   - project_milestones -> milestone_tasks
    --   - tasks -> task_assignees, task_progress_logs, etc.
    --   - risks
    --   - reports
    --   - project_suppliers -> supplier_payments, etc.
    DELETE FROM public.projects;

    -- 3. Clean Suppliers (Independent master data)
    -- Deleting from 'suppliers' will cascade to:
    --   - project_suppliers (if any remaining)
    DELETE FROM public.suppliers;

    -- 4. Clean orphan Tasks (if any existed without projects, though schema usually prevents this)
    DELETE FROM public.tasks;

    -- 5. Reset Sequences (Optional, for clean IDs if not using UUIDs)
    -- Since we use UUIDs, this is not strictly necessary.

    -- Re-enable triggers
    -- SET session_replication_role = 'origin';

    RAISE NOTICE 'All test data for Projects, Tasks, and Suppliers has been cleaned.';
END $$;
