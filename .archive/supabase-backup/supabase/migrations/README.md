# 数据库迁移脚本

## 迁移脚本列表

| 文件名 | 说明 | 状态 |
|--------|------|------|
| 20260210200000_add_role_permissions.sql | 创建角色权限表 | ✅ 已运行 |
| 20260211000007_update_role_permissions_modules.sql | 更新角色权限模块 | 待运行 |

## 运行迁移脚本

### 方式一：手动运行

```bash
# 传输脚本到服务器
scp supabase/migrations/20260210200000_add_role_permissions.sql ubuntu@43.136.69.250:/tmp/

# 在服务器上执行
ssh ubuntu@43.136.69.250 "cd /opt/pmsy && sudo docker-compose exec -T db psql -U postgres < /tmp/20260210200000_add_role_permissions.sql"
```

### 方式二：使用 deploy.sh 自动运行（推荐）

更新 deploy.sh 脚本，在部署后自动检查并运行未执行的迁移脚本。

## 新服务器初始化步骤

如果是全新部署的服务器，需要按顺序运行所有迁移脚本：

```bash
# 1. 基础表迁移（profiles 等）
# 2. 角色权限迁移
scp supabase/migrations/20260210200000_add_role_permissions.sql ubuntu@43.136.69.250:/tmp/
ssh ubuntu@43.136.69.250 "cd /opt/pmsy && sudo docker-compose exec -T db psql -U postgres < /tmp/20260210200000_add_role_permissions.sql"

# 3. 其他迁移脚本...
```

## 故障排查

### 错误：数据库表尚未创建

**原因**：迁移脚本未运行

**解决**：
```bash
# 检查表是否存在
ssh ubuntu@43.136.69.250 "cd /opt/pmsy && sudo docker-compose exec -T db psql -U postgres -c \"\\dt public.app_roles\""

# 如果不存在，运行迁移脚本
scp supabase/migrations/20260210200000_add_role_permissions.sql ubuntu@43.136.69.250:/tmp/
ssh ubuntu@43.136.69.250 "cd /opt/pmsy && sudo docker-compose exec -T db psql -U postgres < /tmp/20260210200000_add_role_permissions.sql"
```
