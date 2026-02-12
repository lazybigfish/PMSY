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
- 会删除现有的用户数据
- 会删除现有的文件存储
- 会重新初始化所有配置

## 文件清单

| 文件 | 说明 |
|------|------|
| `deploy.sh` | 全新部署脚本（必须在开发机上执行） |
| `README.md` | 本文档 |
| `docker-compose.yml` | Docker 服务编排配置（引用 config/docker/docker-compose.yml） |

## 相关目录结构

```
PMSY/
├── config/                     # 配置文件目录
│   ├── docker/
│   │   ├── docker-compose.yml # Docker 编排配置
│   │   └── Dockerfile.api     # API 服务 Dockerfile
│   ├── nginx/
│   │   └── nginx.conf         # Nginx 配置文件
│   └── env/                   # 环境变量配置
│       ├── .env.example       # 开发环境示例
│       ├── .env.production    # 生产环境配置
│       └── .env.supabase      # 服务器完整配置
│
deploy/
├── fresh-install/          # 全新部署脚本和配置
│   ├── deploy.sh          # 主部署脚本
│   └── README.md          # 本文档
├── scripts/               # 部署辅助脚本
│   ├── init-supabase-roles.sql    # Supabase 角色初始化
│   ├── init-supabase-db.sh        # 数据库初始化
│   ├── create-admin-user.sh       # 管理员用户创建
│   └── ...
├── config/                # 部署配置文件
│   └── nginx.conf         # Nginx 配置文件（备用）
└── update/                # 更新部署脚本
    └── deploy.sh
```

**重要**: 所有配置文件现在都集中在 `config/` 目录内。

## 项目环境文件说明

项目配置文件位于 `config/env/` 目录：

| 文件 | 用途 | 使用场景 |
|------|------|----------|
| `config/env/.env.supabase` | **服务器完整环境配置（主要参考）** | 包含所有 Supabase 服务配置、数据库密码、JWT 密钥、API 密钥等完整配置 |
| `config/env/.env.production` | 前端生产环境配置 | 包含 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY，用于构建前端 |
| `config/env/.env.example` | 开发环境示例 | 本地开发时复制为 `.env` 使用 |
| `.env.local` | 本地开发配置 | 本地开发时的实际配置文件（在根目录） |
| `.env` | 运行时配置 | 由 `config/env/.env.supabase` 复制并修改后使用（在根目录） |

**部署时关键文件：**
- **`config/env/.env.supabase`** ⭐ **主要配置参考**: 上传到服务器后复制为 `.env`，包含完整的 Supabase 服务配置
- **`config/env/.env.production`**: 用于构建前端，必须包含正确的 `VITE_SUPABASE_URL`（指向服务器IP）

**配置关系：**
```
开发机:
  config/env/.env.supabase ──► 复制到服务器 ──► 服务器/.env
  config/env/.env.production ──► 构建前端

服务器:
  config/env/.env.supabase ──► 复制为 .env ──► 修改IP和密码后使用
```

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
- Node.js（用于构建前端）
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

#### 1.1 配置 config/env/.env.supabase（重要！）

`config/env/.env.supabase` 是服务器部署的**完整配置参考**，部署前**必须**更新以下配置：

```bash
# 编辑 config/env/.env.supabase
vim config/env/.env.supabase
```

**必须修改的配置项：**

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| `API_EXTERNAL_URL` | API外部访问地址 | `http://43.136.69.250:8000` |
| `SITE_URL` | 站点访问地址 | `http://43.136.69.250` |
| `SUPABASE_PUBLIC_URL` | Supabase公共URL | `http://43.136.69.250:8000` |
| `POSTGRES_PASSWORD` | 数据库密码 | **必须修改为强密码** |
| `JWT_SECRET` | JWT签名密钥 | **必须修改为随机字符串** |
| `DASHBOARD_PASSWORD` | Studio管理密码 | **必须修改** |
| `ROOT_USER_PASSWORD` | Root用户密码 | **必须修改** |

**⚠️ 安全警告：**
- 生产环境**必须**修改所有默认密码
- `JWT_SECRET` 必须使用至少32位的随机字符串
- 建议使用密码生成器生成强密码

#### 1.2 配置 config/env/.env.production（前端构建）

```bash
# 确保 config/env/.env.production 配置正确（用于构建前端）
cat config/env/.env.production | grep VITE_SUPABASE_URL
# 应该显示: http://YOUR_SERVER_IP:8000
```

如果不存在，脚本会自动从 `config/env/.env.supabase` 提取创建。

