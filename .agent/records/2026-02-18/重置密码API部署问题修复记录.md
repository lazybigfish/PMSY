# 重置密码 API 部署问题修复记录

## 问题描述

服务器环境调用重置密码 API 返回 404 错误：

```
POST http://43.136.69.250/auth/v1/admin/users/{userId}/reset-password 404 (Not Found)
```

## 问题分析

### 1. 后端代码检查

- 文件：`api-new/src/routes/auth.ts`
- 路由已正确定义（第 352-375 行）：
  ```typescript
  router.post('/admin/users/:id/reset-password', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    // ... 重置密码逻辑
  });
  ```
- 结论：**后端代码没有问题**

### 2. 部署脚本检查

发现问题：`deploy/update/deploy.sh` 脚本在部署后端时，**只复制了构建产物 `dist` 目录，但没有复制构建 Docker 镜像所需的 `package.json` 和 `Dockerfile`**。

具体代码（第 140-152 行）：
```bash
echo "   复制后端 dist..."
rsync -avz --delete "$PROJECT_ROOT/api-new/dist/" "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/api-new/dist/"
# ❌ 缺少：复制 package.json 和 Dockerfile
```

同时，`docker-compose.yml` 中 API 服务配置：
```yaml
api:
  image: pmsy-api:latest
  # ❌ 缺少 build 配置，无法自动构建新镜像
```

### 3. 根本原因

1. 服务器上的 Docker 镜像 `pmsy-api:latest` 是旧版本，不包含重置密码 API
2. 部署脚本虽然执行了 `docker-compose up -d --build --force-recreate api`，但由于缺少 `build` 配置和构建文件，无法构建新镜像
3. 容器一直使用旧镜像运行，导致新 API 无法访问

## 修复方案

### 修复 1：更新部署脚本

文件：`deploy/update/deploy.sh`

添加复制 `package.json` 和 `Dockerfile` 的步骤：

```bash
echo "   复制后端 package.json..."
scp "$PROJECT_ROOT/api-new/package.json" "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/api-new/"
echo "   复制后端 Dockerfile..."
scp "$PROJECT_ROOT/api-new/Dockerfile" "$SERVER_USER@$SERVER_IP:$DEPLOY_DIR/api-new/"
```

### 修复 2：更新 docker-compose.yml

文件：`config/docker/docker-compose.yml`

添加 `build` 配置：

```yaml
api:
  image: pmsy-api:latest
  build:
    context: ./api-new
    dockerfile: Dockerfile
  container_name: pmsy-api
```

## 验证步骤

修复后，重新执行部署脚本：

```bash
./deploy/update/deploy.sh
```

部署完成后，验证 API 是否可用：

```bash
# 检查路由是否存在
curl -X POST http://43.136.69.250/auth/v1/admin/users/{userId}/reset-password \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"mode": "random"}'
```

## 总结

| 项目 | 内容 |
|-----|------|
| 问题类型 | 部署脚本缺陷 |
| 影响范围 | 后端 API 更新无法生效 |
| 根本原因 | 缺少 Docker 构建所需的文件复制 |
| 修复文件 | `deploy/update/deploy.sh`、`config/docker/docker-compose.yml` |

## 预防措施

1. 部署脚本应确保所有构建所需文件都被复制到服务器
2. docker-compose.yml 应包含 `build` 配置，确保 `--build` 参数生效
3. 部署完成后应验证关键 API 是否可用
