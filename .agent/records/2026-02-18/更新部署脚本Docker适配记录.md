# 更新部署脚本 Docker 适配记录

## 日期
2026-02-18

## 调整原因
服务器上的 PostgreSQL 是 Docker 容器运行的，原有的迁移脚本使用本地 `psql` 连接，需要调整为支持 Docker 容器内执行。

## 调整内容

### 1. 迁移脚本适配 (api-new/database/migrate.sh)

**新增功能：**
- 支持多种执行模式：`--docker-compose`、`--docker`、`--local`
- 自动检测执行模式（默认）
- 使用 `docker-compose exec` 或 `docker exec` 执行 SQL

**执行模式优先级：**
1. `docker-compose` - 优先使用 docker-compose exec（推荐）
2. `docker` - 使用 docker exec 直接访问容器
3. `local` - 使用本地 psql 客户端

**使用方法：**
```bash
# 自动检测（推荐）
./database/migrate.sh

# 强制使用 docker-compose
./database/migrate.sh --docker-compose

# 强制使用 docker
./database/migrate.sh --docker

# 强制使用本地 psql
./database/migrate.sh --local
```

### 2. 部署脚本调整 (deploy/update/deploy.sh)

**调整内容：**
- 步骤 6 使用 `--docker-compose` 模式执行迁移
- 移除本地环境变量传递（Docker 模式不需要）
- 优化错误提示，提供调试命令

**部署流程：**
```bash
# 执行更新部署
./deploy/update/deploy.sh

# 部署脚本会自动：
# 1. 构建前端代码
# 2. 构建后端代码
# 3. 复制文件到服务器
# 4. 使用 Docker 执行数据库迁移
# 5. 重启服务
# 6. 验证部署
```

## 文件变更清单

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| api-new/database/migrate.sh | 修改 | 支持 Docker 容器执行 |
| deploy/update/deploy.sh | 修改 | 使用 Docker 模式执行迁移 |

## 手动调试命令

### 查看迁移状态
```bash
ssh ubuntu@43.136.69.250
cd /opt/pmsy
sudo docker-compose exec postgres psql -U pmsy -d pmsy -c "
    SELECT filename, executed_at, execution_time_ms 
    FROM schema_migrations 
    ORDER BY executed_at DESC;
"
```

### 手动执行迁移
```bash
ssh ubuntu@43.136.69.250
cd /opt/pmsy
bash api-new/database/migrate.sh --docker-compose
```

### 查看 PostgreSQL 日志
```bash
ssh ubuntu@43.136.69.250
cd /opt/pmsy
sudo docker-compose logs postgres
```

### 进入 PostgreSQL 容器
```bash
ssh ubuntu@43.136.69.250
cd /opt/pmsy
sudo docker-compose exec postgres psql -U pmsy -d pmsy
```

## 注意事项

1. **Docker 容器必须运行** - 执行迁移前确保 postgres 容器已启动
2. **权限问题** - 确保当前用户有 docker 执行权限
3. **网络连接** - 确保容器间网络正常
4. **数据卷挂载** - 确保 migrations 目录正确挂载到容器

## 故障排查

### 问题：无法连接到数据库
**检查步骤：**
```bash
# 1. 检查容器是否运行
docker ps | grep pmsy-postgres

# 2. 检查容器日志
docker-compose logs postgres

# 3. 手动测试连接
docker-compose exec postgres psql -U pmsy -d pmsy -c "SELECT 1"
```

### 问题：迁移执行失败
**检查步骤：**
```bash
# 1. 查看详细错误
cd /opt/pmsy
bash api-new/database/migrate.sh --docker-compose

# 2. 检查 SQL 文件语法
docker-compose exec -T postgres psql -U pmsy -d pmsy < api-new/database/migrations/xxx.sql

# 3. 查看 PostgreSQL 日志
docker-compose logs postgres | tail -50
```

## 后续优化建议

1. **健康检查** - 迁移前自动检查 PostgreSQL 容器健康状态
2. **备份机制** - 执行迁移前自动备份数据库
3. **并发控制** - 防止多个部署同时执行迁移
4. **迁移预览** - 执行前显示将要执行的变更