**配置说明：**
- `config/env/.env.production`: 前端构建配置，必须包含正确的 `VITE_SUPABASE_URL`
- `config/env/.env.supabase`: 服务器完整配置，包含数据库密码、JWT密钥等敏感信息

### 2. 执行部署脚本

**⚠️ 重要：此脚本必须在开发机上执行！**

```bash
./deploy/fresh-install/deploy.sh
```

### 3. 选择部署模式

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

根据你的网络环境选择合适的模式。

### 4. 等待部署完成

部署过程大约需要 5-15 分钟，取决于：
- 网络速度
- 服务器性能
- 选择的部署模式

部署完成后，脚本会显示访问地址和默认账号信息。

## 部署后检查清单

- [ ] 前端页面正常显示 (http://YOUR_SERVER_IP)
- [ ] 登录功能正常
- [ ] 用户创建功能正常
- [ ] Studio 管理界面可访问 (http://YOUR_SERVER_IP:3000)
- [ ] API 服务正常 (http://YOUR_SERVER_IP:8000)
- [ ] 数据库连接正常

## 默认账号

部署完成后，可以使用以下默认账号登录：

| 服务 | 账号 | 密码 |
|------|------|------|
| Studio | admin | Willyou@2026 |
| Root 用户 | admin@yourcompany.com | Willyou@2026 |
| PMSY 管理员 | admin@pmsy.com | admin123 |

## 故障排查

### 1. 数据库启动失败 (supabase-db unhealthy)

**症状**: 部署时显示 `dependency failed to start: container supabase-db is unhealthy`

**原因**: Supabase 角色未创建，导致数据库初始化脚本执行失败

**解决**:
```bash
# 1. 进入服务器
ssh user@server
cd /opt/pmsy

# 2. 手动创建角色
sudo docker-compose exec -T db psql -U postgres -c "CREATE ROLE supabase_admin WITH LOGIN SUPERUSER PASSWORD 'admin';"

# 3. 执行初始化脚本
sudo docker-compose exec -T db psql -U postgres < deploy/scripts/init-supabase-roles.sql
sudo docker-compose exec -T db psql -U postgres < supabase/volumes/db/init/00-initial-schema.sql

# 4. 重启服务
sudo docker-compose restart
```

**预防**: 最新版本的部署脚本已自动执行角色初始化，请确保使用最新脚本。

### 2. Nginx 启动失败 (nginx.conf 挂载错误)

**症状**: 显示 `mount /opt/pmsy/nginx.conf:/etc/nginx/nginx.conf: not a directory`

**原因**: nginx.conf 被错误地创建为目录而不是文件

**解决**:
```bash
# 1. 删除错误的目录
ssh user@server 'cd /opt/pmsy && sudo rm -rf nginx.conf'

# 2. 重新上传正确的文件
scp config/nginx/nginx.conf user@server:/opt/pmsy/

# 3. 重启 nginx
ssh user@server 'cd /opt/pmsy && sudo docker-compose restart nginx'
```

**预防**: 最新版本的部署脚本已从 `config/nginx/nginx.conf` 复制文件，确保文件存在。

### 3. 部署包过大

**症状**: 部署包体积异常大（超过 1GB）

**原因**: deploy/cache 目录被包含在部署包中

**解决**:
```bash
# 清理缓存目录
rm -rf .deploy-cache/*
```

**预防**: 最新版本的部署脚本已排除 cache 目录，缓存文件已移动到 `.deploy-cache/` 目录。

### 4. 服务启动但无法访问

**检查步骤**:
```bash
# 1. 检查服务状态
ssh user@server 'cd /opt/pmsy && sudo docker-compose ps'

# 2. 检查端口监听
ssh user@server 'sudo netstat -tlnp | grep -E "80|8000|3000"'

# 3. 检查防火墙
ssh user@server 'sudo ufw status'

# 4. 查看日志
ssh user@server 'cd /opt/pmsy && sudo docker-compose logs --tail=50'
```

### 5. SSH 连接失败

```bash
# 手动配置 SSH
ssh-copy-id user@server

# 测试连接
ssh user@server 'echo OK'
```

### 6. 模式选择错误

- 如果选择了在线模式但服务器无法联网，脚本会在拉取镜像时失败，请重新选择半离线模式
- 如果选择了离线模式但需要在线部署，可以取消后重新运行脚本选择其他模式

## 常见问题

### Q: 为什么必须在开发机上执行？

A: 因为脚本需要：
1. 构建前端（需要 Node.js 环境）
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
