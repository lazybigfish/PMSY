# PMSY 部署文档

## 环境区分说明

本项目支持两种运行环境，**必须严格区分**：

### 1. 开发环境（本地开发）
- **Supabase**: 使用云端 Supabase (https://pnvxlxvuqiikeuikowag.supabase.co)
- **数据库**: 云端 PostgreSQL
- **用途**: 本地开发调试
- **配置文件**: `.env`

### 2. 生产环境（服务器部署）
- **Supabase**: 使用本地 Docker 部署的 Supabase
- **数据库**: 本地 PostgreSQL 容器
- **用途**: 生产环境运行
- **配置文件**: `.env.production`

---

## 关键配置文件说明

### 环境变量文件

| 文件 | 用途 | 使用场景 |
|------|------|----------|
| `.env` | 开发环境配置 | 本地开发时使用 |
| `.env.production` | 生产环境配置 | 服务器部署时使用 |
| `.env.example` | 本地开发示例 | 复制为 `.env` 用于开发 |
| `.env.supabase` | 服务器部署示例 | 复制为 `.env` 用于生产 |

### 核心配置项对比

```bash
# 开发环境 (.env) - 云端 Supabase
VITE_SUPABASE_URL=https://pnvxlxvuqiikeuikowag.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 生产环境 (.env.production) - 本地 Supabase
VITE_SUPABASE_URL=http://YOUR_SERVER_IP:8000
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 服务器部署步骤

### 前置要求
- Ubuntu 20.04+ 服务器
- Docker & Docker Compose 已安装
- 服务器 IP: `43.136.69.250` (示例)

### 1. 准备环境变量

```bash
# 在服务器上执行
cd /opt/pmsy

# 复制生产环境配置
cp .env.supabase .env

# 编辑 .env，修改以下关键配置：
# - API_EXTERNAL_URL: http://YOUR_SERVER_IP:8000
# - SITE_URL: http://YOUR_SERVER_IP
# - 所有密码建议修改为自己的强密码
```

### 2. 构建前端（在开发机执行）

```bash
# 确保使用生产环境配置
npm run build

# 验证构建文件包含正确的 Supabase URL
grep "43.136.69.250:8000" dist/assets/*.js
```

### 3. 部署到服务器

```bash
# 复制文件到服务器
scp -r dist ubuntu@43.136.69.250:/opt/pmsy/
scp docker-compose.yml ubuntu@43.136.69.250:/opt/pmsy/
scp -r api ubuntu@43.136.69.250:/opt/pmsy/

# 在服务器上重启服务
ssh ubuntu@43.136.69.250 "cd /opt/pmsy && sudo docker-compose down && sudo docker-compose up -d"
```

### 4. 验证部署

```bash
# 测试用户创建
curl -X POST 'http://YOUR_SERVER_IP/api/auth/create-user' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"username": "test", "password": "Test@123", "email": "test@pmsy.com"}'

# 测试登录
curl -X POST 'http://YOUR_SERVER_IP:8000/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@pmsy.com", "password": "Test@123"}'
```

---

## 常见问题及解决方案

### 问题1: "Invalid authentication credentials" 登录报错

**原因**: 前端构建时使用了错误的 Supabase URL

**解决**:
1. 确保 `.env.production` 中 `VITE_SUPABASE_URL` 指向服务器 IP
2. 使用 `npm run build` 重新构建（自动读取 `.env.production`）
3. 重新部署 `dist` 目录到服务器

### 问题2: "Invalid API key" 或 JWT 验证失败

**原因**: JWT token 与 JWT_SECRET 不匹配

**解决**:
1. 确保 `.env` 中的 `JWT_SECRET` 与生成 token 使用的密钥一致
2. 确保 `VITE_SUPABASE_ANON_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY` 是用正确的 `JWT_SECRET` 生成的
3. 使用 `generate-jwt.js` 重新生成 token

### 问题3: 用户创建失败

**原因**: API 服务连接 GoTrue 失败

**解决**:
1. 检查 API 容器环境变量：`sudo docker-compose exec api env | grep SUPABASE`
2. 确保 `SUPABASE_SERVICE_ROLE_KEY` 是有效的 service_role token
3. 重启 API 服务：`sudo docker-compose restart api`

---

## 重要注意事项

### ⚠️ 环境隔离原则

1. **绝不混用配置**
   - 开发时只用 `.env`（云端 Supabase）
   - 部署时只用 `.env.production`（本地 Supabase）

2. **构建前检查**
   ```bash
   # 构建前确认当前环境
cat .env.production | grep VITE_SUPABASE_URL
   
   # 确保显示的是服务器 IP，不是云端 URL
   ```

3. **部署后验证**
   ```bash
   # 检查前端使用的 Supabase URL
grep "supabase.co\|localhost:8000" dist/assets/*.js
   # 应该没有匹配结果（生产环境不应该包含这些）
   ```

### 🔐 安全配置

1. **修改默认密码**
   - 所有 `.env*` 文件中的密码都是示例，部署前必须修改
   - 建议密码格式：`Pmsy2024@Custom#Password`

2. **JWT 密钥安全**
   - `JWT_SECRET` 至少 32 位字符
   - 生产环境使用强随机字符串
   - 不要提交到 Git 仓库

3. **定期更换密钥**
   - 建议每 3-6 个月更换一次 `JWT_SECRET`
   - 更换后需要重新生成所有 JWT token

---

## 文件更新记录

| 日期 | 更新内容 | 影响 |
|------|----------|------|
| 2026-02-12 | 修复 JWT token 无效问题 | 用户创建/登录功能 |
| 2026-02-12 | 统一环境变量命名 | docker-compose.yml |
| 2026-02-12 | 添加 `.env.production` | 区分开发/生产环境 |
| 2026-02-12 | 更新默认密码 | 安全性提升 |

---

## 快速检查清单

部署前必须检查：

- [ ] `.env` 文件已复制并修改
- [ ] `VITE_SUPABASE_URL` 指向正确的服务器 IP
- [ ] `JWT_SECRET` 已修改为强密码
- [ ] 前端使用 `npm run build` 构建
- [ ] 构建文件包含正确的 Supabase URL
- [ ] 所有服务正常运行：`sudo docker-compose ps`
- [ ] 用户创建 API 测试通过
- [ ] 登录功能测试通过
