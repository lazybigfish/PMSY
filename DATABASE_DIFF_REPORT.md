# 数据库差异检查报告

## 检查时间
2026-02-11

## 服务器环境 (本地 Docker)
**表数量**: 8 张表

### 已存在的表
1. app_roles ✅
2. notifications ✅
3. profiles ✅
4. project_members ✅
5. projects ✅
6. role_permissions ✅
7. schema_migrations ✅
8. tasks ✅

### 缺失的表 (共 25 张)

#### 核心功能表
| 表名 | 说明 | 优先级 |
|------|------|--------|
| project_modules | 项目功能模块 | 🔴 高 |
| milestone_templates | 里程碑模板 | 🔴 高 |
| project_milestones | 项目里程碑实例 | 🔴 高 |
| milestone_tasks | 里程碑任务 | 🔴 高 |
| task_assignees | 任务处理人 | 🟡 中 |

#### 供应商管理
| 表名 | 说明 | 优先级 |
|------|------|--------|
| suppliers | 供应商 | 🔴 高 |
| supplier_categories | 供应商分类 | 🟡 中 |
| supplier_evaluation_criteria | 评估标准 | 🟡 中 |
| supplier_evaluations | 评估记录 | 🟡 中 |
| supplier_payment_plans | 付款计划 | 🟡 中 |
| payment_vouchers | 付款凭证 | 🟡 中 |

#### 风险管理
| 表名 | 说明 | 优先级 |
|------|------|--------|
| risks | 风险 | 🟡 中 |

#### 报告管理
| 表名 | 说明 | 优先级 |
|------|------|--------|
| reports | 报告 | 🟡 中 |
| report_templates | 报告模板 | 🟡 中 |

#### AI 配置
| 表名 | 说明 | 优先级 |
|------|------|--------|
| ai_providers | AI 提供商 | 🟢 低 |
| ai_roles | AI 角色 | 🟢 低 |
| ai_analysis_results | AI 分析结果 | 🟢 低 |

#### 文件管理
| 表名 | 说明 | 优先级 |
|------|------|--------|
| files | 文件 | 🟡 中 |
| file_relations | 文件关联 | 🟡 中 |

#### 客户管理
| 表名 | 说明 | 优先级 |
|------|------|--------|
| clients | 客户 | 🟡 中 |
| client_contacts | 客户联系人 | 🟡 中 |

#### 论坛/水区
| 表名 | 说明 | 优先级 |
|------|------|--------|
| forum_posts | 论坛帖子 | 🟢 低 |
| forum_replies | 论坛回复 | 🟢 低 |
| hot_news | 热点新闻 | 🟢 低 |

#### 操作日志
| 表名 | 说明 | 优先级 |
|------|------|--------|
| operation_logs | 操作日志 | 🟢 低 |

#### 任务进度
| 表名 | 说明 | 优先级 |
|------|------|--------|
| task_progress_updates | 任务进度更新 | 🟡 中 |

---

## 缺失的初始化数据

### 1. 里程碑模板数据 (milestone_templates)
**状态**: 表不存在，数据缺失
**影响**: 系统配置中的里程碑模板为空
**来源文件**: `20250210120000_populate_default_milestones.sql`

### 2. AI 提供商配置 (ai_providers)
**状态**: 表不存在，数据缺失
**影响**: AI 分析功能无法使用

### 3. AI 角色配置 (ai_roles)
**状态**: 表不存在，数据缺失
**影响**: AI 分析功能无法使用

### 4. 报告模板 (report_templates)
**状态**: 表不存在，数据缺失
**影响**: 日报/周报功能无法使用

---

## 根因分析

### 问题 1: 初始化脚本不完整
服务器部署时只运行了部分迁移脚本：
- ✅ `20250209000000_init_schema.sql` - 创建了基础表
- ❌ 其他迁移脚本未运行

### 问题 2: 部署流程缺陷
`deploy/scripts/init-database-simple.sql` 只包含基础表结构，缺少：
- 里程碑模板表
- 供应商相关表
- AI 配置表
- 文件管理表
- 等等...

