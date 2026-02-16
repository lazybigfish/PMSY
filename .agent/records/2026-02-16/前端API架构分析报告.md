# 前端 API 架构分析报告

## 问题

用户发现前端代码中仍在使用 `api.db` 进行数据库操作，看起来像 Supabase 的调用方式。

## 调查结果

### 架构现状

**这不是直接使用 Supabase，而是一个兼容层设计。**

项目采用了**前后端分离 + PostgREST 兼容层**的架构：

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (React)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  src/lib/api.ts                                       │  │
│  │  - 提供 api.db 对象 (兼容 Supabase 的链式调用风格)      │  │
│  │  - 将调用转换为 HTTP 请求发送到 /rest/v1/*             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP 请求
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端 (Express)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /rest/v1/* 路由 (api-new/src/routes/rest.ts)         │  │
│  │  - PostgREST 兼容层                                   │  │
│  │  - 解析查询参数并转换为 SQL                            │  │
│  │  - 直接操作 PostgreSQL 数据库                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 关键文件分析

#### 1. 前端 API 客户端

**文件**: [`src/lib/api.ts`](file:///Users/liiiiins/Downloads/文稿%20-%20liiiiins%20的%20MacBook%20Pro/Mweb/PMSY/src/lib/api.ts)

```typescript
/**
 * API 客户端配置
 * 替代原有的 Supabase 客户端
 * 使用自研后端 API
 */

// 模拟 Supabase 的查询接口
export const db = {
  from: <T = any>(table: string) => {
    return {
      select: (columns?: string) => PostgrestFilterBuilder<T>;
      insert: (data: any | any[]) => Promise<PostgrestResponse<T[]>>;
      update: (data: any) => { eq: (column: string, value: any) => Promise<...> };
      delete: () => { eq: (column: string, value: any) => Promise<...> };
    };
  },
  rpc: <T = any>(fn: string, params?: Record<string, any>) => {...}
};
```

**特点**:
- 完全模拟 Supabase 的 `db.from().select().eq()` 链式调用风格
- 实际将请求发送到 `/rest/v1/${table}`
- 支持所有 PostgREST 过滤器: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in`, `is`, `not`, `order`, `limit`, `single`, `range`

#### 2. 后端 PostgREST 兼容层

**文件**: [`api-new/src/routes/rest.ts`](file:///Users/liiiiins/Downloads/文稿%20-%20liiiiins%20的%20MacBook%20Pro/Mweb/PMSY/api-new/src/routes/rest.ts)

```typescript
/**
 * REST API 路由
 * 兼容 Supabase PostgREST API 格式
 * 基础路径: /rest/v1
 */

// 支持的端点
GET    /rest/v1/:table          // 查询列表
GET    /rest/v1/:table/:id      // 查询单条
POST   /rest/v1/:table          // 插入数据
PATCH  /rest/v1/:table          // 批量更新
PATCH  /rest/v1/:table/:id      // 单条更新
DELETE /rest/v1/:table          // 批量删除
DELETE /rest/v1/:table/:id      // 单条删除
HEAD   /rest/v1/:table          // 获取计数
POST   /rest/v1/rpc/:function   // 调用存储过程
```

**查询参数格式**:
- `?select=*` - 选择列
- `?eq.column=value` - 等于过滤
- `?in.column=v1,v2,v3` - IN 过滤
- `?order=column.asc` - 排序
- `?limit=10` - 限制数量

### 为什么采用这种设计？

#### 1. 平滑迁移

项目之前使用 Supabase，为了**兼容现有代码**而设计了这层 API：
- 前端代码不需要大规模重写
- 保持 `api.db.from().select()` 的调用方式不变
- 减少迁移成本

#### 2. 开发效率

PostgREST 风格的 API 有优势：
- 链式调用直观易读
- 自动生成 CRUD 接口，无需为每个表写 API
- 前端可以灵活组合查询条件

#### 3. 架构分层

```
前端 (React + TypeScript)
    ↓ 调用 api.db.from()
前端 API 层 (src/lib/api.ts)
    ↓ HTTP 请求 /rest/v1/* 
后端 PostgREST 层 (api-new/src/routes/rest.ts)
    ↓ SQL 查询
PostgreSQL 数据库
```

### 安全性考虑

虽然前端调用看起来像直接操作数据库，但实际上：

1. **经过后端中转**: 所有请求都经过 `/rest/v1/*` 路由处理
2. **权限校验**: 后端有 JWT 认证和权限检查
3. **SQL 注入防护**: 使用参数化查询
4. **字段白名单**: 后端可以控制可访问的表和字段

### 对比：真正的 Supabase vs 当前实现

| 特性 | 真正的 Supabase | 当前实现 |
|------|----------------|----------|
| 前端直接连接 | ❌ 否 (有中间层) | ❌ 否 (有中间层) |
| 调用方式 | `supabase.from()` | `api.db.from()` |
| 后端服务 | Supabase 托管 | 自研 Express |
| 实时订阅 | 有 | 无 |
| 认证服务 | Supabase Auth | 自研 JWT |

## 结论

**前端并没有直接使用 Supabase**，而是使用了项目自研的 **PostgREST 兼容层**。

这种设计是**有意为之**的：
- 保持与 Supabase 类似的开发体验
- 减少从 Supabase 迁移的改造成本
- 同时实现完全自主可控的后端

## 建议

### 优点
- ✅ 平滑迁移，代码改动小
- ✅ 开发效率高，无需为每个表写 API
- ✅ 前后端接口风格统一

### 潜在问题
- ⚠️ 前端代码对后端实现有依赖（PostgREST 风格）
- ⚠️ 复杂查询可能需要后端额外支持
- ⚠️ 不如纯 REST API 直观

### 是否需要重构？

**当前阶段不需要**。这种设计在迁移期是合理的。

如果未来需要：
1. 可以逐步将 `api.db.from()` 调用改为专用 API 调用
2. 或者保持现状，继续完善 PostgREST 兼容层

## 记录时间

2026-02-16
