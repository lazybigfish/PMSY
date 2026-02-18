# API 路径统一与代理配置优化 - 设计文档

## 1. 架构设计

### 1.1 目标架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端应用                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ 业务组件    │  │ 服务层      │  │ API Client          │  │
│  │             │──│             │──│ 统一使用 /api/*     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 所有请求走 /api/*
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      代理层 (Vite/Nginx)                     │
│              只需配置一个规则: /api → backend:3001           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端 API 服务                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Express Router                                         ││
│  │  ├─ /api/auth/v1/*  → authRouter                        ││
│  │  ├─ /api/rest/v1/*  → restRouter                        ││
│  │  ├─ /api/storage/v1/* → storageRouter                   ││
│  │  ├─ /api/projects/* → projectsRouter                    ││
│  │  └─ /api/health     → healthRouter                      ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  向后兼容 (同时支持)                                     ││
│  │  ├─ /auth/v1/*      → authRouter                        ││
│  │  ├─ /rest/v1/*      → restRouter                        ││
│  │  └─ /storage/v1/*   → storageRouter                     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 1.2 路径映射表

| 功能模块 | 旧路径 | 新路径 | 状态 |
|---------|-------|-------|------|
| 认证 | `/auth/v1/*` | `/api/auth/v1/*` | 需修改前端 |
| REST 数据 | `/rest/v1/*` | `/api/rest/v1/*` | 需修改前端 |
| 文件存储 | `/storage/v1/*` | `/api/storage/v1/*` | 需修改前端 |
| 项目 | `/api/projects/*` | `/api/projects/*` | 无需修改 |
| 供应商 | `/api/project-suppliers/*` | `/api/project-suppliers/*` | 无需修改 |
| 健康检查 | `/health` | `/api/health` | 可选修改 |

## 2. 数据模型

无需修改数据模型，此优化仅涉及 API 路径调整。

## 3. API 接口设计

### 3.1 接口变更清单

#### 认证接口 (auth)

| 方法 | 旧路径 | 新路径 | 说明 |
|------|-------|-------|------|
| POST | `/auth/v1/token` | `/api/auth/v1/token` | 登录 |
| POST | `/auth/v1/signup` | `/api/auth/v1/signup` | 注册 |
| POST | `/auth/v1/logout` | `/api/auth/v1/logout` | 退出 |
| GET | `/auth/v1/user` | `/api/auth/v1/user` | 获取用户信息 |
| PUT | `/auth/v1/user` | `/api/auth/v1/user` | 更新用户信息 |
| POST | `/auth/v1/user/password` | `/api/auth/v1/user/password` | 修改密码 |
| GET | `/auth/v1/admin/users` | `/api/auth/v1/admin/users` | 获取用户列表 |
| POST | `/auth/v1/admin/users` | `/api/auth/v1/admin/users` | 创建用户 |
| PUT | `/auth/v1/admin/users/:id` | `/api/auth/v1/admin/users/:id` | 更新用户 |
| DELETE | `/auth/v1/admin/users/:id` | `/api/auth/v1/admin/users/:id` | 删除用户 |

#### REST 接口 (rest)

| 方法 | 旧路径 | 新路径 | 说明 |
|------|-------|-------|------|
| GET | `/rest/v1/:table` | `/api/rest/v1/:table` | 查询数据 |
| POST | `/rest/v1/:table` | `/api/rest/v1/:table` | 插入数据 |
| PATCH | `/rest/v1/:table` | `/api/rest/v1/:table` | 批量更新 |
| DELETE | `/rest/v1/:table` | `/api/rest/v1/:table` | 批量删除 |
| GET | `/rest/v1/:table/:id` | `/api/rest/v1/:table/:id` | 查询单条 |
| PATCH | `/rest/v1/:table/:id` | `/api/rest/v1/:table/:id` | 更新单条 |
| DELETE | `/rest/v1/:table/:id` | `/api/rest/v1/:table/:id` | 删除单条 |
| POST | `/rest/v1/tasks/batch-delete` | `/api/rest/v1/tasks/batch-delete` | 批量删除任务 |
| POST | `/rest/v1/tasks/batch-status` | `/api/rest/v1/tasks/batch-status` | 批量更新状态 |
| POST | `/rest/v1/tasks/batch-assign` | `/api/rest/v1/tasks/batch-assign` | 批量分配 |
| GET | `/rest/v1/tasks/:id/history` | `/api/rest/v1/tasks/:id/history` | 任务历史 |

#### 存储接口 (storage)

| 方法 | 旧路径 | 新路径 | 说明 |
|------|-------|-------|------|
| POST | `/storage/v1/upload` | `/api/storage/v1/upload` | 文件上传 |
| GET | `/storage/v1/files/:id` | `/api/storage/v1/files/:id` | 获取文件 |
| DELETE | `/storage/v1/files/:id` | `/api/storage/v1/files/:id` | 删除文件 |

## 4. 模块设计

### 4.1 前端修改范围

```
src/
├── lib/
│   └── api.ts              # 修改 auth 路径
├── services/
│   ├── adminUserService.ts # 修改所有路径
│   ├── taskService.ts      # 修改所有路径
│   └── storageService.ts   # 新增/修改 (如有)
└── ...
```

### 4.2 代理配置修改

#### Vite 配置 (开发环境)

```typescript
// vite.config.ts
server: {
  proxy: {
    // 优化前: 需要配置多个规则
    // '/api': { ... },
    // '/rest': { ... },
    // '/auth': { ... },
    // '/storage': { ... },
    
    // 优化后: 只需一个规则
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      secure: false,
    }
  }
}
```

#### Nginx 配置 (生产环境)

```nginx
# nginx.conf
server {
    listen 80;
    
    # 优化前: 需要多个 location
    # location /api/ { ... }
    # location /auth/ { ... }
    # location /rest/ { ... }
    # location /storage/ { ... }
    
    # 优化后: 只需一个 location
    location /api/ {
        proxy_pass http://api:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS 配置
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    }
    
    # 静态文件
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

## 5. 错误处理

### 5.1 向后兼容策略

后端保持双路径支持，确保旧代码仍能正常工作：

```typescript
// api-new/src/index.ts
// 新路径 (推荐)
app.use('/api/auth/v1', authRouter);
app.use('/api/rest/v1', restRouter);
app.use('/api/storage/v1', storageRouter);

// 旧路径 (向后兼容)
app.use('/auth/v1', authRouter);
app.use('/rest/v1', restRouter);
app.use('/storage/v1', storageRouter);
```

### 5.2 迁移期间策略

1. **阶段 1**: 后端支持双路径，前端逐步迁移
2. **阶段 2**: 前端全部迁移到新路径
3. **阶段 3**: 验证无误后，可考虑移除旧路径支持（可选）

## 6. 测试策略

### 6.1 单元测试

- 测试每个服务文件的 API 调用路径是否正确

### 6.2 集成测试

- 测试所有功能模块是否正常工作
- 验证代理配置是否正确

### 6.3 回归测试

- 确保旧路径仍然可用（向后兼容）

## 7. 部署策略

### 7.1 部署顺序

1. 确认后端已支持双路径（已完成）
2. 修改前端代码，统一使用 `/api/*` 路径
3. 更新 Vite 配置，简化代理规则
4. 更新 Nginx 配置，简化 location 配置
5. 部署到服务器
6. 验证所有功能正常

### 7.2 回滚策略

由于后端保持向后兼容，如果前端有问题，可以快速回滚前端代码到旧版本。

