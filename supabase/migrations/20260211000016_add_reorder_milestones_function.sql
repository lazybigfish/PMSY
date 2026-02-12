-- Create function to reorder milestones
CREATE OR REPLACE FUNCTION reorder_milestones(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update phase_order to be sequential starting from 1
  WITH numbered_milestones AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY phase_order, created_at) as new_order
    FROM project_milestones
    WHERE project_id = p_project_id
  )
  UPDATE project_milestones pm
  SET phase_order = nm.new_order
  FROM numbered_milestones nm
  WHERE pm.id = nm.id;
END;
$$;
