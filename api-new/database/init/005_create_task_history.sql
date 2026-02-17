-- 任务历史记录表
-- 用途: 记录任务的所有字段变更历史

-- 1. 创建任务历史记录表
CREATE TABLE IF NOT EXISTS task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    field_name TEXT NOT NULL,           -- 变更字段名: title/status/priority/due_date/description等
    old_value TEXT,                      -- 变更前值
    new_value TEXT,                      -- 变更后值
    change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
    description TEXT,                    -- 友好描述: "将优先级从'中'修改为'高'"
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_created_at ON task_history(created_at);
CREATE INDEX IF NOT EXISTS idx_task_history_user_id ON task_history(user_id);

-- 3. 创建触发器函数：记录任务变更历史
CREATE OR REPLACE FUNCTION record_task_history()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- 获取当前用户ID（从会话变量中）
    BEGIN
        current_user_id := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    IF TG_OP = 'UPDATE' THEN
        -- 记录标题变更
        IF OLD.title IS DISTINCT FROM NEW.title THEN
            INSERT INTO task_history (task_id, user_id, field_name, old_value, new_value, change_type, description)
            VALUES (NEW.id, current_user_id, 'title', OLD.title, NEW.title, 'update', 
                    '修改标题: ' || COALESCE(OLD.title, '空') || ' → ' || COALESCE(NEW.title, '空'));
        END IF;
        
        -- 记录状态变更
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO task_history (task_id, user_id, field_name, old_value, new_value, change_type, description)
            VALUES (NEW.id, current_user_id, 'status', OLD.status, NEW.status, 'update',
                    '修改状态: ' || COALESCE(OLD.status, '空') || ' → ' || COALESCE(NEW.status, '空'));
        END IF;
        
        -- 记录优先级变更
        IF OLD.priority IS DISTINCT FROM NEW.priority THEN
            INSERT INTO task_history (task_id, user_id, field_name, old_value, new_value, change_type, description)
            VALUES (NEW.id, current_user_id, 'priority', OLD.priority, NEW.priority, 'update',
                    '修改优先级: ' || COALESCE(OLD.priority, '空') || ' → ' || COALESCE(NEW.priority, '空'));
        END IF;
        
        -- 记录截止日期变更
        IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
            INSERT INTO task_history (task_id, user_id, field_name, old_value, new_value, change_type, description)
            VALUES (NEW.id, current_user_id, 'due_date', 
                    OLD.due_date::TEXT, NEW.due_date::TEXT, 'update',
                    '修改截止日期: ' || COALESCE(OLD.due_date::TEXT, '空') || ' → ' || COALESCE(NEW.due_date::TEXT, '空'));
        END IF;

        -- 记录开始日期变更
        IF OLD.start_date IS DISTINCT FROM NEW.start_date THEN
            INSERT INTO task_history (task_id, user_id, field_name, old_value, new_value, change_type, description)
            VALUES (NEW.id, current_user_id, 'start_date', 
                    OLD.start_date::TEXT, NEW.start_date::TEXT, 'update',
                    '修改开始日期: ' || COALESCE(OLD.start_date::TEXT, '空') || ' → ' || COALESCE(NEW.start_date::TEXT, '空'));
        END IF;

        -- 记录描述变更（只记录是否修改，不记录完整内容避免过长）
        IF OLD.description IS DISTINCT FROM NEW.description THEN
            INSERT INTO task_history (task_id, user_id, field_name, old_value, new_value, change_type, description)
            VALUES (NEW.id, current_user_id, 'description', 
                    CASE WHEN OLD.description IS NULL THEN '空' ELSE '有内容' END,
                    CASE WHEN NEW.description IS NULL THEN '空' ELSE '有内容' END,
                    'update', '修改了任务描述');
        END IF;

        -- 记录进度变更
        IF OLD.progress IS DISTINCT FROM NEW.progress THEN
            INSERT INTO task_history (task_id, user_id, field_name, old_value, new_value, change_type, description)
            VALUES (NEW.id, current_user_id, 'progress', 
                    OLD.progress::TEXT, NEW.progress::TEXT, 'update',
                    '修改进度: ' || COALESCE(OLD.progress::TEXT, '0') || '% → ' || COALESCE(NEW.progress::TEXT, '0') || '%');
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. 绑定触发器到 tasks 表
DROP TRIGGER IF EXISTS task_history_trigger ON tasks;
CREATE TRIGGER task_history_trigger
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION record_task_history();

-- 5. 记录处理人变更的函数（供应用层调用）
CREATE OR REPLACE FUNCTION record_task_assignee_change(
    p_task_id UUID,
    p_user_id UUID,
    p_change_type TEXT,  -- 'add' 或 'remove'
    p_assignee_name TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO task_history (task_id, user_id, field_name, old_value, new_value, change_type, description)
    VALUES (
        p_task_id, 
        p_user_id, 
        'assignees', 
        CASE WHEN p_change_type = 'remove' THEN p_assignee_name ELSE NULL END,
        CASE WHEN p_change_type = 'add' THEN p_assignee_name ELSE NULL END,
        'update',
        CASE 
            WHEN p_change_type = 'add' THEN '添加处理人: ' || p_assignee_name
            WHEN p_change_type = 'remove' THEN '移除处理人: ' || p_assignee_name
            ELSE '修改处理人'
        END
    );
END;
$$ LANGUAGE plpgsql;

-- 6. 记录功能模块变更的函数（供应用层调用）
CREATE OR REPLACE FUNCTION record_task_module_change(
    p_task_id UUID,
    p_user_id UUID,
    p_change_type TEXT,  -- 'add' 或 'remove'
    p_module_name TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO task_history (task_id, user_id, field_name, old_value, new_value, change_type, description)
    VALUES (
        p_task_id, 
        p_user_id, 
        'modules', 
        CASE WHEN p_change_type = 'remove' THEN p_module_name ELSE NULL END,
        CASE WHEN p_change_type = 'add' THEN p_module_name ELSE NULL END,
        'update',
        CASE 
            WHEN p_change_type = 'add' THEN '添加功能模块: ' || p_module_name
            WHEN p_change_type = 'remove' THEN '移除功能模块: ' || p_module_name
            ELSE '修改功能模块'
        END
    );
END;
$$ LANGUAGE plpgsql;

-- 7. 添加注释
COMMENT ON TABLE task_history IS '任务历史记录表，记录任务的所有字段变更';
COMMENT ON COLUMN task_history.field_name IS '变更的字段名，如title/status/priority/due_date等';
COMMENT ON COLUMN task_history.change_type IS '变更类型：create/update/delete';
