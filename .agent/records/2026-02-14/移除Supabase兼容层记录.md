# 移除 Supabase 兼容层记录

## 背景

在修复角色权限模块问题时，发现 `src/lib/supabase.ts` 兼容层文件实际上已经没有组件在使用。经过全面检查，确认所有组件已经迁移到新的 API 客户端 (`api.ts`)。

## 检查过程

使用 grep 搜索整个 `src` 目录：

```bash
grep -r "from.*supabase\|import.*supabase" src/
```

结果：
- 没有发现任何组件在导入 `supabase.ts`
- `roleService` 使用的是 `api.db`（来自 `api.ts`）
- `AuthContext` 使用的是 `authService` 和 `userService`

## 移除内容

### 1. 删除文件

- **删除**: `src/lib/supabase.ts` (425 行代码)

该文件是一个兼容层，用于在移除 Supabase 依赖的过渡期间提供兼容接口。现在所有组件已经直接使用新的服务层，该文件不再需要。

### 2. 更新测试配置

**文件**: `src/test/setup.ts`

将 Supabase 的 mock 替换为 API 的 mock：

```typescript
// 修改前
vi.mock('../lib/supabase', () => ({
  supabase: { ... }
}));

// 修改后
vi.mock('../lib/api', () => ({
  api: { ... },
  apiClient: { ... }
}));
```

### 3. 更新注释

**文件**: `src/lib/api.ts`
- 修改: `// 为了兼容 supabase.ts 的导入，提供 apiClient` → `// API 客户端`

**文件**: `src/services/index.ts`
- 修改: `所有 API 调用都通过服务层进行，不再直接使用 supabase` → `所有 API 调用都通过服务层进行`

**文件**: `src/context/AuthContext.tsx`
- 修改: `// 简化的 User 类型（不再依赖 @supabase/supabase-js）` → `// User 类型定义`

## 影响分析

- ✅ 没有组件受到影响（因为已经没有组件在使用）
- ✅ 测试用例可以正常运行（mock 已更新）
- ✅ 代码库更加简洁，移除了冗余代码
- ✅ 减少了维护成本

## 相关文件

- `src/lib/supabase.ts` - 已删除
- `src/lib/api.ts` - 更新注释
- `src/services/index.ts` - 更新注释
- `src/context/AuthContext.tsx` - 更新注释
- `src/test/setup.ts` - 更新 mock

## 备注

这次移除标志着项目已经完全摆脱了对 Supabase 的依赖，所有数据访问都通过自研的后端 API 进行。这是一个重要的里程碑。
