
-- Create system_configs table for storing global settings
CREATE TABLE IF NOT EXISTS public.system_configs (
    key text PRIMARY KEY,
    value text, -- JSON string or simple text
    description text,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS for system_configs
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;

-- Policies for system_configs
DROP POLICY IF EXISTS "Config read access" ON public.system_configs;
CREATE POLICY "Config read access" ON public.system_configs
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Config admin write access" ON public.system_configs;
CREATE POLICY "Config admin write access" ON public.system_configs
    FOR ALL TO authenticated USING (
        public.is_admin()
    );

-- Create hot_news table
CREATE TABLE IF NOT EXISTS public.hot_news (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    summary text,
    url text,
    source text,
    keywords text, -- The keyword matched
    published_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS for hot_news
ALTER TABLE public.hot_news ENABLE ROW LEVEL SECURITY;

-- Policies for hot_news
DROP POLICY IF EXISTS "News read access" ON public.hot_news;
CREATE POLICY "News read access" ON public.hot_news
    FOR SELECT TO authenticated USING (true);

-- Allow admins (or a future system role) to manage news
DROP POLICY IF EXISTS "News manage access" ON public.hot_news;
CREATE POLICY "News manage access" ON public.hot_news
    FOR ALL TO authenticated USING (
        public.is_admin()
    );

-- Create news_comments table
CREATE TABLE IF NOT EXISTS public.news_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    news_id uuid REFERENCES public.hot_news(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS for news_comments
ALTER TABLE public.news_comments ENABLE ROW LEVEL SECURITY;

-- Policies for news_comments
DROP POLICY IF EXISTS "Comments read access" ON public.news_comments;
CREATE POLICY "Comments read access" ON public.news_comments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Comments create access" ON public.news_comments;
CREATE POLICY "Comments create access" ON public.news_comments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Comments delete own" ON public.news_comments;
CREATE POLICY "Comments delete own" ON public.news_comments
    FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Insert initial config for hot topic
INSERT INTO public.system_configs (key, value, description)
VALUES ('hot_topic_keywords', '人工智能,云计算,SaaS', '首页热点新闻抓取关键词，用逗号分隔')
ON CONFLICT (key) DO NOTHING;

-- Insert some mock news for demonstration
INSERT INTO public.hot_news (title, summary, url, source, keywords, published_at)
VALUES 
('AI Agents 成为 2026 年企业软件新趋势', '最新行业报告显示，自主 AI 代理正在重塑 SaaS 行业格局，预计将为企业提升 40% 的运营效率。本文深入探讨了 Agent 在项目管理中的应用前景。', 'https://example.com/ai-news', 'TechDaily', '人工智能', now()),
('云计算成本优化指南：如何降低 30% 的云开销', '随着云原生架构的普及，云成本管理（FinOps）成为 CTO 关注的重点。专家建议通过自动化资源调度和预留实例来优化支出。', 'https://example.com/cloud-news', 'CloudInsider', '云计算', now() - interval '2 hours')
ON CONFLICT DO NOTHING;
