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
- 保留所有用户数据
- 保留现有配置
- 仅更新代码和配置

## 文件清单

| 文件 | 说明 |
|------|------|
| `deploy.sh` | 更新部署脚本（在开发机执行） |
| `update-server.sh` | 服务器更新脚本（在服务器执行） |
| `docker-compose.yml` | 服务配置（可选更新） |

## 部署步骤

### 方式1：使用开发机部署脚本（推荐）

```bash
# 在开发机执行
cd /path/to/pmsy
./deploy/update/deploy.sh
```

脚本会自动完成：
1. 检查环境配置
2. 构建前端（使用 .env.production）
3. 验证构建结果
4. 复制文件到服务器
5. 重启服务
6. 验证部署

### 方式2：手动更新

#### 步骤1：构建前端（开发机）
```bash
cd /path/to/pmsy

# 确保 .env.production 配置正确
cat .env.production | grep VITE_SUPABASE_URL

# 构建前端
npm run build

# 验证构建结果
grep "YOUR_SERVER_IP:8000" dist/assets/*.js
```

#### 步骤2：上传到服务器
```bash
# 复制前端文件
scp -r dist ubuntu@YOUR_SERVER_IP:/opt/pmsy/

# 复制 API 代码（如有更新）
scp -r api ubuntu@YOUR_SERVER_IP:/opt/pmsy/

# 复制配置文件（如有更新）
scp docker-compose.yml ubuntu@YOUR_SERVER_IP:/opt/pmsy/
```

#### 步骤3：重启服务（服务器）
```bash
ssh ubuntu@YOUR_SERVER_IP "cd /opt/pmsy && sudo docker-compose restart"
```

## 更新内容检查清单

更新前请确认：
- [ ] 前端代码已更新
- [ ] API 代码已更新（如有）
- [ ] 配置文件已更新（如有）
- [ ] `.env.production` 配置正确
- [ ] 已备份重要数据（建议）

## 更新后验证

- [ ] 前端页面正常显示
- [ ] 登录功能正常
- [ ] 用户创建功能正常
- [ ] 现有数据完整
- [ ] 现有用户可正常登录

## 注意事项

1. **不要删除数据卷**：更新时保留 `postgres_data` 和 `storage_data`
2. **环境变量**：如需修改环境变量，先修改 `.env` 再重启服务
3. **数据库迁移**：如数据库结构有变更，需要手动执行迁移脚本
4. **回滚准备**：建议更新前备份当前运行的容器和配置

## 常见问题

### Q: 更新后登录失败？
A: 检查 `.env.production` 中的 `VITE_SUPABASE_URL` 是否指向正确的服务器 IP

### Q: 更新后数据丢失？
A: 确保没有删除 Docker 卷，检查 `docker volume ls` 是否有 `pmsy_postgres_data`

### Q: 如何回滚？
A: 保存更新前的 `dist` 和 `api` 目录，需要回滚时替换回去并重启服务
