-- 创建 milestone_task_templates 表（里程碑任务模板）
CREATE TABLE IF NOT EXISTS milestone_task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_template_id UUID REFERENCES milestone_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    output_documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_milestone_task_templates_milestone_id ON milestone_task_templates(milestone_template_id);
CREATE INDEX IF NOT EXISTS idx_milestone_task_templates_sort_order ON milestone_task_templates(sort_order);

-- 创建更新时间戳触发器
CREATE TRIGGER update_milestone_task_templates_updated_at
    BEFORE UPDATE ON milestone_task_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 template_versions 表（模板版本）
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    version_number TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_template_versions_is_active ON template_versions(is_active);

-- 添加唯一约束
ALTER TABLE template_versions 
ADD CONSTRAINT template_versions_version_number_unique UNIQUE (version_number);

-- 创建更新时间戳触发器
CREATE TRIGGER update_template_versions_updated_at
    BEFORE UPDATE ON template_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为 milestone_templates 添加 version_id 字段
ALTER TABLE milestone_templates ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES template_versions(id);

-- 创建设置激活版本的函数
CREATE OR REPLACE FUNCTION set_active_template_version(target_version_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 先将所有版本设为非激活
    UPDATE template_versions 
    SET is_active = false,
        updated_at = NOW();
    
    -- 将指定版本设为激活
    UPDATE template_versions 
    SET is_active = true,
        updated_at = NOW()
    WHERE id = target_version_id;
END;
$$ LANGUAGE plpgsql;

-- 插入默认版本
INSERT INTO template_versions (id, name, version_number, description, is_active, created_at, updated_at)
SELECT 
    '26001b88-f99b-4784-9300-4f2b5f650274',
    '标准项目里程碑模板 v1.0',
    '1.0.0',
    '适用于一般项目的标准里程碑流程模板',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM template_versions WHERE id = '26001b88-f99b-4784-9300-4f2b5f650274'
);

-- 插入默认里程碑模板和任务
DO $$
DECLARE
    v_version_id UUID := '26001b88-f99b-4784-9300-4f2b5f650274';
    v_milestone_id UUID;
