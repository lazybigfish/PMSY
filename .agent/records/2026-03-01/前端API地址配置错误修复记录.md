# 前端 API 地址配置错误修复记录

## 问题描述

服务器环境更新后，前端页面连接的是本地开发环境的数据库（`localhost:3001`），而不是服务器环境的数据库（`43.136.69.250`）。

## 问题分析

### 根本原因

部署脚本 `deploy/update/deploy.sh` 中的环境变量设置方式不正确：

```bash
# 原代码（错误）
export VITE_ENV_FILE="$ENV_FILE"
npm run build -- --mode production
```

Vite 并不识别 `VITE_ENV_FILE` 环境变量，它默认从项目根目录的 `.env` 文件加载环境变量。由于项目根目录的 `.env` 文件中 `VITE_API_URL=http://localhost:3001`，导致构建产物中硬编码了本地开发环境的 API 地址。

### 影响范围

- 服务器环境的前端页面无法连接到服务器 API
- 所有数据操作都在本地开发环境执行
- 服务器数据库的数据无法在前端显示

## 修复方案

### 1. 修改部署脚本

将 `deploy/update/deploy.sh` 中的前端构建部分修改为直接导出 `VITE_API_URL` 环境变量：

```bash
# 修复后的代码
echo -e "${GREEN}[3/7] 构建前端...${NC}"

# 构建前端 - 使用生产环境配置
echo "   使用 $ENV_FILE 进行生产环境构建"
echo "   开始构建前端（可能需要 30-60 秒）..."

# 从生产环境配置文件中读取 VITE_API_URL
VITE_API_URL=$(grep '^VITE_API_URL=' "$ENV_FILE" | cut -d'=' -f2)
if [ -z "$VITE_API_URL" ]; then
    echo -e "${RED}   ❌ 错误: 未在 $ENV_FILE 中找到 VITE_API_URL 配置${NC}"
    exit 1
fi

echo "   VITE_API_URL: $VITE_API_URL"

# 使用生产环境变量构建
export VITE_API_URL="$VITE_API_URL"
npm run build -- --mode production
```

### 2. 验证修复

构建后检查产物中是否包含正确的 API URL：

```bash
# 本地验证
grep -o '43.136.69.250' dist/assets/*.js

# 服务器验证
ssh ubuntu@43.136.69.250 "grep -o '43.136.69.250' /opt/pmsy/dist/assets/*.js"
```

## 经验总结

### Vite 环境变量加载规则

1. **Vite 使用 `dotenv` 加载环境变量**，默认从以下位置加载：
   - `.env` - 所有环境
   - `.env.local` - 所有环境（本地覆盖，不提交到 Git）
   - `.env.[mode]` - 特定模式（如 `.env.production`）
   - `.env.[mode].local` - 特定模式本地覆盖

2. **Vite 不支持 `VITE_ENV_FILE` 环境变量**，不能通过环境变量指定加载哪个 `.env` 文件。

3. **环境变量优先级**：
   - 命令行导出的环境变量（`export VITE_API_URL=...`）优先级最高
   - 其次是 `.env.[mode].local`
   - 然后是 `.env.[mode]`
   - 最后是 `.env`

### 部署脚本最佳实践

1. **不要依赖 `.env` 文件的动态切换**，直接在构建命令前导出所需的环境变量
2. **验证环境变量是否正确设置**，在构建前打印关键配置
3. **构建后验证产物**，检查关键配置是否被正确打包

### 相关文件

- `deploy/update/deploy.sh` - 部署脚本
- `config/env/.env.production` - 生产环境配置
- `.env` - 开发环境配置（默认）
- `vite.config.ts` - Vite 配置

## 后续建议

1. **删除 `VITE_ENV_FILE` 相关的无效代码**，避免混淆
2. **统一环境变量管理方式**，所有环境变量都通过导出方式设置
3. **添加构建验证步骤**，自动检查产物中的 API URL 是否正确
