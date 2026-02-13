-- 创建 milestone_templates 表
CREATE TABLE IF NOT EXISTS milestone_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    phase_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_milestone_templates_phase_order ON milestone_templates(phase_order);
CREATE INDEX IF NOT EXISTS idx_milestone_templates_is_active ON milestone_templates(is_active);

-- 创建 project_milestones 表
CREATE TABLE IF NOT EXISTS project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES milestone_templates(id),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    start_date DATE,
    end_date DATE,
    phase_order INTEGER NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones(status);
CREATE INDEX IF NOT EXISTS idx_project_milestones_phase_order ON project_milestones(phase_order);
CREATE INDEX IF NOT EXISTS idx_project_milestones_is_current ON project_milestones(is_current);

-- 创建更新时间戳触发器
CREATE TRIGGER update_project_milestones_updated_at
    BEFORE UPDATE ON project_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建 milestone_tasks 表
CREATE TABLE IF NOT EXISTS milestone_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES milestone_templates(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    output_documents JSONB DEFAULT '[]'::jsonb,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_template_id ON milestone_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_is_completed ON milestone_tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_is_required ON milestone_tasks(is_required);

-- 创建更新时间戳触发器
CREATE TRIGGER update_milestone_tasks_updated_at
    BEFORE UPDATE ON milestone_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入默认里程碑模板（7个阶段）
INSERT INTO milestone_templates (name, phase_order) VALUES
    ('进场前阶段', 1),
    ('启动阶段', 2),
    ('实施阶段', 3),
    ('初验阶段', 4),
    ('试运行阶段', 5),
    ('终验阶段', 6),
    ('运维阶段', 7)
ON CONFLICT DO NOTHING;

-- 插入默认里程碑任务（每个阶段的任务）
-- 进场前阶段任务
INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '获取基础材料', '收集项目可研文件、项目合同', true, '[{"name": "可研文件", "required": true}, {"name": "项目合同", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 1;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '明确干系人', '梳理甲方负责人及联系人，输出《项目干系人清单》', true, '[{"name": "项目干系人清单", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 1;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '组建项目团队', '根据建设方向（自研/外采）明确团队成员，输出《项目团队成员表》', true, '[{"name": "项目团队成员表", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 1;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '风险与预算分析', '基于可研和合同，输出《项目风险清单》和《项目预算规划表》', true, '[{"name": "项目风险清单", "required": true}, {"name": "项目预算规划表", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 1;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '召开内部启动会', '整合前期材料，形成会议纪要', true, '[{"name": "内部启动会会议纪要", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 1;

-- 启动阶段任务
INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '编制基础文档', '输出《项目经理授权函》《开工报审表》', true, '[{"name": "项目经理授权函", "required": true}, {"name": "开工报审表", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 2;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '拆解建设内容', '形成《项目实施功能清单》和《项目实施方案》', true, '[{"name": "项目实施功能清单", "required": true}, {"name": "项目实施方案", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 2;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '制定进度计划', '输出《项目实施计划表》', true, '[{"name": "项目实施计划表", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 2;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '召开项目启动会', '明确议程、参会人，最终输出《开工令》和《会议纪要》', true, '[{"name": "开工令", "required": true}, {"name": "项目启动会会议纪要", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 2;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '筹备服务器资源', '申请并确认资源，输出《服务器资源清单》', true, '[{"name": "服务器资源清单", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 2;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '供应商/硬件下单', '根据功能清单签订合同', false, '[{"name": "采购合同", "required": false}]'::jsonb
FROM milestone_templates WHERE phase_order = 2;

-- 实施阶段任务
INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '需求调研', '输出全套设计文档（需求规格、数据库设计、概要/详细设计说明书）', true, '[{"name": "需求规格说明书", "required": true}, {"name": "数据库设计说明书", "required": true}, {"name": "概要设计说明书", "required": true}, {"name": "详细设计说明书", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 3;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '系统部署', '在已申请服务器上部署系统，更新《服务器资源清单》', true, '[{"name": "系统部署文档", "required": true}, {"name": "服务器资源清单（更新）", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 3;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '第三方测评', '开展软件测试、三级等保测评、商用密码测评（均需提前三个月筹备），输出对应报告', true, '[{"name": "软件测试报告", "required": true}, {"name": "三级等保测评报告", "required": true}, {"name": "商用密码测评报告", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 3;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '培训与自查', '组织用户培训并记录；项目组进行功能点自查，输出《功能点验表》', true, '[{"name": "用户培训记录", "required": true}, {"name": "功能点验表", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 3;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '监理核查', '由监理方对功能进行核验', true, '[{"name": "监理核查报告", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 3;

-- 初验阶段任务
INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '整理验收文档', '编制完整的《文档目录》', true, '[{"name": "文档目录", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 4;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '筹备并召开初验会', '提交初验申请，形成《初步验收报告》', true, '[{"name": "初验申请", "required": true}, {"name": "初步验收报告", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 4;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '整改专家意见', '针对问题输出《遗留问题整改报告》', true, '[{"name": "遗留问题整改报告", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 4;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '上线试运行', '提交《试运行申请》，系统进入试运行期', true, '[{"name": "试运行申请", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 4;

-- 试运行阶段任务
INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '试运行保障', '持续监控并记录运行情况', true, '[{"name": "试运行记录", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 5;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '项目结算与决算', '依次输出《结算报告》和《决算报告》', true, '[{"name": "结算报告", "required": true}, {"name": "决算报告", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 5;

-- 终验阶段任务
INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '试运行总结', '输出《试运行总结报告》', true, '[{"name": "试运行总结报告", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 6;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '终验筹备与召开', '提交终验申请，形成《终验报告》', true, '[{"name": "终验申请", "required": true}, {"name": "终验报告", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 6;

INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '终验整改', '再次整改专家意见，更新《遗留问题整改报告》', true, '[{"name": "遗留问题整改报告（更新）", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 6;

-- 运维阶段任务
INSERT INTO milestone_tasks (template_id, name, description, is_required, output_documents)
SELECT id, '项目移交', '整理全部过程材料，输出《移交清单》，正式移交运维', true, '[{"name": "移交清单", "required": true}, {"name": "项目过程材料归档", "required": true}]'::jsonb
FROM milestone_templates WHERE phase_order = 7;