---

## 修复方案

### 方案 A: 运行所有缺失的迁移脚本（推荐）

按顺序运行以下迁移脚本：

```bash
# 1. 核心功能表
supabase/migrations/20250209000000_init_schema.sql
supabase/migrations/20250210120000_populate_default_milestones.sql

# 2. 供应商模块
supabase/migrations/20250209150000_enhance_supplier_module.sql
supabase/migrations/20250209160000_complete_supplier_module.sql
supabase/migrations/20250209143000_create_project_suppliers.sql
supabase/migrations/20260211000008_add_supplier_payment_plans.sql
supabase/migrations/20260211000010_fix_supplier_payment_plans.sql
supabase/migrations/20260211000011_check_and_fix_payment_plans.sql
supabase/migrations/20260211000009_add_payment_vouchers_bucket.sql

# 3. 文件系统
supabase/migrations/20260211000004_add_file_system.sql
supabase/migrations/20260211000005_add_file_relations.sql
supabase/migrations/20260211000006_add_files_module_permissions.sql
supabase/migrations/20260211000019_create_task_attachments_bucket.sql
supabase/migrations/20260211000021_add_task_attachments_bucket_policies.sql

# 4. 客户管理
supabase/migrations/20260211000001_create_client_tables.sql

# 5. 水区/论坛
supabase/migrations/20260211000000_add_water_module.sql
supabase/migrations/20260211000001_fix_forum_rls.sql
supabase/migrations/20260210233000_hot_news_admin_config.sql

# 6. AI 配置
supabase/migrations/20250209000004_mock_data.sql  # 包含 AI 配置

# 7. 操作日志
supabase/migrations/20260211000002_add_operation_logs.sql

# 8. 任务进度
supabase/migrations/20260211000018_add_task_progress_updates.sql
supabase/migrations/20260211000020_fix_task_progress_permissions.sql

# 9. 其他修复和增强
supabase/migrations/20250209000001_add_task_details_and_notifications.sql
supabase/migrations/20250209000002_fix_task_assignees.sql
supabase/migrations/20250209000003_notification_triggers.sql
supabase/migrations/20250209120000_fix_milestones_init.sql
supabase/migrations/20250209130000_add_username_login.sql
supabase/migrations/20250209133000_fix_trigger_and_promote_root.sql
supabase/migrations/20250209140000_confirm_root_email.sql
supabase/migrations/20250209170000_enhance_task_detail.sql
supabase/migrations/20250210000000_add_is_custom_flag.sql
supabase/migrations/20250210100000_add_milestone_versioning.sql
supabase/migrations/20250210110000_fix_empty_versions.sql
supabase/migrations/20250210130000_fix_version_switching.sql
supabase/migrations/20250210140000_clean_test_data.sql
supabase/migrations/20250210150000_fix_null_owners.sql
supabase/migrations/20260210210000_strict_rls_policies.sql
supabase/migrations/20260210220000_fix_rls_visibility.sql
supabase/migrations/20260210230000_add_dashboard_features.sql
supabase/migrations/20260211000003_add_admin_policies.sql
supabase/migrations/20260211000007_update_role_permissions_modules.sql
supabase/migrations/20260211000012_fix_milestone_name.sql
supabase/migrations/20260211000013_drop_unused_columns.sql
supabase/migrations/20260211000014_add_milestone_task_completion_fields.sql
supabase/migrations/20260211000015_add_project_modules_progress.sql
supabase/migrations/20260211000016_add_reorder_milestones_function.sql
supabase/migrations/20260211000017_update_stakeholders_permissions.sql
```

### 方案 B: 创建完整的初始化脚本

创建一个新的 `init-database-complete.sql`，包含所有表结构和初始数据。

---

## 建议

1. **短期修复**: 按方案 A 运行缺失的迁移脚本
2. **长期改进**: 更新 `deploy/scripts/init-database-simple.sql` 为完整版本
3. **预防措施**: 更新 `deploy/scripts/deploy.sh` 自动运行所有迁移脚本

---

*报告生成时间: 2026-02-11*
