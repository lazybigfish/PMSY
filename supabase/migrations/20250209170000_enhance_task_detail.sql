-- Add owner_id to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id);

-- Create task_modules table for Many-to-Many relationship
CREATE TABLE IF NOT EXISTS task_modules (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  module_id UUID REFERENCES project_modules(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  PRIMARY KEY (task_id, module_id)
);

-- Data Migration: Set owner_id to created_by for existing tasks
UPDATE tasks SET owner_id = created_by WHERE owner_id IS NULL;
