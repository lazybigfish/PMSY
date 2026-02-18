# API 路径统一与代理配置优化 - 需求文档

## 1. 项目背景

### 1.1 当前问题

当前项目存在多种 API 路径前缀，导致代理配置复杂且容易遗漏：

| 路径前缀 | 用途 | 当前代理配置 |
|---------|------|-------------|
| `/api/*` | 项目、供应商等业务接口 | ✅ 已配置 |
| `/rest/v1/*` | 通用 REST 数据接口 | ✅ 已配置 |
| `/auth/v1/*` | 认证相关接口 | ✅ 刚修复 |
| `/storage/v1/*` | 文件存储接口 | ❌ 未配置 |
| `/health` | 健康检查接口 | ✅ 已配置 |

### 1.2 问题影响

1. **开发环境** - Vite 代理需要配置多个路径规则
2. **服务器环境** - Nginx 需要配置多个 location 块
3. **维护困难** - 新增接口路径容易遗漏代理配置
4. **不一致风险** - 开发环境和生产环境配置可能不同步

## 2. 用户故事

作为 **开发人员**，我希望：
- 所有 API 请求都使用统一的路径前缀
- 代理配置简单，只需配置一个规则
- 开发环境和生产环境代理配置保持一致

作为 **运维人员**，我希望：
- Nginx 配置简洁清晰
- 减少配置错误导致的线上问题
- 新增接口不需要修改代理配置

## 3. 验收标准 (EARS)

### 3.1 功能需求

**EARS-001**: 当 前端发起 API 请求时，系统 SHALL 使用统一的路径前缀 `/api`

**EARS-002**: 当 后端接收请求时，系统 SHALL 同时支持新旧两种路径格式（向后兼容）

**EARS-003**: 当 开发人员启动开发服务器时，系统 SHALL 只需要配置一个代理规则

**EARS-004**: 当 运维人员部署到生产环境时，系统 SHALL 只需要配置一个 Nginx location

### 3.2 非功能需求

**EARS-005**: 系统 SHALL 保持向后兼容，旧路径格式仍然可用

**EARS-006**: 系统 SHALL 在迁移期间支持新旧路径并存

**EARS-007**: 系统 SHALL 在文档中明确推荐使用新路径格式

## 4. 现有路径分析

### 4.1 后端路由注册 (api-new/src/index.ts)

```typescript
// 直接访问路径
app.use('/health', healthRouter);
app.use('/auth/v1', authRouter);
app.use('/rest/v1', restRouter);
app.use('/storage/v1', storageRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/project-suppliers', projectSuppliersRouter);

// 带 /api 前缀的路径
app.use('/api/health', healthRouter);
app.use('/api/auth/v1', authRouter);
app.use('/api/rest/v1', restRouter);
app.use('/api/storage/v1', storageRouter);
```

**分析**: 后端已经支持双路径！这是一个好的设计。

### 4.2 前端调用路径分析

| 服务文件 | 当前路径 | 建议新路径 |
|---------|---------|-----------|
| `src/lib/api.ts` | `/auth/v1/*` | `/api/auth/v1/*` |
| `src/services/adminUserService.ts` | `/auth/v1/*` | `/api/auth/v1/*` |
| `src/services/taskService.ts` | `/rest/v1/*` | `/api/rest/v1/*` |
| `src/services/projectFinanceService.ts` | `/api/*` | `/api/*` (无需修改) |

### 4.3 代理配置现状

**Vite 配置 (vite.config.ts)**:
```typescript
proxy: {
  '/api': { target: 'http://localhost:3001', ... },
  '/rest': { target: 'http://localhost:3001', ... },
  '/auth': { target: 'http://localhost:3001', ... }  // 刚添加
}
```

**Nginx 配置 (nginx.conf)**:
```nginx
location /api/ { proxy_pass http://api:3001/api/; ... }
location /auth/ { proxy_pass http://api:3001/auth/; ... }  // 刚添加
# 缺少 /rest/ 和 /storage/
```

## 5. 优化目标

将所有前端调用路径统一为 `/api/*` 格式，代理配置简化为只配置 `/api` 一个规则。

## 6. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 遗漏修改某个接口调用 | 中 | 高 | 全面审查所有服务文件 |
| 新旧路径冲突 | 低 | 中 | 后端保持双路径支持 |
| 部署时配置未更新 | 中 | 高 | 更新部署脚本 |

