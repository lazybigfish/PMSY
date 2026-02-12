-- ==========================================
-- PMSY 完整数据库初始化脚本
-- 包含所有表结构和基础数据
-- ==========================================

-- Note: Using gen_random_uuid() instead of uuid-ossp extension
-- due to permission restrictions in Supabase local Docker

-- ==========================================
-- 1. 核心表结构
-- ==========================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text,
  full_name text,
  avatar_url text,
  role text default 'user',
  email text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  customer_name text,
  amount decimal(15, 2),
  description text,
  status text default 'pending',
  is_public boolean default false,
  manager_id uuid references public.profiles(id),
  current_milestone_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project Members table
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project Modules
CREATE TABLE IF NOT EXISTS public.project_modules (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  parent_id uuid references public.project_modules(id) on delete cascade,
  name text not null,
  description text,
  status text default 'not_started',
  sort_order integer default 0,
  level integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  module_id uuid references public.project_modules(id) on delete set null,
  title text not null,
  description text,
  status text default 'todo',
  priority text default 'medium',
  is_public boolean default false,
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Task Assignees
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  is_primary boolean default false,
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(task_id, user_id)
);

-- ==========================================
-- 2. 里程碑模板表
-- ==========================================

-- Template Versions
CREATE TABLE IF NOT EXISTS public.template_versions (
  id uuid default gen_random_uuid() primary key,
  version_name text not null,
  description text,
  is_active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.milestone_templates (
  id uuid default gen_random_uuid() primary key,
  version_id uuid references public.template_versions(id) on delete cascade,
  name text not null,
  description text,
  phase_order integer not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.milestone_task_templates (
  id uuid default gen_random_uuid() primary key,
  milestone_template_id uuid references public.milestone_templates(id) on delete cascade not null,
  name text not null,
  description text,
  is_required boolean default false,
  output_documents jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project Milestones
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  description text,
  status text default 'pending',
  start_date date,
  end_date date,
  phase_order integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.milestone_tasks (
  id uuid default gen_random_uuid() primary key,
  milestone_id uuid references public.project_milestones(id) on delete cascade not null,
  name text not null,
  description text,
  is_required boolean default false,
  is_completed boolean default false,
  output_documents jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 3. 供应商表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  contact_person text,
  phone text,
  email text,
  description text,
  status text default 'active',
  project_id uuid references public.projects(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.supplier_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.project_suppliers (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  supplier_id uuid references public.suppliers(id) on delete cascade not null,
  category_id uuid references public.supplier_categories(id) on delete set null,
  contract_amount decimal(15, 2),
  contract_date date,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, supplier_id)
);

-- ==========================================
-- 4. 风险管理表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.risks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  level text default 'medium',
  status text default 'open',
  owner_id uuid references public.profiles(id),
  impact text,
  mitigation_plan text,
  handling_records jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 5. 报告管理表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  type text not null,
  status text default 'draft',
  content jsonb not null,
  ai_analysis jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.report_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  config jsonb not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 6. AI 配置表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.ai_providers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  api_endpoint text,
  api_key text,
  model text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.ai_roles (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  system_prompt text not null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.ai_analysis_results (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.reports(id) on delete cascade,
  provider_id uuid references public.ai_providers(id),
  role_id uuid references public.ai_roles(id),
  result text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 7. 文件管理表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.files (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  path text not null,
  size bigint,
  mime_type text,
  project_id uuid references public.projects(id) on delete cascade,
  uploaded_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.file_relations (
  id uuid default gen_random_uuid() primary key,
  file_id uuid references public.files(id) on delete cascade not null,
  related_type text not null,
  related_id uuid not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 8. 客户管理表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  industry text,
  scale text,
  contact_name text,
  contact_phone text,
  contact_email text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.client_contacts (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null,
  position text,
  phone text,
  email text,
  is_primary boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.project_clients (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  unique(project_id, client_id)
);

-- ==========================================
-- 9. 论坛/水区表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.forum_posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  category text default 'general',
  is_pinned boolean default false,
  view_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.forum_replies (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.forum_posts(id) on delete cascade not null,
  content text not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  parent_id uuid references public.forum_replies(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.hot_news (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  summary text,
  cover_image text,
  author_id uuid references public.profiles(id) on delete set null,
  is_published boolean default false,
  published_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 10. 操作日志表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.operation_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 11. 通知表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text,
  type text default 'info',
  is_read boolean default false,
  related_type text,
  related_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 12. 角色权限表
-- ==========================================

CREATE TABLE IF NOT EXISTS public.app_roles (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role_key text REFERENCES public.app_roles(key) ON DELETE CASCADE,
  module_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_key, module_key)
);

-- ==========================================
-- 初始化数据
-- ==========================================

-- 1. 角色数据
INSERT INTO public.app_roles (key, name, description) VALUES
  ('admin', '管理员', '系统超级管理员，拥有所有权限'),
  ('manager', '项目经理', '负责项目管理和团队协作'),
  ('user', '普通用户', '参与项目执行的团队成员')
ON CONFLICT (key) DO NOTHING;

-- 2. 角色权限数据
INSERT INTO public.role_permissions (role_key, module_key) VALUES
  ('admin', 'dashboard'), ('admin', 'projects'), ('admin', 'tasks'), 
  ('admin', 'suppliers'), ('admin', 'analysis'), ('admin', 'water'), 
  ('admin', 'files'), ('admin', 'system')
ON CONFLICT (role_key, module_key) DO NOTHING;

INSERT INTO public.role_permissions (role_key, module_key) VALUES
  ('manager', 'dashboard'), ('manager', 'projects'), ('manager', 'tasks'), 
  ('manager', 'suppliers'), ('manager', 'analysis'), ('manager', 'water'), 
  ('manager', 'files')
ON CONFLICT (role_key, module_key) DO NOTHING;

INSERT INTO public.role_permissions (role_key, module_key) VALUES
  ('user', 'dashboard'), ('user', 'projects'), ('user', 'tasks'), 
  ('user', 'suppliers'), ('user', 'water'), ('user', 'files')
ON CONFLICT (role_key, module_key) DO NOTHING;

-- 3. 里程碑模板数据
-- 先插入默认版本
INSERT INTO public.template_versions (version_name, description, is_active)
VALUES ('V1.0', '系统默认版本', true)
ON CONFLICT DO NOTHING;

-- 再插入里程碑模板（关联到默认版本）
INSERT INTO public.milestone_templates (version_id, name, description, phase_order, is_active)
SELECT 
  (SELECT id FROM public.template_versions WHERE is_active = true LIMIT 1),
  name, description, phase_order, is_active
FROM (VALUES
  ('进场前阶段', '项目启动前的准备工作', 1, true),
  ('启动阶段', '项目正式启动阶段', 2, true),
  ('实施阶段', '项目主要实施阶段', 3, true),
  ('初验阶段', '初步验收阶段', 4, true),
  ('试运行阶段', '系统试运行阶段', 5, true),
  ('终验阶段', '最终验收阶段', 6, true),
  ('运维阶段', '运维移交阶段', 7, true)
) AS v(name, description, phase_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.milestone_templates WHERE name = v.name);

-- 插入里程碑任务模板数据（每个阶段的任务）
-- Phase 1: 进场前阶段
INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents)
SELECT 
  (SELECT id FROM public.milestone_templates WHERE name = '进场前阶段' AND version_id = (SELECT id FROM public.template_versions WHERE is_active = true LIMIT 1)),
  name, description, is_required, output_documents::jsonb
FROM (VALUES
  ('获取基础材料', '收集项目可研文件、项目合同', true, '[{"name": "可研文件", "required": true}, {"name": "项目合同", "required": true}]'),
  ('明确干系人', '梳理甲方负责人及联系人，输出《项目干系人清单》', true, '[{"name": "项目干系人清单", "required": true}]'),
  ('组建项目团队', '根据建设方向（自研/外采）明确团队成员，输出《项目团队成员表》', true, '[{"name": "项目团队成员表", "required": true}]'),
  ('风险与预算分析', '基于可研和合同，输出《项目风险清单》和《项目预算规划表》', true, '[{"name": "项目风险清单", "required": true}, {"name": "项目预算规划表", "required": true}]'),
  ('召开内部启动会', '整合前期材料，形成会议纪要', true, '[{"name": "内部启动会会议纪要", "required": true}]')
) AS v(name, description, is_required, output_documents)
WHERE NOT EXISTS (SELECT 1 FROM public.milestone_task_templates t 
  JOIN public.milestone_templates m ON t.milestone_template_id = m.id 
  WHERE m.name = '进场前阶段' AND t.name = v.name);

-- Phase 2: 启动阶段
INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents)
SELECT 
  (SELECT id FROM public.milestone_templates WHERE name = '启动阶段' AND version_id = (SELECT id FROM public.template_versions WHERE is_active = true LIMIT 1)),
  name, description, is_required, output_documents::jsonb
FROM (VALUES
  ('编制基础文档', '输出《项目经理授权函》《开工报审表》', true, '[{"name": "项目经理授权函", "required": true}, {"name": "开工报审表", "required": true}]'),
  ('拆解建设内容', '形成《项目实施功能清单》和《项目实施方案》', true, '[{"name": "项目实施功能清单", "required": true}, {"name": "项目实施方案", "required": true}]'),
  ('制定进度计划', '输出《项目实施计划表》', true, '[{"name": "项目实施计划表", "required": true}]'),
  ('召开项目启动会', '明确议程、参会人，最终输出《开工令》和《会议纪要》', true, '[{"name": "开工令", "required": true}, {"name": "项目启动会会议纪要", "required": true}]'),
  ('筹备服务器资源', '申请并确认资源，输出《服务器资源清单》', true, '[{"name": "服务器资源清单", "required": true}]'),
  ('供应商/硬件下单', '根据功能清单签订合同', false, '[{"name": "采购合同", "required": false}]')
) AS v(name, description, is_required, output_documents)
WHERE NOT EXISTS (SELECT 1 FROM public.milestone_task_templates t 
  JOIN public.milestone_templates m ON t.milestone_template_id = m.id 
  WHERE m.name = '启动阶段' AND t.name = v.name);

-- Phase 3: 实施阶段
INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents)
SELECT 
  (SELECT id FROM public.milestone_templates WHERE name = '实施阶段' AND version_id = (SELECT id FROM public.template_versions WHERE is_active = true LIMIT 1)),
  name, description, is_required, output_documents::jsonb
FROM (VALUES
  ('需求调研', '输出全套设计文档（需求规格、数据库设计、概要/详细设计说明书）', true, '[{"name": "需求规格说明书", "required": true}, {"name": "数据库设计说明书", "required": true}, {"name": "概要设计说明书", "required": true}, {"name": "详细设计说明书", "required": true}]'),
  ('系统部署', '在已申请服务器上部署系统，更新《服务器资源清单》', true, '[{"name": "系统部署文档", "required": true}, {"name": "服务器资源清单（更新）", "required": true}]'),
  ('第三方测评', '开展软件测试、三级等保测评、商用密码测评（均需提前三个月筹备），输出对应报告', true, '[{"name": "软件测试报告", "required": true}, {"name": "三级等保测评报告", "required": true}, {"name": "商用密码测评报告", "required": true}]'),
  ('培训与自查', '组织用户培训并记录；项目组进行功能点自查，输出《功能点验表》', true, '[{"name": "用户培训记录", "required": true}, {"name": "功能点验表", "required": true}]'),
  ('监理核查', '由监理方对功能进行核验', true, '[{"name": "监理核查报告", "required": true}]')
) AS v(name, description, is_required, output_documents)
WHERE NOT EXISTS (SELECT 1 FROM public.milestone_task_templates t 
  JOIN public.milestone_templates m ON t.milestone_template_id = m.id 
  WHERE m.name = '实施阶段' AND t.name = v.name);

-- Phase 4: 初验阶段
INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents)
SELECT 
  (SELECT id FROM public.milestone_templates WHERE name = '初验阶段' AND version_id = (SELECT id FROM public.template_versions WHERE is_active = true LIMIT 1)),
  name, description, is_required, output_documents::jsonb
FROM (VALUES
  ('整理验收文档', '编制完整的《文档目录》', true, '[{"name": "文档目录", "required": true}]'),
  ('筹备并召开初验会', '提交初验申请，形成《初步验收报告》', true, '[{"name": "初验申请", "required": true}, {"name": "初步验收报告", "required": true}]'),
  ('整改专家意见', '针对问题输出《遗留问题整改报告》', true, '[{"name": "遗留问题整改报告", "required": true}]'),
  ('上线试运行', '提交《试运行申请》，系统进入试运行期', true, '[{"name": "试运行申请", "required": true}]')
) AS v(name, description, is_required, output_documents)
WHERE NOT EXISTS (SELECT 1 FROM public.milestone_task_templates t 
  JOIN public.milestone_templates m ON t.milestone_template_id = m.id 
  WHERE m.name = '初验阶段' AND t.name = v.name);

-- Phase 5: 试运行阶段
INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents)
SELECT 
  (SELECT id FROM public.milestone_templates WHERE name = '试运行阶段' AND version_id = (SELECT id FROM public.template_versions WHERE is_active = true LIMIT 1)),
  name, description, is_required, output_documents::jsonb
FROM (VALUES
  ('试运行保障', '持续监控并记录运行情况', true, '[{"name": "试运行记录", "required": true}]'),
  ('项目结算与决算', '依次输出《结算报告》和《决算报告》', true, '[{"name": "结算报告", "required": true}, {"name": "决算报告", "required": true}]')
) AS v(name, description, is_required, output_documents)
WHERE NOT EXISTS (SELECT 1 FROM public.milestone_task_templates t 
  JOIN public.milestone_templates m ON t.milestone_template_id = m.id 
  WHERE m.name = '试运行阶段' AND t.name = v.name);

-- Phase 6: 终验阶段
INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents)
SELECT 
  (SELECT id FROM public.milestone_templates WHERE name = '终验阶段' AND version_id = (SELECT id FROM public.template_versions WHERE is_active = true LIMIT 1)),
  name, description, is_required, output_documents::jsonb
FROM (VALUES
  ('试运行总结', '输出《试运行总结报告》', true, '[{"name": "试运行总结报告", "required": true}]'),
  ('终验筹备与召开', '提交终验申请，形成《终验报告》', true, '[{"name": "终验申请", "required": true}, {"name": "终验报告", "required": true}]'),
  ('终验整改', '再次整改专家意见，更新《遗留问题整改报告》', true, '[{"name": "遗留问题整改报告（更新）", "required": true}]')
) AS v(name, description, is_required, output_documents)
WHERE NOT EXISTS (SELECT 1 FROM public.milestone_task_templates t 
  JOIN public.milestone_templates m ON t.milestone_template_id = m.id 
  WHERE m.name = '终验阶段' AND t.name = v.name);

-- Phase 7: 运维阶段
INSERT INTO public.milestone_task_templates (milestone_template_id, name, description, is_required, output_documents)
SELECT 
  (SELECT id FROM public.milestone_templates WHERE name = '运维阶段' AND version_id = (SELECT id FROM public.template_versions WHERE is_active = true LIMIT 1)),
  name, description, is_required, output_documents::jsonb
FROM (VALUES
  ('项目移交', '整理全部过程材料，输出《移交清单》，正式移交运维', true, '[{"name": "移交清单", "required": true}, {"name": "项目过程材料归档", "required": true}]')
) AS v(name, description, is_required, output_documents)
WHERE NOT EXISTS (SELECT 1 FROM public.milestone_task_templates t 
  JOIN public.milestone_templates m ON t.milestone_template_id = m.id 
  WHERE m.name = '运维阶段' AND t.name = v.name);

-- 4. AI 提供商配置
INSERT INTO public.ai_providers (name, api_endpoint, model, is_active) VALUES
  ('OpenAI', 'https://api.openai.com/v1', 'gpt-4', false),
  ('DeepSeek', 'https://api.deepseek.com/v1', 'deepseek-chat', false)
ON CONFLICT DO NOTHING;

-- 5. AI 角色配置
INSERT INTO public.ai_roles (name, description, system_prompt, is_default) VALUES
  ('项目分析师', '分析项目进度和风险', '你是一个专业的项目分析师，擅长分析项目进度、识别风险并提供建议。', true),
  ('报告撰写助手', '协助撰写项目报告', '你是一个专业的报告撰写助手，擅长整理项目信息并生成清晰的报告。', false)
ON CONFLICT DO NOTHING;

-- 6. 报告模板
INSERT INTO public.report_templates (name, config, is_active) VALUES
  ('日报模板', '{"sections": ["今日完成", "明日计划", "存在问题"]}', true),
  ('周报模板', '{"sections": ["本周总结", "下周计划", "风险预警"]}', true)
ON CONFLICT DO NOTHING;

-- 7. 供应商分类
INSERT INTO public.supplier_categories (name, description) VALUES
  ('硬件供应商', '提供服务器、网络设备等硬件'),
  ('软件供应商', '提供软件开发和系统集成服务'),
  ('服务供应商', '提供咨询、培训等服务')
ON CONFLICT DO NOTHING;

-- ==========================================
-- 启用 RLS
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS Policies
-- ==========================================

-- Profiles
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Projects
CREATE POLICY projects_select ON public.projects FOR SELECT USING (
  is_public = true OR auth.uid() = manager_id OR
  EXISTS (SELECT 1 FROM public.project_members WHERE project_id = id AND user_id = auth.uid())
);

-- Role Permissions
CREATE POLICY app_roles_all ON public.app_roles FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY role_permissions_all ON public.role_permissions FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

-- Template Versions
CREATE POLICY template_versions_read ON public.template_versions FOR SELECT TO authenticated USING (true);

-- Milestone Templates
CREATE POLICY milestone_templates_read ON public.milestone_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY milestone_task_templates_read ON public.milestone_task_templates FOR SELECT TO authenticated USING (true);

-- Project Modules & Milestones
CREATE POLICY project_modules_read ON public.project_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY project_milestones_read ON public.project_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY milestone_tasks_read ON public.milestone_tasks FOR SELECT TO authenticated USING (true);

-- Tasks
CREATE POLICY task_assignees_read ON public.task_assignees FOR SELECT TO authenticated USING (true);

-- Suppliers
CREATE POLICY suppliers_read ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY supplier_categories_read ON public.supplier_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY project_suppliers_read ON public.project_suppliers FOR SELECT TO authenticated USING (true);

-- Risks
CREATE POLICY risks_read ON public.risks FOR SELECT TO authenticated USING (true);

-- Reports
CREATE POLICY reports_read ON public.reports FOR SELECT TO authenticated USING (true);
CREATE POLICY report_templates_read ON public.report_templates FOR SELECT TO authenticated USING (true);

-- AI
CREATE POLICY ai_providers_read ON public.ai_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY ai_roles_read ON public.ai_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY ai_analysis_results_read ON public.ai_analysis_results FOR SELECT TO authenticated USING (true);

-- Files
CREATE POLICY files_read ON public.files FOR SELECT TO authenticated USING (true);
CREATE POLICY file_relations_read ON public.file_relations FOR SELECT TO authenticated USING (true);

-- Clients
CREATE POLICY clients_read ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY client_contacts_read ON public.client_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY project_clients_read ON public.project_clients FOR SELECT TO authenticated USING (true);

-- Forum
CREATE POLICY forum_posts_read ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY forum_replies_read ON public.forum_replies FOR SELECT TO authenticated USING (true);
CREATE POLICY hot_news_read ON public.hot_news FOR SELECT TO authenticated USING (true);

-- Operation Logs
CREATE POLICY operation_logs_read ON public.operation_logs FOR SELECT TO authenticated USING (true);

-- Notifications
CREATE POLICY notifications_read ON public.notifications FOR SELECT TO authenticated USING (true);

-- ==========================================
-- 授予角色基础权限（RLS 策略需要这些权限才能生效）
-- ==========================================

-- 授予 anon 角色对公共表的完整权限
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 授予 authenticated 角色对公共表的完整权限
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ==========================================
-- 完成
-- ==========================================
SELECT 'Database initialization completed successfully!' as status;
