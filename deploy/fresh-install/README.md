# 🆕 全新部署目录 (fresh-install)

## 用途

用于**全新服务器**首次部署 PMSY 系统

## 适用场景

- 新服务器首次安装
- 完全重新部署（清空所有数据）
- 从其他系统迁移到 PMSY

## ⚠️ 重要警告

**此部署会清空服务器所有现有数据！**

- 会删除现有的 PostgreSQL 数据
- 会删除现有的 Redis 缓存
- 会删除现有的 MinIO 文件存储
- 会重新初始化所有配置

## 系统架构

PMSY 使用以下服务：

| 服务 | 镜像 | 说明 |
|------|------|------|
| PostgreSQL | postgres:15-alpine | 数据库 |
| Redis | redis:7-alpine | 缓存 |
| MinIO | minio/minio:latest | 文件存储 |
| API | node:18-alpine | 后端服务 |
| Nginx | nginx:alpine | 前端服务 |

## 文件清单

| 文件 | 说明 |
|------|------|
| `deploy.sh` | 全新部署脚本（必须在开发机上执行） |
| `README.md` | 本文档 |

## 三种部署模式

根据网络环境选择最适合的部署方式：

### 模式1: 在线部署 (Online)

**适用场景**: 开发机可 SSH 连接服务器，服务器可在线拉取 Docker 镜像

**特点**:
- ✅ 开发机可 SSH 连接服务器
- ✅ 服务器可访问 Docker Hub
- 📦 只上传代码和配置（体积小）
- 🚀 Docker 镜像在线拉取（部署快）

### 模式2: 半离线部署 (Semi-Offline)

**适用场景**: 开发机可 SSH 连接服务器，但服务器无法连接 Docker Hub

**特点**:
- ✅ 开发机可 SSH 连接服务器
- ❌ 服务器无法访问 Docker Hub
- 📦 上传代码 + 配置 + Docker 镜像
- 🔄 自动导出/导入所需镜像

### 模式3: 完全离线部署 (Offline)

**适用场景**: 开发机无法 SSH 连接服务器，服务器也无法连接 Docker Hub

**特点**:
- ❌ 开发机无法 SSH 连接服务器
- ❌ 服务器无法访问 Docker Hub
- 📦 生成完整离线部署包
- 💾 手动上传到服务器后部署
- 🏗️ 支持选择服务器架构（AMD64/ARM64）

## 前置要求

### 开发机要求

- Docker（用于导出镜像）
- Node.js（用于构建前端和后端）
- SSH 客户端
- 项目完整代码

### 服务器要求

- Docker
- Docker Compose
- 足够的磁盘空间（建议 20GB+）

## 部署步骤

### 1. 准备环境

```bash
# 进入项目根目录
cd /path/to/pmsy

# 检查环境配置文件
ls -la config/env/
```

### 2. 配置环境变量

`config/env/.env.production` 是服务器部署的配置文件，部署前**必须**更新以下配置：

```bash
# 复制配置模板
cp config/env/.env.production.example config/env/.env.production

# 编辑配置文件
vim config/env/.env.production
```

**必须修改的配置项：**

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| `DB_PASSWORD` | 数据库密码 | **必须修改为强密码** |
| `JWT_SECRET` | JWT签名密钥 | **必须修改为随机字符串** |
| `MINIO_SECRET_KEY` | MinIO密钥 | **必须修改** |
| `API_URL` | API访问地址 | `http://YOUR_SERVER_IP` |

**⚠️ 安全警告：**
- 生产环境**必须**修改所有默认密码
- `JWT_SECRET` 必须使用至少32位的随机字符串
- 建议使用密码生成器生成强密码

### 3. 执行部署脚本

**⚠️ 重要：此脚本必须在开发机上执行！**

```bash
./deploy/fresh-install/deploy.sh
```

### 4. 选择部署模式

脚本会提示选择部署模式：

```
========================================
请选择部署模式:
========================================

1) 在线部署 (Online) - 服务器可联网
2) 半离线部署 (Semi-Offline) - 服务器无法访问 Docker Hub
3) 完全离线部署 (Offline) - 生成离线部署包

请输入选项 (1-3):
```

### 5. 等待部署完成

部署过程大约需要 5-15 分钟，取决于：
- 网络速度
- 服务器性能
- 选择的部署模式

## 部署后检查清单

- [ ] 前端页面正常显示 (http://YOUR_SERVER_IP)
- [ ] 登录功能正常
- [ ] API 服务正常 (http://YOUR_SERVER_IP/api/health)
- [ ] 数据库连接正常

## 默认账号

部署完成后，可以使用以下默认账号登录：

| 服务 | 账号 | 密码 |
|------|------|------|
| PMSY 管理员 | admin@pmsy.com | Willyou@2026 |

## 故障排查

### 1. 服务启动失败

```bash
# 检查服务状态
ssh user@server 'cd /opt/pmsy && sudo docker-compose ps'

# 查看日志
ssh user@server 'cd /opt/pmsy && sudo docker-compose logs --tail=50'
```

### 2. 数据库连接失败

```bash
# 检查数据库状态
ssh user@server 'cd /opt/pmsy && sudo docker-compose exec postgres pg_isready -U pmsy'

# 检查数据库日志
ssh user@server 'cd /opt/pmsy && sudo docker-compose logs postgres'
```

### 3. API 服务无法访问

```bash
# 检查 API 健康状态
curl http://YOUR_SERVER_IP/api/health

# 检查 API 日志
ssh user@server 'cd /opt/pmsy && sudo docker-compose logs api'
```

### 4. SSH 连接失败

```bash
# 手动配置 SSH
ssh-copy-id user@server

# 测试连接
ssh user@server 'echo OK'
```

## 常见问题

### Q: 为什么必须在开发机上执行？

A: 因为脚本需要：
1. 构建前端和后端（需要 Node.js 环境）
2. 导出 Docker 镜像（需要 Docker 环境）
3. 上传文件到服务器（需要 SSH）

### Q: 离线部署包可以在不同架构的服务器上使用吗？

A: 不可以。离线部署包包含特定架构的 Docker 镜像，请选择正确的架构生成部署包：
- AMD64: 大多数 Intel/AMD 服务器
- ARM64: 树莓派、Apple Silicon、ARM 服务器

### Q: 如何更新已保存的服务器配置？

A: 删除 `.env.deploy` 文件后重新运行脚本：
```bash
rm .env.deploy
./deploy/fresh-install/deploy.sh
```

## 技术支持

如有问题，请参考项目文档或联系技术支持。
