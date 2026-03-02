# Git 忽略配置修改记录

## 修改原因

生产环境配置文件包含敏感信息（数据库密码、JWT 密钥、服务器 IP、SSH 端口等），不应该提交到 Git 仓库。

## 修改时间

2026-03-02

## 修改内容

### 1. 更新 .gitignore 文件

#### 新增忽略规则

```gitignore
# Environment variables - 所有环境配置文件都不应该提交到 Git
.env
.env.*
!.env.example
!.env.deploy.example

# 部署配置文件（包含服务器IP、SSH端口等敏感信息）
.env.deploy

# 生产环境配置（包含数据库密码、JWT密钥等敏感信息）
config/env/.env.production

# 本地开发环境配置
.env.local
.env.*.local
.env.backup.*
```

#### 规则说明

| 规则 | 说明 |
|------|------|
| `.env` | 忽略根目录的 .env 文件 |
| `.env.*` | 忽略所有 .env. 开头的文件 |
| `!.env.example` | 但不忽略 .env.example（示例文件） |
| `!.env.deploy.example` | 但不忽略 .env.deploy.example（示例文件） |
| `.env.deploy` | 忽略部署配置文件 |
| `config/env/.env.production` | 忽略生产环境配置 |
| `.env.backup.*` | 忽略备份的环境配置文件 |

### 2. 从 Git 历史中移除敏感文件

已从 Git 暂存区移除以下敏感文件：

- `.env.backup.development` - 开发环境备份配置
- `.env.deploy` - 部署配置（包含服务器IP、SSH端口）
- `config/env/.env.production` - 生产环境配置（包含数据库密码、JWT密钥）

**注意**：这些文件仍保留在本地工作目录中，只是不再被 Git 跟踪。

## 本地保留的文件

以下文件在本地仍然存在，但不会被提交到 Git：

```
.env.deploy                      # 部署配置
config/env/.env.production       # 生产环境配置
.env.backup.development          # 开发环境备份
```

## 提交到 Git 的示例文件

以下示例文件仍然保留在 Git 中，作为配置参考：

```
.env                             # 如果存在示例内容
config/env/.env.example          # 环境配置示例
api-new/.env.example             # API 环境配置示例
```

## 注意事项

1. **本地文件安全**：`.env.deploy` 和 `config/env/.env.production` 仍保留在本地，不会被删除
2. **团队协作**：其他开发者需要手动创建这些配置文件
3. **示例文件**：`.env.example` 文件提供了配置模板，已提交到 Git
4. **历史记录**：敏感文件已从 Git 暂存区移除，但可能仍存在于 Git 历史记录中

## 建议

### 对于新开发者

1. 克隆仓库后，复制示例文件：
   ```bash
   cp config/env/.env.example config/env/.env.production
   cp .env.deploy.example .env.deploy  # 如果有示例文件
   ```

2. 根据实际情况修改配置文件

### 对于敏感信息泄露的处理

如果敏感信息已经提交到 Git 历史记录，建议：

1. **修改所有密码和密钥**：
   - 数据库密码
   - JWT 密钥
   - MinIO 密钥

2. **更换服务器 SSH 密钥**：
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_new
   ```

3. **使用 Git 历史重写工具**（如需彻底清理历史）：
   ```bash
   # 使用 git-filter-repo 或 BFG Repo-Cleaner
   # 注意：这会重写 Git 历史，需要团队协调
   ```

## 相关文件

- `.gitignore` - Git 忽略配置文件
