# PMSY 部署问题排查指南

本文档记录部署过程中可能遇到的问题及解决方案。

## 快速修复（推荐）

首次部署后如果遇到数据库相关问题，可以直接运行自动化初始化脚本：

```bash
# 方式一：在本地运行（通过 SSH 在服务器上执行）
./deploy.sh
# 选择 10) 初始化 Supabase 数据库
# 然后选择 1) 在本地运行

# 方式二：在服务器上直接运行
cd /opt/pmsy
sudo ./deploy/scripts/init-supabase-db.sh
```

此脚本会自动检查并修复以下问题：
- 创建 auth schema
- 创建数据库角色 (anon, authenticated, service_role)
- 创建 MFA 相关类型和表
- 创建 auth 函数
- 重启相关服务

### 数据库表初始化

如果应用表未创建，使用简化版初始化脚本：

```bash
cd /opt/pmsy
sudo docker-compose exec -T db psql -U postgres < init-database-simple.sql
```

**注意**：Supabase PostgreSQL 镜像不支持 `uuid-ossp` 扩展，需要使用 `gen_random_uuid()` 替代 `uuid_generate_v4()`。

## 常见问题（手动修复）

### 1. Auth 服务启动失败

**错误信息：**
```
ERROR: schema "auth" does not exist
```

**原因：**
Supabase 的数据库初始化不完整，缺少 auth schema。

**解决方案：**
```bash
# 在服务器上执行
sudo docker-compose exec -T db psql -U postgres -c "CREATE SCHEMA IF NOT EXISTS auth;"
sudo docker-compose restart auth
```

### 2. Auth 迁移失败 - 缺少类型

**错误信息：**
```
ERROR: type "auth.factor_type" does not exist
```

**解决方案：**
```bash
# 创建所需的数据库类型
sudo docker-compose exec -T db psql -U postgres -c "CREATE TYPE auth.factor_type AS ENUM ('totp', 'phone');"
sudo docker-compose exec -T db psql -U postgres -c "CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');"

# 创建 MFA 相关表
sudo docker-compose exec -T db psql -U postgres -c "
CREATE TABLE IF NOT EXISTS auth.mfa_factors (
    id uuid NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friendly_name text NULL,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    secret text NULL,
    phone text NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
    id uuid NOT NULL PRIMARY KEY,
    factor_id uuid NOT NULL REFERENCES auth.mfa_factors(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    verified_at timestamptz NULL,
    ip_address inet NULL,
    otp_code text NULL
);
"

# 重启 auth 服务
sudo docker-compose restart auth
```

### 3. Storage 服务启动失败

**错误信息：**
```
role "anon" does not exist
```

**解决方案：**
```bash
# 创建所需的数据库角色
sudo docker-compose exec -T db psql -U postgres -c "CREATE ROLE anon;"
sudo docker-compose exec -T db psql -U postgres -c "CREATE ROLE authenticated;"
sudo docker-compose exec -T db psql -U postgres -c "CREATE ROLE service_role;"

# 重启 storage 服务
sudo docker-compose restart storage
```

### 4. Kong 配置错误

**错误信息：**
```
error parsing declarative config file /home/kong/kong.yml
```

**原因：**
Kong 镜像缺少初始化模板文件 `~/temp.yml`。

**解决方案：**
Kong 是可选组件，不影响 PMSY 核心功能。如需使用，请参考 Supabase 官方文档手动配置。

### 5. Studio 启动失败

**错误信息：**
```
Error: Cannot find module '/app/server.js'
```

**原因：**
Supabase Studio 镜像版本与 entrypoint 配置不匹配。

**解决方案：**
Studio 是可选的管理界面，不影响 PMSY 核心功能。如需使用，建议：
1. 使用 Supabase 官方提供的 Studio 镜像
2. 或者使用 `npx supabase@latest studio` 本地启动

## 部署后检查清单

### 核心服务（必须正常运行）
- [ ] pmsy-api - API 服务
- [ ] pmsy-nginx - 反向代理
- [ ] supabase-db - PostgreSQL 数据库
- [ ] supabase-auth - 认证服务
- [ ] supabase-rest - PostgREST API

### 可选服务（不影响核心功能）
- [ ] supabase-kong - API 网关
- [ ] supabase-realtime - 实时功能
- [ ] supabase-storage - 文件存储
- [ ] supabase-studio - 管理界面

## 验证部署

```bash
# 检查所有服务状态
sudo docker-compose ps

# 检查核心服务日志
sudo docker-compose logs api nginx db auth rest

# 测试应用访问
curl http://localhost:80
```

## 访问地址

- **PMSY 应用**: http://<服务器IP>
- **API 服务**: http://<服务器IP>/api
- **Supabase Studio**: http://<服务器IP>:3000 (如已启用)

## 获取帮助

如遇到本文档未覆盖的问题，请：
1. 查看服务日志：`sudo docker-compose logs <服务名>`
2. 检查 Docker 状态：`sudo docker ps -a`
3. 参考 Supabase 官方文档：https://supabase.com/docs
