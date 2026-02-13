-- 1. 创建任务模板表
CREATE TABLE IF NOT EXISTS public.milestone_task_templates (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    milestone_template_id uuid REFERENCES public.milestone_templates(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    is_required boolean DEFAULT false,
    output_documents jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for the new table
ALTER TABLE public.milestone_task_templates ENABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON public.milestone_task_templates TO authenticated;
CREATE POLICY "Enable all for authenticated users" ON public.milestone_task_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. 重置模板数据
TRUNCATE public.milestone_task_templates;
DELETE FROM public.milestone_templates;

-- 插入里程碑模板
INSERT INTO public.milestone_templates (name, phase_order) VALUES 
('进场前阶段', 1),
('启动阶段', 2),
('实施阶段', 3),
('初验阶段', 4),
('试运行阶段', 5),
('终验阶段', 6),
('运维阶段', 7);

-- 插入任务模板
WITH phase1 AS (SELECT id FROM public.milestone_templates WHERE phase_order = 1),
     phase2 AS (SELECT id FROM public.milestone_templates WHERE phase_order = 2),
     phase3 AS (SELECT id FROM public.milestone_templates WHERE phase_order = 3),
     phase4 AS (SELECT id FROM public.milestone_templates WHERE phase_order = 4),
     phase5 AS (SELECT id FROM public.milestone_templates WHERE phase_order = 5),
     phase6 AS (SELECT id FROM public.milestone_templates WHERE phase_order = 6),
     phase7 AS (SELECT id FROM public.milestone_templates WHERE phase_order = 7)
INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents) VALUES
-- Phase 1
((SELECT id FROM phase1), '获取基础材料', '收集项目可研文件、项目合同', true, '[{"name": "可研文件", "required": true}, {"name": "项目合同", "required": true}]'::jsonb),
((SELECT id FROM phase1), '明确干系人', '梳理甲方负责人及联系人，输出《项目干系人清单》', true, '[{"name": "项目干系人清单", "required": true}]'::jsonb),
((SELECT id FROM phase1), '组建项目团队', '根据建设方向（自研/外采）明确团队成员，输出《项目团队成员表》', true, '[{"name": "项目团队成员表", "required": true}]'::jsonb),
((SELECT id FROM phase1), '风险与预算分析', '基于可研和合同，输出《项目风险清单》和《项目预算规划表》', true, '[{"name": "项目风险清单", "required": true}, {"name": "项目预算规划表", "required": true}]'::jsonb),
((SELECT id FROM phase1), '召开内部启动会', '整合前期材料，形成会议纪要', true, '[{"name": "内部启动会会议纪要", "required": true}]'::jsonb),
-- Phase 2
((SELECT id FROM phase2), '编制基础文档', '输出《项目经理授权函》《开工报审表》', true, '[{"name": "项目经理授权函", "required": true}, {"name": "开工报审表", "required": true}]'::jsonb),
((SELECT id FROM phase2), '拆解建设内容', '形成《项目实施功能清单》和《项目实施方案》', true, '[{"name": "项目实施功能清单", "required": true}, {"name": "项目实施方案", "required": true}]'::jsonb),
((SELECT id FROM phase2), '制定进度计划', '输出《项目实施计划表》', true, '[{"name": "项目实施计划表", "required": true}]'::jsonb),
((SELECT id FROM phase2), '召开项目启动会', '明确议程、参会人，最终输出《开工令》和《会议纪要》', true, '[{"name": "开工令", "required": true}, {"name": "项目启动会会议纪要", "required": true}]'::jsonb),
((SELECT id FROM phase2), '筹备服务器资源', '申请并确认资源，输出《服务器资源清单》', true, '[{"name": "服务器资源清单", "required": true}]'::jsonb),
((SELECT id FROM phase2), '供应商/硬件下单', '根据功能清单签订合同', false, '[{"name": "采购合同", "required": false}]'::jsonb),
-- Phase 3
((SELECT id FROM phase3), '需求调研', '输出全套设计文档（需求规格、数据库设计、概要/详细设计说明书）', true, '[{"name": "需求规格说明书", "required": true}, {"name": "数据库设计说明书", "required": true}, {"name": "概要设计说明书", "required": true}, {"name": "详细设计说明书", "required": true}]'::jsonb),
((SELECT id FROM phase3), '系统部署', '在已申请服务器上部署系统，更新《服务器资源清单》', true, '[{"name": "系统部署文档", "required": true}, {"name": "服务器资源清单（更新）", "required": true}]'::jsonb),
((SELECT id FROM phase3), '第三方测评', '开展软件测试、三级等保测评、商用密码测评（均需提前三个月筹备），输出对应报告', true, '[{"name": "软件测试报告", "required": true}, {"name": "三级等保测评报告", "required": true}, {"name": "商用密码测评报告", "required": true}]'::jsonb),
((SELECT id FROM phase3), '培训与自查', '组织用户培训并记录；项目组进行功能点自查，输出《功能点验表》', true, '[{"name": "用户培训记录", "required": true}, {"name": "功能点验表", "required": true}]'::jsonb),
((SELECT id FROM phase3), '监理核查', '由监理方对功能进行核验', true, '[{"name": "监理核查报告", "required": true}]'::jsonb),
-- Phase 4
((SELECT id FROM phase4), '整理验收文档', '编制完整的《文档目录》', true, '[{"name": "文档目录", "required": true}]'::jsonb),
((SELECT id FROM phase4), '筹备并召开初验会', '提交初验申请，形成《初步验收报告》', true, '[{"name": "初验申请", "required": true}, {"name": "初步验收报告", "required": true}]'::jsonb),
((SELECT id FROM phase4), '整改专家意见', '针对问题输出《遗留问题整改报告》', true, '[{"name": "遗留问题整改报告", "required": true}]'::jsonb),
((SELECT id FROM phase4), '上线试运行', '提交《试运行申请》，系统进入试运行期', true, '[{"name": "试运行申请", "required": true}]'::jsonb),
-- Phase 5
((SELECT id FROM phase5), '试运行保障', '持续监控并记录运行情况', true, '[{"name": "试运行记录", "required": true}]'::jsonb),
((SELECT id FROM phase5), '项目结算与决算', '依次输出《结算报告》和《决算报告》', true, '[{"name": "结算报告", "required": true}, {"name": "决算报告", "required": true}]'::jsonb),
-- Phase 6
((SELECT id FROM phase6), '试运行总结', '输出《试运行总结报告》', true, '[{"name": "试运行总结报告", "required": true}]'::jsonb),
((SELECT id FROM phase6), '终验筹备与召开', '提交终验申请，形成《终验报告》', true, '[{"name": "终验申请", "required": true}, {"name": "终验报告", "required": true}]'::jsonb),
((SELECT id FROM phase6), '终验整改', '再次整改专家意见，更新《遗留问题整改报告》', true, '[{"name": "遗留问题整改报告（更新）", "required": true}]'::jsonb),
-- Phase 7
((SELECT id FROM phase7), '项目移交', '整理全部过程材料，输出《移交清单》，正式移交运维', true, '[{"name": "移交清单", "required": true}, {"name": "项目过程材料归档", "required": true}]'::jsonb);

-- 3. 创建初始化函数
CREATE OR REPLACE FUNCTION public.handle_new_project_milestones()
RETURNS trigger AS $$
DECLARE
    template_record RECORD;
    new_milestone_id UUID;
    first_phase_id UUID;
BEGIN
    -- 遍历里程碑模板，按顺序插入
    FOR template_record IN 
        SELECT * FROM public.milestone_templates ORDER BY phase_order ASC
    LOOP
        -- 插入项目里程碑
        INSERT INTO public.project_milestones (project_id, name, description, phase_order, status)
        VALUES (
            NEW.id, 
            template_record.name, 
            template_record.description, 
            template_record.phase_order,
            CASE WHEN template_record.phase_order = 1 THEN 'in_progress' ELSE 'pending' END
        )
        RETURNING id INTO new_milestone_id;

        -- 如果是第一个阶段，记录ID以便更新项目当前阶段
        IF template_record.phase_order = 1 THEN
            first_phase_id := new_milestone_id;
        END IF;

        -- 插入对应的任务
        INSERT INTO public.milestone_tasks (milestone_id, name, description, is_required, output_documents)
        SELECT 
            new_milestone_id,
            name,
            description,
            is_required,
            output_documents
        FROM public.milestone_task_templates
        WHERE milestone_template_id = template_record.id;
    END LOOP;

    -- 更新项目的当前阶段
    UPDATE public.projects SET current_milestone_id = first_phase_id WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建触发器
DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_new_project_milestones();
