-- Fix NULL owner_id for tasks created between the last migration and the code fix
UPDATE public.tasks 
SET owner_id = created_by 
WHERE owner_id IS NULL;
