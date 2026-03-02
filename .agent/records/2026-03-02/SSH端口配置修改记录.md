# SSH 端口配置修改记录

## 修改原因

新服务器的 SSH 连接端口不是默认的 22，而是 9022，需要同步调整所有部署脚本和配置文档。

## 修改时间

2026-03-02

## 修改内容

### 1. 部署配置文件

#### .env.deploy
- **新增配置项**: `DEPLOY_SERVER_PORT=9022`
- **作用**: 存储 SSH 连接端口，供部署脚本使用

### 2. Linux/macOS 部署脚本

#### deploy/fresh-install/deploy.sh
- **新增**: 读取和保存 `DEPLOY_SERVER_PORT` 配置
- **修改**: 所有 SSH 命令添加 `-p "$DEPLOY_SERVER_PORT"` 参数
- **修改**: rsync 命令添加 `-e "ssh -p $DEPLOY_SERVER_PORT"` 参数

#### deploy/fresh-install/deploy-v2.sh
- **新增**: 读取和保存 `DEPLOY_SERVER_PORT` 配置
- **修改**: 所有 SSH 命令添加 `-p "$DEPLOY_SERVER_PORT"` 参数
- **修改**: rsync 命令添加 `-e "ssh -p $DEPLOY_SERVER_PORT"` 参数

#### deploy/update/deploy.sh
- **新增**: `SERVER_PORT="${DEPLOY_SERVER_PORT:-9022}"` 配置变量
- **修改**: 所有 SSH 命令添加 `-p "$SERVER_PORT"` 参数
- **修改**: rsync 命令添加 `-e "ssh -p $SERVER_PORT"` 参数

### 3. Windows 部署脚本

#### deploy/windows/fresh-install/deploy.ps1
- **新增**: `[string]$ServerPort = ""` 参数
- **新增**: 读取和保存 `DEPLOY_SERVER_PORT` 配置
- **修改**: 所有 SSH 命令添加 `-p $ServerPort` 参数

#### deploy/windows/update/deploy.ps1
- **新增**: `[string]$ServerPort = ""` 参数
- **新增**: `$ServerPort = "9022"` 默认配置
- **修改**: 所有 SSH 命令添加 `-p $ServerPort` 参数

### 4. 文档更新

#### 部署配置指南.md
- **新增**: `.env.deploy` 配置文件说明表格
- **修改**: SSH 命令示例添加 `-p 9022` 参数

## 配置项说明

### .env.deploy 文件

```bash
# PMSY 部署配置
DEPLOY_SERVER_IP=106.227.19.2
DEPLOY_SERVER_PORT=9022        # ← 新增：SSH 端口
DEPLOY_SERVER_USER=ubuntu
DEPLOY_REMOTE_DIR=/opt/pmsy
```

### SSH 命令变更示例

**修改前:**
```bash
ssh $DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP "echo OK"
rsync -avz --delete ./files/ $DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP:/opt/pmsy/
```

**修改后:**
```bash
ssh -p $DEPLOY_SERVER_PORT $DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP "echo OK"
rsync -avz --delete -e "ssh -p $DEPLOY_SERVER_PORT" ./files/ $DEPLOY_SERVER_USER@$DEPLOY_SERVER_IP:/opt/pmsy/
```

## 相关文件列表

- `.env.deploy`
- `deploy/fresh-install/deploy.sh`
- `deploy/fresh-install/deploy-v2.sh`
- `deploy/update/deploy.sh`
- `deploy/windows/fresh-install/deploy.ps1`
- `deploy/windows/update/deploy.ps1`
- `部署配置指南.md`

## 注意事项

1. **首次部署**: 脚本会提示输入 SSH 端口，默认为 9022
2. **环境变量**: 可以通过 `DEPLOY_SERVER_PORT` 环境变量覆盖默认端口
3. **手动连接**: 如需手动 SSH 连接服务器，请使用 `ssh -p 9022 user@server`
4. **防火墙**: 确保服务器的 9022 端口已开放
