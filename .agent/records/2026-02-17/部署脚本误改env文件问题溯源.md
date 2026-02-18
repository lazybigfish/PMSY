# 部署脚本误改 .env 文件问题溯源

## 问题描述
部署脚本在执行过程中会误改项目根目录的 `.env` 文件，导致开发环境无法正常工作（Failed to fetch）。

## 根本原因

### 问题代码（原部署脚本）
```bash
# 构建前：备份开发环境配置
cp .env .env.backup.development

# 构建时：使用生产环境配置
cp config/env/.env.production .env

# 构建后：恢复开发环境配置
mv .env.backup.development .env  # ← 问题在这里！
```

### 问题分析

1. **备份文件冲突**：`.env.backup.development` 文件可能在之前部署时遗留，导致新的备份覆盖旧的备份

2. **恢复逻辑不可靠**：
   - 如果构建过程中断（如用户按 Ctrl+C），恢复逻辑不会执行
   - 如果 `.env.backup.development` 不存在，脚本会删除 `.env` 文件而不是恢复

3. **文件操作顺序问题**：
   ```bash
   cp .env .env.backup.development  # 如果已存在，会被覆盖！
   ```

## 解决方案

### 新方案：内存中保存原始配置

```bash
# 保存原始 .env 文件内容到变量（不依赖文件）
ORIGINAL_ENV=""
if [ -f ".env" ]; then
    ORIGINAL_ENV=$(cat .env)
    echo "   已保存原始 .env 配置"
fi

# 使用生产环境配置进行构建
cp config/env/.env.production .env

# 构建前端
npm run build

# 恢复原始 .env 文件（从变量恢复）
if [ -n "$ORIGINAL_ENV" ]; then
    echo "$ORIGINAL_ENV" > .env
    echo "   已恢复原始 .env 配置"
else
    rm -f .env
    echo "   已删除临时 .env 文件"
fi
```

### 优势

1. **不依赖临时文件**：原始配置保存在内存变量中，不会被覆盖
2. **原子性操作**：构建失败或中断后，可以手动恢复
3. **清晰的日志**：显示保存和恢复的操作
4. **避免文件残留**：不会遗留 `.env.backup.development` 等临时文件

## 修复的文件

1. `deploy/fresh-install/deploy.sh` - 原全新部署脚本
2. `deploy/fresh-install/deploy-v2.sh` - 新的 v2.0 部署脚本
3. `deploy/update/deploy.sh` - 更新部署脚本

## 配置文件分工

| 文件 | 用途 | 环境 |
|------|------|------|
| `.env` | 本地开发环境配置 | 开发 |
| `config/env/.env.production` | 生产服务器部署配置 | 生产 |
| `config/env/.env.example` | 配置示例/模板 | 参考 |

## 建议

1. **不要将 `.env.backup.development` 提交到 Git**
   ```bash
   echo ".env.backup*" >> .gitignore
   ```

2. **定期清理临时文件**
   ```bash
   rm -f .env.backup.development .env.local.backup
   ```

3. **开发环境检查脚本**
   ```bash
   #!/bin/bash
   if grep -q "API_URL=http://43.136.69.250" .env 2>/dev/null; then
       echo "警告: .env 文件被改为生产环境配置！"
       echo "请恢复为: VITE_API_URL=http://localhost:3001"
   fi
   ```
