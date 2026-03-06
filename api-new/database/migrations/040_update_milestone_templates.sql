-- 里程碑模板功能升级迁移脚本
-- 创建日期: 2026-03-05
-- 说明: 为里程碑模板添加系统模板、公开/私有、标签等字段

-- ============================================
-- 1. 为 milestone_templates 表添加新字段
-- ============================================

-- 是否系统模板（系统内置，不可删除）
ALTER TABLE milestone_templates 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- 是否公开（所有用户可见）
ALTER TABLE milestone_templates 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 是否自定义模板（用户创建的模板）
ALTER TABLE milestone_templates 
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;

-- 标签数组
ALTER TABLE milestone_templates 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 创建者ID
ALTER TABLE milestone_templates 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- ============================================
-- 2. 为 template_versions 表添加新字段
-- ============================================

-- 是否系统模板
ALTER TABLE template_versions
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- 是否公开
ALTER TABLE template_versions
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 标签数组
ALTER TABLE template_versions
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 使用次数统计
ALTER TABLE template_versions
ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

-- ============================================
-- 3. 为 project_milestones 表添加初始化来源字段
-- ============================================

-- 初始化来源: 'template' | 'custom' | null
ALTER TABLE project_milestones
ADD COLUMN IF NOT EXISTS init_source VARCHAR(50);

-- ============================================
-- 4. 更新现有数据：将现有模板标记为公开模板
-- ============================================
-- 说明：现有模板作为公开模板，供所有用户在初始化时选择使用
-- 系统模板（is_system=true）由管理员后续手动设置

-- 更新 milestone_templates 表
UPDATE milestone_templates 
SET is_system = false,      -- 不是系统模板，是用户创建的公开模板
    is_public = true,       -- 公开可见
    is_custom = false       -- 不是自定义模板（是标准模板）
WHERE is_system IS NULL;

-- 更新 template_versions 表
UPDATE template_versions 
SET is_system = false,      -- 不是系统模板
    is_public = true        -- 公开可见
WHERE is_system IS NULL;

-- ============================================
-- 5. 创建标签表
-- ============================================

CREATE TABLE IF NOT EXISTS milestone_template_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3B82F6',
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 添加表注释
COMMENT ON TABLE milestone_template_tags IS '里程碑模板标签表';
COMMENT ON COLUMN milestone_template_tags.name IS '标签名称';
COMMENT ON COLUMN milestone_template_tags.color IS '标签颜色';
COMMENT ON COLUMN milestone_template_tags.usage_count IS '使用次数';

-- ============================================
-- 6. 创建索引
-- ============================================

-- milestone_templates 表索引
CREATE INDEX IF NOT EXISTS idx_milestone_templates_is_system 
ON milestone_templates(is_system);

CREATE INDEX IF NOT EXISTS idx_milestone_templates_is_public 
ON milestone_templates(is_public);

CREATE INDEX IF NOT EXISTS idx_milestone_templates_is_custom 
ON milestone_templates(is_custom);

CREATE INDEX IF NOT EXISTS idx_milestone_templates_created_by 
ON milestone_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_milestone_templates_is_active 
ON milestone_templates(is_active);

-- GIN 索引用于标签数组查询
CREATE INDEX IF NOT EXISTS idx_milestone_templates_tags 
ON milestone_templates USING GIN(tags);

-- template_versions 表索引
CREATE INDEX IF NOT EXISTS idx_template_versions_is_system 
ON template_versions(is_system);

CREATE INDEX IF NOT EXISTS idx_template_versions_is_public 
ON template_versions(is_public);

CREATE INDEX IF NOT EXISTS idx_template_versions_is_active 
ON template_versions(is_active);

-- project_milestones 表索引
CREATE INDEX IF NOT EXISTS idx_project_milestones_init_source 
ON project_milestones(init_source);

-- ============================================
-- 7. 插入默认标签（可选）
-- ============================================

-- 插入一些常用的默认标签
INSERT INTO milestone_template_tags (name, color, description) VALUES
('政府项目', '#3B82F6', '适用于政府类项目'),
('软件开发', '#10B981', '适用于软件开发项目'),
('工程建设', '#F59E0B', '适用于工程建设项目'),
('敏捷开发', '#8B5CF6', '适用于敏捷开发项目'),
('标准流程', '#6B7280', '标准项目流程模板')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 8. 验证迁移结果
-- ============================================

-- 检查 milestone_templates 表的公开模板标记
DO $$
DECLARE
    v_public_count INTEGER;
    v_total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_count FROM milestone_templates;
    SELECT COUNT(*) INTO v_public_count FROM milestone_templates WHERE is_public = true;
    
    RAISE NOTICE 'milestone_templates 表: 总计 % 条记录, 其中公开模板 % 条', v_total_count, v_public_count;
END $$;

-- 检查 template_versions 表的公开模板标记
DO $$
DECLARE
    v_public_count INTEGER;
    v_total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_count FROM template_versions;
    SELECT COUNT(*) INTO v_public_count FROM template_versions WHERE is_public = true;
    
    RAISE NOTICE 'template_versions 表: 总计 % 条记录, 其中公开模板 % 条', v_total_count, v_public_count;
END $$;

-- 迁移完成提示
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '里程碑模板功能升级迁移完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '新增字段:';
    RAISE NOTICE '  - milestone_templates: is_system, is_public, is_custom, tags, created_by';
    RAISE NOTICE '  - template_versions: is_system, is_public, tags, use_count';
    RAISE NOTICE '  - project_milestones: init_source';
    RAISE NOTICE '新增表:';
    RAISE NOTICE '  - milestone_template_tags';
    RAISE NOTICE '========================================';
END $$;
