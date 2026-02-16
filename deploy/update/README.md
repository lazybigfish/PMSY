# 🔄 更新部署目录 (update)

## 用途

用于**已有 PMSY 系统**的更新升级

## 适用场景

- 代码更新部署
- 前端页面更新
- API 服务更新
- 配置文件更新
- **不删除现有数据**

## ⚠️ 重要提示

**此部署保留所有现有数据！**

- 保留 PostgreSQL 数据库
- 保留 Redis 缓存
- 保留 MinIO 文件存储
- 保留所有用户数据
- 仅更新代码和配置

## 文件清单

| 文件 | 说明 |
|------|------|
| `deploy.sh` | 更新部署脚本（在开发机执行） |
| `README.md` | 本文档 |

## 部署步骤

### 方式1：使用开发机部署脚本（推荐）

```bash
# 在开发机执行
cd /path/to/pmsy
./deploy/update/deploy.sh
```

脚本会自动完成：
1. 检查环境配置
2. 构建前端
3. 构建后端 API
4. 复制文件到服务器
5. 重启服务
6. 验证部署

### 方式2：手动更新

#### 步骤1：构建前端和后端（开发机）

```bash
cd /path/to/pmsy

# 确保 config/env/.env.production 配置正确
cat config/env/.env.production | grep API_URL

# 构建前端
npm run build

# 构建后端
cd api-new && npm run build && cd ..
```

#### 步骤2：上传到服务器

```bash
# 复制前端文件
rsync -avz --delete dist/ ubuntu@YOUR_SERVER_IP:/opt/pmsy/dist/

# 复制 API 代码
rsync -avz --delete --exclude 'node_modules' api-new/ ubuntu@YOUR_SERVER_IP:/opt/pmsy/api-new/

# 复制配置文件（如有更新）
scp config/docker/docker-compose.yml ubuntu@YOUR_SERVER_IP:/opt/pmsy/
scp config/nginx/nginx.conf ubuntu@YOUR_SERVER_IP:/opt/pmsy/nginx.conf
```

#### 步骤3：重启服务（服务器）

```bash
ssh ubuntu@YOUR_SERVER_IP "cd /opt/pmsy && sudo docker-compose restart api nginx"
```

## 更新内容检查清单

更新前请确认：
- [ ] 前端代码已更新
- [ ] API 代码已更新（如有）
- [ ] 配置文件已更新（如有）
- [ ] `config/env/.env.production` 配置正确
- [ ] 已备份重要数据（建议）

## 更新后验证

- [ ] 前端页面正常显示
- [ ] 登录功能正常
- [ ] API 服务正常 (http://YOUR_SERVER_IP/api/health)
- [ ] 现有数据完整
- [ ] 现有用户可正常登录

## 注意事项

1. **不要删除数据卷**：更新时保留所有 Docker 卷
2. **环境变量**：如需修改环境变量，先修改 `.env` 再重启服务
3. **数据库迁移**：如数据库结构有变更，需要手动执行迁移脚本
4. **回滚准备**：建议更新前备份当前运行的容器和配置

## 常见问题

### Q: 更新后登录失败？

A: 检查 `config/env/.env.production` 中的 `API_URL` 是否指向正确的服务器 IP

### Q: 更新后数据丢失？

A: 确保没有删除 Docker 卷，检查 `docker volume ls` 是否有 `pmsy_postgres_data`

### Q: 如何回滚？

A: 保存更新前的 `dist` 和 `api-new` 目录，需要回滚时替换回去并重启服务

### Q: API 服务更新后不生效？

A: 尝试完全重启 API 容器：
```bash
ssh ubuntu@YOUR_SERVER_IP "cd /opt/pmsy && sudo docker-compose restart api"
```
