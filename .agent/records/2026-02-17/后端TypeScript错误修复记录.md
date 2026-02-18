# 后端 TypeScript 错误修复记录

## 日期
2026-02-17

## 问题
全新部署脚本在编译阶段报错，后端（api-new）有 12 个 TypeScript 错误。

## 错误分类和修复

### 1. projects.ts - dbService 方法不存在

**错误**:
- `Property 'getDb' does not exist on type '...'`
- `Property 'delete' does not exist on type '...'`

**修复**:
- 在 `dbService.ts` 中添加 `getDb()` 方法返回 Knex 实例
- 在 `dbService.ts` 中添加 `delete` 别名指向 `remove`

### 2. projects.ts - `this` 类型问题

**错误**:
- `'this' implicitly has type 'any' because it does not have a type annotation`

**修复**:
- 为 Knex 查询中的 `function()` 添加 `this: any` 类型注解

### 3. projects.ts/rest.ts - 函数返回类型问题

**错误**:
- `Not all code paths return a value`
- `Type 'Response<...>' is not assignable to type 'void'`

**修复**:
- 为路由处理函数添加显式返回类型 `: Promise<void>`
- 将 `return res.status(...).json(...)` 改为 `res.status(...).json(...); return;`

### 4. rest.ts - 可能的 undefined 值

**错误**:
- `Argument of type 'string | undefined' is not assignable to parameter of type 'string'`

**修复**:
- 使用非空断言 `userId!` 告诉 TypeScript 值已存在

### 5. dbService.ts - 事务返回类型

**错误**:
- `Type 'void | any[]' is not assignable to type 'any[]'`
- `An expression of type 'void' cannot be tested for truthiness`

**修复**:
- 为事务回调添加显式返回类型 `: Promise<any[]>`
- 确保事务总是返回数组

## 修复的文件

1. `api-new/src/services/dbService.ts`
   - 添加 `getDb()` 方法
   - 添加 `delete` 别名
   - 修复事务返回类型

2. `api-new/src/routes/projects.ts`
   - 修复 `this` 类型注解
   - 修复函数返回类型

3. `api-new/src/routes/rest.ts`
   - 修复函数返回类型
   - 修复 undefined 值问题

## 验证结果

✅ 后端构建成功，无 TypeScript 错误
