# PMSY 部署脚本更新日志

## v2.0 - 自动数据库初始化

### 🎉 重大改进

#### 1. 自动数据库初始化
- **问题**: 首次部署后需要手动执行多个 SQL 脚本创建数据库表
- **解决**: 服务器端部署脚本现在会自动检测并初始化数据库

**自动检测逻辑**:
```bash
# 检查 auth schema 是否存在
if [ "$AUTH_EXISTS" = "no" ]; then
    自动执行 init-supabase-db.sh
fi

# 检查应用表是否存在
if [ "$TABLES_EXIST" = "no" ]; then
    自动执行 init-database-simple.sql
fi
```

#### 2. 部署包包含数据库脚本
- `prepare-deploy.sh` 现在会自动复制：
  - `supabase/migrations/*.sql` - 数据库迁移文件
  - `deploy/scripts/init-database-simple.sql` - 应用表初始化脚本
  - `deploy/scripts/init-supabase-db.sh` - Supabase Auth 初始化脚本

- `transfer-to-server.sh` 会自动传输这些文件到服务器

#### 3. 改进的数据库初始化脚本
**`init-database-simple.sql`**:
- 使用 `gen_random_uuid()` 替代 `uuid_generate_v4()`
  - 原因：Supabase PostgreSQL 镜像不支持 `uuid-ossp` 扩展
- 创建核心表：profiles, projects, project_members, tasks, notifications
- 自动创建管理员用户：
  - 邮箱: admin@pmsy.com
  - 密码: admin123
  - 角色: admin

### 📁 更新的文件

| 文件 | 更新内容 |
|------|----------|
| `deploy/scripts/prepare-deploy.sh` | 添加复制 migrations 和初始化脚本的逻辑 |
| `deploy/scripts/transfer-to-server.sh` | 添加传输 migrations 和初始化脚本的逻辑 |
| `deploy/scripts/deploy.sh` | 添加自动数据库初始化检测和执行 |
| `deploy/scripts/init-database-simple.sql` | 新增简化版数据库初始化脚本 |
| `deploy.sh` (根目录) | 改进菜单 10，支持两种初始化类型 |
| `deploy/README.md` | 更新文档，说明自动初始化功能 |
| `deploy/docs/DEPLOY_TROUBLESHOOTING.md` | 添加数据库表初始化说明 |

### 🚀 使用方式

#### 方式一：全自动部署（推荐）
```bash
./deploy.sh
# 选择 4) 完整部署 或 5) 快速部署
```
部署完成后，数据库会自动初始化，无需任何额外操作。

#### 方式二：手动初始化
如果自动初始化失败，可以手动执行：
```bash
./deploy.sh
# 选择 10) 初始化数据库
# 然后选择 1) 初始化 Supabase Auth 或 2) 初始化应用数据库表
```

### ⚠️ 已知限制

1. **PostgreSQL 扩展限制**
   - Supabase PostgreSQL 镜像不支持 `uuid-ossp` 扩展
   - 使用 `gen_random_uuid()` 替代 `uuid_generate_v4()`

2. **密码哈希限制**
   - Supabase PostgreSQL 镜像不支持 `pgcrypto` 扩展的 `crypt` 和 `gen_salt` 函数
   - 使用预计算的 bcrypt 哈希值

3. **Policy 语法限制**
   - `CREATE POLICY IF NOT EXISTS` 语法在某些 PostgreSQL 版本不支持
   - 不影响核心功能，只是会显示警告

### ✅ 测试验证

- [x] 首次部署自动初始化数据库
- [x] 管理员账号自动创建
- [x] 应用表正确创建
- [x] RLS 策略正确配置
- [x] 权限正确授予
- [x] 重复部署不会重复创建表（幂等性）

### 📝 管理员账号

部署完成后，可以使用以下账号登录：

```
邮箱: admin@pmsy.com
密码: admin123
角色: admin
```

**建议**: 首次登录后请立即修改密码。

---

## v1.0 - 初始版本

### 功能
- 支持 AMD64/ARM64 双架构
- 本地缓存机制
- SSH Key 和密码两种认证方式
- 本地上传和服务器拉取两种镜像获取方式
- 一键部署脚本

### 问题
- 首次部署后需要手动初始化数据库
- 需要手动创建管理员账号
- 需要手动执行多个 SQL 脚本
