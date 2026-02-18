# API 路径统一与代理配置优化 - 任务清单

## 任务总览

| 序号 | 任务名称 | 优先级 | 预估工时 |
|------|---------|-------|---------|
| 1 | 修改前端 API Client (src/lib/api.ts) | 高 | 30分钟 |
| 2 | 修改 adminUserService 路径 | 高 | 20分钟 |
| 3 | 修改 taskService 路径 | 高 | 20分钟 |
| 4 | 检查并修改其他服务文件 | 中 | 30分钟 |
| 5 | 简化 Vite 代理配置 | 高 | 10分钟 |
| 6 | 简化 Nginx 代理配置 | 高 | 10分钟 |
| 7 | 全面测试验证 | 高 | 60分钟 |

---

## 任务详情

### 任务 1: 修改前端 API Client (src/lib/api.ts)

**目标**: 将 auth 相关请求路径从 `/auth/v1/*` 改为 `/api/auth/v1/*`

**修改内容**:
```typescript
// 修改前
request('/auth/v1/token?grant_type=password', ...)
request('/auth/v1/signup', ...)
request('/auth/v1/logout', ...)
request('/auth/v1/user', ...)

// 修改后
request('/api/auth/v1/token?grant_type=password', ...)
request('/api/auth/v1/signup', ...)
request('/api/auth/v1/logout', ...)
request('/api/auth/v1/user', ...)
```

**检查点**:
- [ ] 登录功能正常
- [ ] 注册功能正常
- [ ] 获取用户信息正常
- [ ] 更新用户信息正常

---

### 任务 2: 修改 adminUserService 路径

**目标**: 将所有 `/auth/v1/*` 路径改为 `/api/auth/v1/*`

**修改内容**:
```typescript
// 修改前
fetch('/auth/v1/admin/users', ...)
fetch(`/auth/v1/admin/users/${id}`, ...)

// 修改后
fetch('/api/auth/v1/admin/users', ...)
fetch(`/api/auth/v1/admin/users/${id}`, ...)
```

**检查点**:
- [ ] 获取用户列表正常
- [ ] 创建用户正常
- [ ] 更新用户正常
- [ ] 删除用户正常

---

### 任务 3: 修改 taskService 路径

**目标**: 将所有 `/rest/v1/*` 路径改为 `/api/rest/v1/*`

**修改内容**:
```typescript
// 修改前
apiClient.post('/rest/v1/tasks/batch-delete', ...)
apiClient.post('/rest/v1/tasks/batch-status', ...)
apiClient.get(`/rest/v1/tasks/${taskId}/history`)

// 修改后
apiClient.post('/api/rest/v1/tasks/batch-delete', ...)
apiClient.post('/api/rest/v1/tasks/batch-status', ...)
apiClient.get(`/api/rest/v1/tasks/${taskId}/history`)
```

**检查点**:
- [ ] 批量删除任务正常
- [ ] 批量更新状态正常
- [ ] 查看任务历史正常

---

### 任务 4: 检查并修改其他服务文件

**目标**: 全面检查 src/services 目录下所有文件

**待检查文件**:
- [ ] `src/services/projectFinanceService.ts`
- [ ] `src/services/storageService.ts` (如有)
- [ ] 其他服务文件

**检查方法**:
```bash
grep -r "'/auth/v1\|'/rest/v1\|'/storage/v1" src/services/
```

---

### 任务 5: 简化 Vite 代理配置

**目标**: 将多个代理规则简化为一个

**修改文件**: `vite.config.ts`

**修改内容**:
```typescript
// 修改前
proxy: {
  '/api': { target: 'http://localhost:3001', ... },
  '/rest': { target: 'http://localhost:3001', ... },
  '/auth': { target: 'http://localhost:3001', ... },
}

// 修改后
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false,
  }
}
```

**检查点**:
- [ ] 开发服务器启动正常
- [ ] 所有 API 请求正常

---

### 任务 6: 简化 Nginx 代理配置

**目标**: 将多个 location 简化为一个

**修改文件**: `config/nginx/nginx.conf`

**修改内容**:
```nginx
# 修改前
location /api/ { ... }
location /auth/ { ... }
location /rest/ { ... }
location /storage/ { ... }

# 修改后
location /api/ {
    proxy_pass http://api:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
}
```

**检查点**:
- [ ] Nginx 配置语法正确
- [ ] 部署后所有功能正常

---

### 任务 7: 全面测试验证

**测试范围**:

| 模块 | 测试项 | 状态 |
|------|-------|------|
| 认证 | 登录 | ⬜ |
| 认证 | 注册 | ⬜ |
| 认证 | 退出 | ⬜ |
| 认证 | 获取/更新用户信息 | ⬜ |
| 用户管理 | 获取用户列表 | ⬜ |
| 用户管理 | 创建用户 | ⬜ |
| 用户管理 | 更新用户 | ⬜ |
| 用户管理 | 删除用户 | ⬜ |
| 任务 | 批量删除 | ⬜ |
| 任务 | 批量更新状态 | ⬜ |
| 任务 | 查看历史 | ⬜ |
| 项目 | 创建/更新/删除 | ⬜ |
| 供应商 | 关联/更新/删除 | ⬜ |
| 文件 | 上传/下载/删除 | ⬜ |

---

## 执行建议

### 执行顺序

1. **先执行后端相关**（已完成）
   - 后端已支持双路径，无需修改

2. **再执行前端修改**（任务 1-4）
   - 按优先级从高到低执行
   - 每完成一个任务进行测试

3. **最后执行配置简化**（任务 5-6）
   - 确认前端全部迁移后再简化配置

4. **全面测试**（任务 7）
   - 确保所有功能正常

### 注意事项

1. **不要一次性修改所有文件** - 分步进行，便于定位问题
2. **每次修改后测试** - 确保功能正常再继续
3. **保留旧配置备份** - 便于回滚
4. **开发环境验证后再部署** - 避免影响线上

---

## 文档记录

- [需求文档](./requirements.md)
- [设计文档](./design.md)
- [任务清单](./tasks.md) (本文档)

