-- 创建任务依赖关系表
-- 用于管理任务间的依赖/阻塞关系

-- 创建 task_dependencies 表
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(2) NOT NULL DEFAULT 'FS' CHECK (dependency_type IN ('FS', 'SS', 'FF', 'SF')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(task_id, depends_on_task_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_created_by ON task_dependencies(created_by);

-- 添加注释
COMMENT ON TABLE task_dependencies IS '任务依赖关系表';
COMMENT ON COLUMN task_dependencies.id IS '主键';
COMMENT ON COLUMN task_dependencies.task_id IS '依赖任务ID（当前任务）';
COMMENT ON COLUMN task_dependencies.depends_on_task_id IS '被依赖的任务ID（前置任务）';
COMMENT ON COLUMN task_dependencies.dependency_type IS '依赖类型：FS-完成开始, SS-开始开始, FF-完成完成, SF-开始完成';
COMMENT ON COLUMN task_dependencies.created_by IS '创建人ID';
COMMENT ON COLUMN task_dependencies.created_at IS '创建时间';
