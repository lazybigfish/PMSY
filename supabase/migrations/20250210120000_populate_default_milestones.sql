-- Populate Active Milestone Template with Default 7 Stages

DO $$
DECLARE
    active_version_id UUID;
    phase1_id UUID;
    phase2_id UUID;
    phase3_id UUID;
    phase4_id UUID;
    phase5_id UUID;
    phase6_id UUID;
    phase7_id UUID;
BEGIN
    -- 0. Ensure table exists (failsafe)
    CREATE TABLE IF NOT EXISTS public.milestone_task_templates (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        milestone_template_id uuid REFERENCES public.milestone_templates(id) ON DELETE CASCADE NOT NULL,
        name text NOT NULL,
        description text,
        is_required boolean DEFAULT false,
        output_documents jsonb DEFAULT '[]'::jsonb,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 1. Get the current active version ID
    SELECT id INTO active_version_id FROM public.template_versions WHERE is_active = true LIMIT 1;

    -- If no active version, create one
    IF active_version_id IS NULL THEN
        INSERT INTO public.template_versions (version_name, description, is_active)
        VALUES ('V1.0', 'Initial System Version', true)
        RETURNING id INTO active_version_id;
    END IF;

    -- 2. Clear existing templates for this version to avoid duplicates
    DELETE FROM public.milestone_templates WHERE version_id = active_version_id;

    -- 3. Insert Milestone Templates
    INSERT INTO public.milestone_templates (version_id, name, phase_order) VALUES 
    (active_version_id, '进场前阶段', 1) RETURNING id INTO phase1_id;
    
    INSERT INTO public.milestone_templates (version_id, name, phase_order) VALUES 
    (active_version_id, '启动阶段', 2) RETURNING id INTO phase2_id;
    
    INSERT INTO public.milestone_templates (version_id, name, phase_order) VALUES 
    (active_version_id, '实施阶段', 3) RETURNING id INTO phase3_id;
    
    INSERT INTO public.milestone_templates (version_id, name, phase_order) VALUES 
    (active_version_id, '初验阶段', 4) RETURNING id INTO phase4_id;
    
    INSERT INTO public.milestone_templates (version_id, name, phase_order) VALUES 
    (active_version_id, '试运行阶段', 5) RETURNING id INTO phase5_id;
    
    INSERT INTO public.milestone_templates (version_id, name, phase_order) VALUES 
    (active_version_id, '终验阶段', 6) RETURNING id INTO phase6_id;
    
    INSERT INTO public.milestone_templates (version_id, name, phase_order) VALUES 
    (active_version_id, '运维阶段', 7) RETURNING id INTO phase7_id;

    -- 4. Insert Task Templates
    
    -- Phase 1
    INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents) VALUES
    (phase1_id, '获取基础材料', '收集项目可研文件、项目合同', true, '[{"name": "可研文件", "required": true}, {"name": "项目合同", "required": true}]'::jsonb),
    (phase1_id, '明确干系人', '梳理甲方负责人及联系人，输出《项目干系人清单》', true, '[{"name": "项目干系人清单", "required": true}]'::jsonb),
    (phase1_id, '组建项目团队', '根据建设方向（自研/外采）明确团队成员，输出《项目团队成员表》', true, '[{"name": "项目团队成员表", "required": true}]'::jsonb),
    (phase1_id, '风险与预算分析', '基于可研和合同，输出《项目风险清单》和《项目预算规划表》', true, '[{"name": "项目风险清单", "required": true}, {"name": "项目预算规划表", "required": true}]'::jsonb),
    (phase1_id, '召开内部启动会', '整合前期材料，形成会议纪要', true, '[{"name": "内部启动会会议纪要", "required": true}]'::jsonb);

    -- Phase 2
    INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents) VALUES
    (phase2_id, '编制基础文档', '输出《项目经理授权函》《开工报审表》', true, '[{"name": "项目经理授权函", "required": true}, {"name": "开工报审表", "required": true}]'::jsonb),
    (phase2_id, '拆解建设内容', '形成《项目实施功能清单》和《项目实施方案》', true, '[{"name": "项目实施功能清单", "required": true}, {"name": "项目实施方案", "required": true}]'::jsonb),
    (phase2_id, '制定进度计划', '输出《项目实施计划表》', true, '[{"name": "项目实施计划表", "required": true}]'::jsonb),
    (phase2_id, '召开项目启动会', '明确议程、参会人，最终输出《开工令》和《会议纪要》', true, '[{"name": "开工令", "required": true}, {"name": "项目启动会会议纪要", "required": true}]'::jsonb),
    (phase2_id, '筹备服务器资源', '申请并确认资源，输出《服务器资源清单》', true, '[{"name": "服务器资源清单", "required": true}]'::jsonb),
    (phase2_id, '供应商/硬件下单', '根据功能清单签订合同', false, '[{"name": "采购合同", "required": false}]'::jsonb);

    -- Phase 3
    INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents) VALUES
    (phase3_id, '需求调研', '输出全套设计文档（需求规格、数据库设计、概要/详细设计说明书）', true, '[{"name": "需求规格说明书", "required": true}, {"name": "数据库设计说明书", "required": true}, {"name": "概要设计说明书", "required": true}, {"name": "详细设计说明书", "required": true}]'::jsonb),
    (phase3_id, '系统部署', '在已申请服务器上部署系统，更新《服务器资源清单》', true, '[{"name": "系统部署文档", "required": true}, {"name": "服务器资源清单（更新）", "required": true}]'::jsonb),
    (phase3_id, '第三方测评', '开展软件测试、三级等保测评、商用密码测评（均需提前三个月筹备），输出对应报告', true, '[{"name": "软件测试报告", "required": true}, {"name": "三级等保测评报告", "required": true}, {"name": "商用密码测评报告", "required": true}]'::jsonb),
    (phase3_id, '培训与自查', '组织用户培训并记录；项目组进行功能点自查，输出《功能点验表》', true, '[{"name": "用户培训记录", "required": true}, {"name": "功能点验表", "required": true}]'::jsonb),
    (phase3_id, '监理核查', '由监理方对功能进行核验', true, '[{"name": "监理核查报告", "required": true}]'::jsonb);

    -- Phase 4
    INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents) VALUES
    (phase4_id, '整理验收文档', '编制完整的《文档目录》', true, '[{"name": "文档目录", "required": true}]'::jsonb),
    (phase4_id, '筹备并召开初验会', '提交初验申请，形成《初步验收报告》', true, '[{"name": "初验申请", "required": true}, {"name": "初步验收报告", "required": true}]'::jsonb),
    (phase4_id, '整改专家意见', '针对问题输出《遗留问题整改报告》', true, '[{"name": "遗留问题整改报告", "required": true}]'::jsonb),
    (phase4_id, '上线试运行', '提交《试运行申请》，系统进入试运行期', true, '[{"name": "试运行申请", "required": true}]'::jsonb);

    -- Phase 5
    INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents) VALUES
    (phase5_id, '试运行保障', '持续监控并记录运行情况', true, '[{"name": "试运行记录", "required": true}]'::jsonb),
    (phase5_id, '项目结算与决算', '依次输出《结算报告》和《决算报告》', true, '[{"name": "结算报告", "required": true}, {"name": "决算报告", "required": true}]'::jsonb);

    -- Phase 6
    INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents) VALUES
    (phase6_id, '试运行总结', '输出《试运行总结报告》', true, '[{"name": "试运行总结报告", "required": true}]'::jsonb),
    (phase6_id, '终验筹备与召开', '提交终验申请，形成《终验报告》', true, '[{"name": "终验申请", "required": true}, {"name": "终验报告", "required": true}]'::jsonb),
    (phase6_id, '终验整改', '再次整改专家意见，更新《遗留问题整改报告》', true, '[{"name": "遗留问题整改报告（更新）", "required": true}]'::jsonb);

    -- Phase 7
    INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents) VALUES
    (phase7_id, '项目移交', '整理全部过程材料，输出《移交清单》，正式移交运维', true, '[{"name": "移交清单", "required": true}, {"name": "项目过程材料归档", "required": true}]'::jsonb);

END $$;
