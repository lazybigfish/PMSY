# 数据迁移记录 - 2026-02-13

## 任务概述
从云端 Supabase 迁移数据到新的本地 PostgreSQL 数据库。

## 迁移配置

### 源数据库（云端 Supabase）
- URL: `https://pnvxlxvuqiikeuikowag.supabase.co`
- 使用 Service Role Key 进行全量数据读取

### 目标数据库（本地 PostgreSQL）
- Host: localhost:5432
- Database: pmsy_dev
- User: pmsy

## 迁移结果

### 成功迁移的表（4个）
1. **profiles** - 用户档案数据
2. **projects** - 项目数据
3. **project_members** - 项目成员关系
4. **tasks** - 任务数据

### 迁移失败的表及原因

| 表名 | 失败原因 | 建议处理 |
|------|----------|----------|
| project_clients | 列不存在 (client_id) | 检查 schema 差异 |
| project_suppliers | 列不存在 (supplier_id) | 检查 schema 差异 |
| milestones | 列不存在 (status) | 检查 schema 差异 |
| folders | 获取数据失败 | 表可能不存在于 Supabase |
| files | 获取数据失败 | 表可能不存在于 Supabase |
| suppliers | 列不存在 (contact_phone) | 检查 schema 差异 |
| risks | 列不存在 (status) | 检查 schema 差异 |
| reports | 列不存在 (project_id) | 检查 schema 差异 |
| notifications | 列不存在 (user_id) | 检查 schema 差异 |
| forum_posts | 违反 check 约束 (category) | category 值不在允许范围内 |
| forum_comments | 表不存在于 schema | 跳过 |
| hot_news | 列不存在 (keywords) | 检查 schema 差异 |
| clients | 列不存在 (location) | 检查 schema 差异 |
| app_roles | 主键重复 | 种子数据已存在 |
| role_permissions | 唯一约束冲突 | 种子数据已存在 |
| system_configs | 列不存在 (updated_by) | 检查 schema 差异 |

## 问题分析

### Schema 差异问题
大部分失败是因为新旧数据库的表结构存在差异：
- 新数据库的某些表缺少旧数据库中的列
- 约束条件不同（check constraints）
- 部分表在 Supabase 中不存在

### 数据重复问题
- app_roles 和 role_permissions 表在初始化时已经插入了种子数据
- 迁移脚本尝试插入重复数据导致主键冲突

## 后续建议

### 立即处理
1. 对比新旧数据库 schema，统一表结构
2. 修改迁移脚本，处理列映射关系
3. 对重复数据使用 `ON CONFLICT` 或先清空表再迁移

### 可选方案
1. **手动迁移关键数据**：对失败的表手动导出/导入
2. **调整 schema**：修改新数据库表结构以兼容旧数据
3. **重新开始**：清空新数据库，重新设计 schema 后全量迁移

## 记录时间
2026-02-13

## 命令记录
```bash
cd api-new
export SUPABASE_URL="https://pnvxlxvuqiikeuikowag.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIs..."
export DATABASE_URL="postgres://pmsy:pmsy_dev_password@localhost:5432/pmsy_dev"
node scripts/migrate-from-supabase.js
```