BEGIN
    -- 进场前阶段
    IF NOT EXISTS (SELECT 1 FROM milestone_templates WHERE name = '进场前阶段' AND version_id = v_version_id) THEN
        INSERT INTO milestone_templates (id, version_id, name, phase_order, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), v_version_id, '进场前阶段', 1, true, NOW(), NOW())
        RETURNING id INTO v_milestone_id;
        
        INSERT INTO milestone_task_templates (milestone_template_id, name, description, is_required, output_documents, created_at, updated_at) VALUES
        (v_milestone_id, '获取基础材料', '收集项目可研文件、项目合同', true, '[{"name":"可研文件","required":true},{"name":"项目合同","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '明确干系人', '梳理甲方负责人及联系人，输出《项目干系人清单》', true, '[{"name":"项目干系人清单","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '组建项目团队', '根据建设方向（自研/外采）明确团队成员，输出《项目团队成员表》', true, '[{"name":"项目团队成员表","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '风险与预算分析', '基于可研和合同，输出《项目风险清单》和《项目预算规划表》', true, '[{"name":"项目风险清单","required":true},{"name":"项目预算规划表","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '召开内部启动会', '整合前期材料，形成会议纪要', true, '[{"name":"内部启动会会议纪要","required":true}]'::jsonb, NOW(), NOW());
    END IF;

    -- 启动阶段
    IF NOT EXISTS (SELECT 1 FROM milestone_templates WHERE name = '启动阶段' AND version_id = v_version_id) THEN
        INSERT INTO milestone_templates (id, version_id, name, phase_order, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), v_version_id, '启动阶段', 2, true, NOW(), NOW())
        RETURNING id INTO v_milestone_id;
        
        INSERT INTO milestone_task_templates (milestone_template_id, name, description, is_required, output_documents, created_at, updated_at) VALUES
        (v_milestone_id, '编制基础文档', '输出《项目经理授权函》《开工报审表》', true, '[{"name":"项目经理授权函","required":true},{"name":"开工报审表","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '拆解建设内容', '形成《项目实施功能清单》和《项目实施方案》', true, '[{"name":"项目实施功能清单","required":true},{"name":"项目实施方案","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '制定进度计划', '输出《项目实施计划表》', true, '[{"name":"项目实施计划表","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '召开项目启动会', '明确议程、参会人，最终输出《开工令》和《会议纪要》', true, '[{"name":"开工令","required":true},{"name":"项目启动会会议纪要","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '筹备服务器资源', '申请并确认资源，输出《服务器资源清单》', true, '[{"name":"服务器资源清单","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '供应商/硬件下单', '根据功能清单签订合同', false, '[{"name":"采购合同","required":false}]'::jsonb, NOW(), NOW());
    END IF;

    -- 实施阶段
    IF NOT EXISTS (SELECT 1 FROM milestone_templates WHERE name = '实施阶段' AND version_id = v_version_id) THEN
        INSERT INTO milestone_templates (id, version_id, name, phase_order, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), v_version_id, '实施阶段', 3, true, NOW(), NOW())
        RETURNING id INTO v_milestone_id;
        
        INSERT INTO milestone_task_templates (milestone_template_id, name, description, is_required, output_documents, created_at, updated_at) VALUES
        (v_milestone_id, '需求调研', '输出全套设计文档（需求规格、数据库设计、概要/详细设计说明书）', true, '[{"name":"需求规格说明书","required":true},{"name":"数据库设计说明书","required":true},{"name":"概要设计说明书","required":true},{"name":"详细设计说明书","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '系统部署', '在已申请服务器上部署系统，更新《服务器资源清单》', true, '[{"name":"系统部署文档","required":true},{"name":"服务器资源清单（更新）","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '第三方测评', '开展软件测试、三级等保测评、商用密码测评（均需提前三个月筹备），输出对应报告', true, '[{"name":"软件测试报告","required":true},{"name":"三级等保测评报告","required":true},{"name":"商用密码测评报告","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '培训与自查', '组织用户培训并记录；项目组进行功能点自查，输出《功能点验表》', true, '[{"name":"用户培训记录","required":true},{"name":"功能点验表","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '监理核查', '由监理方对功能进行核验', true, '[{"name":"监理核查报告","required":true}]'::jsonb, NOW(), NOW());
    END IF;

    -- 初验阶段
    IF NOT EXISTS (SELECT 1 FROM milestone_templates WHERE name = '初验阶段' AND version_id = v_version_id) THEN
        INSERT INTO milestone_templates (id, version_id, name, phase_order, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), v_version_id, '初验阶段', 4, true, NOW(), NOW())
        RETURNING id INTO v_milestone_id;
        
        INSERT INTO milestone_task_templates (milestone_template_id, name, description, is_required, output_documents, created_at, updated_at) VALUES
        (v_milestone_id, '整理验收文档', '编制完整的《文档目录》', true, '[{"name":"文档目录","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '筹备并召开初验会', '提交初验申请，形成《初步验收报告》', true, '[{"name":"初验申请","required":true},{"name":"初步验收报告","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '整改专家意见', '针对问题输出《遗留问题整改报告》', true, '[{"name":"遗留问题整改报告","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '上线试运行', '提交《试运行申请》，系统进入试运行期', true, '[{"name":"试运行申请","required":true}]'::jsonb, NOW(), NOW());
    END IF;

    -- 试运行阶段
    IF NOT EXISTS (SELECT 1 FROM milestone_templates WHERE name = '试运行阶段' AND version_id = v_version_id) THEN
        INSERT INTO milestone_templates (id, version_id, name, phase_order, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), v_version_id, '试运行阶段', 5, true, NOW(), NOW())
        RETURNING id INTO v_milestone_id;
        
        INSERT INTO milestone_task_templates (milestone_template_id, name, description, is_required, output_documents, created_at, updated_at) VALUES
        (v_milestone_id, '试运行保障', '持续监控并记录运行情况', true, '[{"name":"试运行记录","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '项目结算与决算', '依次输出《结算报告》和《决算报告》', true, '[{"name":"结算报告","required":true},{"name":"决算报告","required":true}]'::jsonb, NOW(), NOW());
    END IF;

    -- 终验阶段
    IF NOT EXISTS (SELECT 1 FROM milestone_templates WHERE name = '终验阶段' AND version_id = v_version_id) THEN
        INSERT INTO milestone_templates (id, version_id, name, phase_order, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), v_version_id, '终验阶段', 6, true, NOW(), NOW())
        RETURNING id INTO v_milestone_id;
        
        INSERT INTO milestone_task_templates (milestone_template_id, name, description, is_required, output_documents, created_at, updated_at) VALUES
        (v_milestone_id, '试运行总结', '输出《试运行总结报告》', true, '[{"name":"试运行总结报告","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '终验筹备与召开', '提交终验申请，形成《终验报告》', true, '[{"name":"终验申请","required":true},{"name":"终验报告","required":true}]'::jsonb, NOW(), NOW()),
        (v_milestone_id, '终验整改', '再次整改专家意见，更新《遗留问题整改报告》', true, '[{"name":"遗留问题整改报告（更新）","required":true}]'::jsonb, NOW(), NOW());
    END IF;

    -- 运维阶段
    IF NOT EXISTS (SELECT 1 FROM milestone_templates WHERE name = '运维阶段' AND version_id = v_version_id) THEN
        INSERT INTO milestone_templates (id, version_id, name, phase_order, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), v_version_id, '运维阶段', 7, true, NOW(), NOW())
        RETURNING id INTO v_milestone_id;
        
        INSERT INTO milestone_task_templates (milestone_template_id, name, description, is_required, output_documents, created_at, updated_at) VALUES
        (v_milestone_id, '项目移交', '整理全部过程材料，输出《移交清单》，正式移交运维', true, '[{"name":"移交清单","required":true},{"name":"项目过程材料归档","required":true}]'::jsonb, NOW(), NOW());
    END IF;
END $$;

-- 添加 milestone_tasks.template_id 的外键约束（在 milestone_task_templates 表创建后）
-- 注意：先清理无效的 template_id 值，再添加外键约束
DO $$
BEGIN
    -- 清理无效的 template_id 值（设置为 NULL）
    UPDATE milestone_tasks 
    SET template_id = NULL 
    WHERE template_id IS NOT NULL 
    AND template_id NOT IN (SELECT id FROM milestone_task_templates);
    
    -- 添加外键约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'milestone_tasks_template_id_fkey' 
        AND table_name = 'milestone_tasks'
    ) THEN
        ALTER TABLE milestone_tasks 
        ADD CONSTRAINT milestone_tasks_template_id_fkey 
        FOREIGN KEY (template_id) REFERENCES milestone_task_templates(id) ON DELETE SET NULL;
    END IF;
END $$;
