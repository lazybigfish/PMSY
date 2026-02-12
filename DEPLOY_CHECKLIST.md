# 部署检查清单

## 环境配置区分

### 开发机 (本地开发)
- **使用文件**: `.env.local`
- **Supabase**: 云端 https://pnvxlxvuqiikeuikowag.supabase.co
- **启动命令**: `npm run dev`

### 服务器 (生产环境)
- **使用文件**: `.env.server`
- **Supabase**: 本地 Docker (通过 Nginx 代理)
- **Supabase URL**: `http://43.136.69.250` (⚠️ 不带端口号！)
- **部署路径**: `/opt/pmsy/`

---

## ⚠️ 重要：服务器部署必须通过 Nginx 代理

### 问题背景
如果前端直接请求 `http://43.136.69.250:8000`，浏览器会报 "Failed to fetch" 错误（跨域/端口拦截）。

### 解决方案
前端请求 `http://43.136.69.250/auth/...`，由 Nginx 代理到 `http://kong:8000/auth/...`

---

## 部署步骤

### 1. 构建前端（服务器环境）

```bash
# ✅ 正确：使用 .env.server 配置，不带端口号
VITE_SUPABASE_URL=http://43.136.69.250 \
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcG1rc2R6eHB4eGN6a2l2aG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQwMDQ1MDAsImV4cCI6MjAxOTU4MDUwMH0.test \
npm run build

# ❌ 错误：带端口号会导致浏览器跨域错误
# VITE_SUPABASE_URL=http://43.136.69.250:8000 ❌
```

### 2. 传输到服务器

```bash
# ✅ 正确：先清理旧文件，再传输新文件
ssh ubuntu@43.136.69.250 "rm -rf /opt/pmsy/dist/assets/*"
scp -r dist/* ubuntu@43.136.69.250:/opt/pmsy/dist/

# ❌ 错误：直接传输，旧文件可能残留导致问题
# scp -r dist/* ubuntu@43.136.69.250:/opt/pmsy/dist/ ❌
```

**⚠️ 重要：必须先清理旧文件！**
- Vite 构建会生成带哈希的文件名（如 `index-CDJ8a5ca.js`）
- 如果直接传输，旧文件（如 `index-BhkxMz9E.js`）会残留在服务器
- 浏览器可能加载到旧文件，导致配置错误

### 3. 确保 Nginx 配置正确

服务器上的 `nginx.conf` 必须包含以下代理配置：

```nginx
# Supabase Auth 代理 - 解决跨域问题
location /auth/ {
    proxy_pass http://kong:8000/auth/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # CORS 头
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,apikey,authorization' always;
    
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,apikey,authorization';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
}

# Supabase REST API 代理
location /rest/ {
    proxy_pass http://kong:8000/rest/;
    # ... 同上
}
```

### 4. 重启 Nginx

```bash
ssh ubuntu@43.136.69.250 "cd /opt/pmsy && sudo docker-compose restart nginx"
```

---

## 部署前检查清单

- [ ] 确认使用 `VITE_SUPABASE_URL=http://43.136.69.250`（不带 `:8000`）
- [ ] 确认构建成功 (`npm run build` 无错误)
- [ ] 确认只传输 `dist/` 文件夹内容
- [ ] 确认不传输任何 `.env*` 文件
- [ ] 确认服务器 `nginx.conf` 包含 `/auth/` 和 `/rest/` 代理配置
- [ ] 确认服务器服务正常运行
- [ ] 确认数据库迁移脚本已运行（deploy.sh 会自动检查）

---

## 服务器服务检查

```bash
# SSH 到服务器后检查
ssh ubuntu@43.136.69.250
cd /opt/pmsy
sudo docker-compose ps

# 应该看到以下服务正常运行：
# - supabase-kong (端口 8000)
# - supabase-auth
# - supabase-db
# - supabase-rest
# - pmsy-nginx (端口 80/443)
```

---

## 故障排查

### 登录失败 / Failed to fetch

**症状**: 浏览器控制台显示 "Failed to fetch" 或 CORS 错误

**原因**: 前端直接请求 `:8000` 端口被浏览器拦截

**解决**: 
1. 确保 `VITE_SUPABASE_URL=http://43.136.69.250`（不带端口）
2. 确保 Nginx 配置了 `/auth/` 代理
3. 重新构建并部署

### 检查构建文件中的 URL

```bash
# 在开发机检查
grep '43.136.69.250' dist/assets/index-*.js

# ✅ 正确输出：http://43.136.69.250
# ❌ 错误输出：http://43.136.69.250:8000 或 https://pnvxlxvuqiikeuikowag.supabase.co
```

### 检查 Nginx 代理

```bash
# 在服务器上测试
ssh ubuntu@43.136.69.250
curl -X POST http://localhost/auth/v1/token?grant_type=password \
  -H 'Content-Type: application/json' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -d '{"email":"admin@pmsy.com","password":"admin123"}'

# 应该返回 access_token
```

---

## 一键部署脚本

已创建 `deploy.sh` 脚本，会自动完成以下步骤：

```bash
./deploy.sh
```

脚本会自动执行：
1. ✅ 构建前端（使用服务器配置）
2. ✅ 验证构建（检查 URL 配置）
3. ✅ 传输到服务器（清理旧文件）
4. ✅ **检查并运行数据库迁移脚本**（自动检测表是否存在）
5. ✅ 重启 Nginx

### 手动部署（备用）

如果脚本无法运行，可以手动执行：

```bash
# 1. 构建前端
cd "/Users/liiiiins/Downloads/文稿 - liiiiins的MacBook Pro/Mweb/PMSY"
VITE_SUPABASE_URL=http://43.136.69.250 npm run build

# 2. 清理并传输
ssh ubuntu@43.136.69.250 "rm -rf /opt/pmsy/dist/assets/*"
scp -r dist/* ubuntu@43.136.69.250:/opt/pmsy/dist/

# 3. 运行迁移脚本（新服务器需要）
scp supabase/migrations/20260210200000_add_role_permissions.sql ubuntu@43.136.69.250:/tmp/
ssh ubuntu@43.136.69.250 "cd /opt/pmsy && sudo docker-compose exec -T db psql -U postgres < /tmp/20260210200000_add_role_permissions.sql"

# 4. 重启 Nginx
ssh ubuntu@43.136.69.250 "cd /opt/pmsy && sudo docker-compose restart nginx"
```

---

*最后更新: 2026-02-11*
