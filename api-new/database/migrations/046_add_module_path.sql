-- Migration: 添加功能模块路径标识字段
-- Description: 为 project_modules 表添加 path 字段，用于层级路径标识和排序

-- 添加 path 字段
ALTER TABLE project_modules ADD COLUMN IF NOT EXISTS path TEXT;

-- 创建索引加速排序查询
CREATE INDEX IF NOT EXISTS idx_project_modules_path ON project_modules(path);

-- 为现有数据生成 path
-- 使用递归CTE计算每个模块的路径
WITH RECURSIVE module_tree AS (
    -- 顶级模块
    SELECT 
        id,
        project_id,
        parent_id,
        level,
        sort_order,
        ROW_NUMBER() OVER (PARTITION BY project_id, parent_id ORDER BY sort_order, created_at) as sibling_order,
        CAST(ROW_NUMBER() OVER (PARTITION BY project_id, parent_id ORDER BY sort_order, created_at) AS TEXT) as path
    FROM project_modules
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- 子模块
    SELECT 
        cm.id,
        cm.project_id,
        cm.parent_id,
        cm.level,
        cm.sort_order,
        ROW_NUMBER() OVER (PARTITION BY cm.project_id, cm.parent_id ORDER BY cm.sort_order, cm.created_at) as sibling_order,
        mt.path || '.' || ROW_NUMBER() OVER (PARTITION BY cm.project_id, cm.parent_id ORDER BY cm.sort_order, cm.created_at) as path
    FROM project_modules cm
    INNER JOIN module_tree mt ON cm.parent_id = mt.id
)
UPDATE project_modules pm
SET path = mt.path
FROM module_tree mt
WHERE pm.id = mt.id;

-- 为没有 path 的模块设置默认值（兜底）
UPDATE project_modules 
SET path = '1'
WHERE path IS NULL AND parent_id IS NULL;

-- 注释说明
COMMENT ON COLUMN project_modules.path IS '模块层级路径标识，如 1, 1.1, 2.1.1，用于展示和排序';
