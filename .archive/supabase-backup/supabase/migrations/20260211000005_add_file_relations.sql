-- 添加文件关联字段，支持项目、任务等模块的附件关联

-- 为files表添加关联字段
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS module_type TEXT, -- 用于标识文件所属模块类型：project/task/risk/supplier/etc
ADD COLUMN IF NOT EXISTS description TEXT; -- 文件描述

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_task ON files(task_id);
CREATE INDEX IF NOT EXISTS idx_files_module_type ON files(module_type);

-- 更新RLS策略，允许用户查看关联项目的文件
DROP POLICY IF EXISTS "Files viewable by owner or shared" ON files;

CREATE POLICY "Files viewable by owner or related" 
ON files FOR SELECT USING (
    status = 'active' AND (
        uploader_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM project_members 
            WHERE project_members.project_id = files.project_id 
            AND project_members.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM tasks 
            JOIN project_members ON project_members.project_id = tasks.project_id
            WHERE tasks.id = files.task_id 
            AND project_members.user_id = auth.uid()
        )
    )
);

-- 创建函数：获取项目的所有附件
CREATE OR REPLACE FUNCTION get_project_files(project_uuid UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    original_name TEXT,
    size BIGINT,
    category TEXT,
    url TEXT,
    uploader_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.name,
        f.original_name,
        f.size,
        f.category,
        f.url,
        f.uploader_name,
        f.created_at
    FROM files f
    WHERE f.project_id = project_uuid 
    AND f.status = 'active'
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：获取任务的所有附件
CREATE OR REPLACE FUNCTION get_task_files(task_uuid UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    original_name TEXT,
    size BIGINT,
    category TEXT,
    url TEXT,
    uploader_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.name,
        f.original_name,
        f.size,
        f.category,
        f.url,
        f.uploader_name,
        f.created_at
    FROM files f
    WHERE f.task_id = task_uuid 
    AND f.status = 'active'
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
