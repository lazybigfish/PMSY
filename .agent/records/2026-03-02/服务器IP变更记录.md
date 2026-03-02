# 服务器 IP 变更记录

## 变更原因

开发环境服务器更换，从旧服务器 `43.136.69.250` 迁移到新的服务器 `106.227.19.2`。

## 变更时间

2026-03-02

## 变更内容

### 1. 部署配置文件

#### .env.deploy
- **修改前**: `DEPLOY_SERVER_IP=43.136.69.250`
- **修改后**: `DEPLOY_SERVER_IP=106.227.19.2`

### 2. 生产环境配置

#### config/env/.env.production
- **API_URL**: 
  - 修改前: `http://43.136.69.250:6969`
  - 修改后: `http://106.227.19.2:6969`
- **VITE_API_URL**:
  - 修改前: `http://43.136.69.250:6969/api`
  - 修改后: `http://106.227.19.2:6969/api`

### 3. 部署脚本默认配置

#### deploy/update/deploy.sh
- **修改前**: `SERVER_IP="${DEPLOY_SERVER_IP:-43.136.69.250}"`
- **修改后**: `SERVER_IP="${DEPLOY_SERVER_IP:-106.227.19.2}"`

#### deploy/windows/update/deploy.ps1
- **修改前**: `$ServerIp = "43.136.69.250"`
- **修改后**: `$ServerIp = "106.227.19.2"`

### 4. 文档更新

#### 部署配置指南.md
- 更新了表格中的示例 IP
- 更新了配置文件示例中的 IP 地址

## 新服务器访问地址

```
前端页面: http://106.227.19.2:6969
API 接口: http://106.227.19.2:6969/api/health
MinIO 控制台: http://106.227.19.2:9001
```

## 相关文件列表

- `.env.deploy`
- `config/env/.env.production`
- `deploy/update/deploy.sh`
- `deploy/windows/update/deploy.ps1`
- `部署配置指南.md`

## 部署注意事项

1. **首次部署到新服务器前**:
   - 确保新服务器已安装 Docker 和 Docker Compose
   - 确保新服务器的 6969 和 9001 端口已开放
   - 建议修改 `config/env/.env.production` 中的数据库密码和 JWT 密钥

2. **SSH 免密码登录**:
   - 首次运行部署脚本时需要配置 SSH 免密码登录
   - 或者手动将 SSH 公钥添加到新服务器的 `~/.ssh/authorized_keys`

3. **防火墙配置**:
   ```bash
   # 在新服务器上执行
   sudo ufw allow 6969/tcp
   sudo ufw allow 9001/tcp
   sudo ufw reload
   ```
