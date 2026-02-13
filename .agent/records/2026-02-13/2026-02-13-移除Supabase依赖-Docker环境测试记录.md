# 移除 Supabase 依赖 - Docker 环境测试记录

## 测试时间
2026-02-13

## 测试内容

### 1. 启动基础设施服务

```bash
docker-compose up -d postgres redis minio
```

**结果**: ✅ 成功

### 2. 服务健康状态

| 服务 | 状态 | 端口 |
|------|------|------|
| PostgreSQL | healthy | 5432 |
| Redis | healthy | 6379 |
| MinIO | healthy | 9000/9001 |

### 3. 数据库表创建验证

**总表数**: 52张 ✅

```sql
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- 结果: 52
```

### 4. 初始化数据验证

| 表名 | 预期数据 | 实际数据 | 状态 |
|------|----------|----------|------|
| milestone_templates | 7条 | 7条 | ✅ |
| milestone_tasks | 26条 | 26条 | ✅ |
| app_roles | 3条 | 3条 | ✅ |
| role_permissions | 21条 | 21条 | ✅ |
| ai_roles | 1条 | 1条 | ✅ |
| storage_configs | 1条 | 1条 | ✅ |
| system_configs | 4条 | 4条 | ✅ |

**总计**: 63条初始化数据 ✅

### 5. 遇到的问题及修复

#### 问题1: milestone_tasks 外键约束错误
**错误信息**:
```
ERROR: insert or update on table "milestone_tasks" violates foreign key constraint "milestone_tasks_milestone_id_fkey"
DETAIL: Key (milestone_id)=(xxx) is not present in table "project_milestones".
```

**原因**: milestone_tasks 表的外键指向了错误的表
- 原设计: `milestone_id` -> `project_milestones(id)`
- 正确设计: `template_id` -> `milestone_templates(id)`

**修复**:
1. 修改表结构: `milestone_id` -> `template_id`
2. 修改索引: `idx_milestone_tasks_milestone_id` -> `idx_milestone_tasks_template_id`
3. 修改所有 INSERT 语句: `milestone_id` -> `template_id`

### 6. 服务访问信息

| 服务 | 访问地址 | 说明 |
|------|----------|------|
| PostgreSQL | localhost:5432 | 数据库 |
| Redis | localhost:6379 | 缓存 |
| MinIO API | localhost:9000 | 对象存储 |
| MinIO Console | http://localhost:9001 | 管理界面 |

### 7. 测试结论

✅ **Docker 环境测试通过**

- 所有服务正常启动并运行
- 52张表全部创建成功
- 63条初始化数据全部插入成功
- 无错误日志

## 下一步

可以继续进行：
1. 安装 npm 依赖并启动 API 服务
2. 测试 API 接口
3. 运行 seed 脚本创建默认管理员
