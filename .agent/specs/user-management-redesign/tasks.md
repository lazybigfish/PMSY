# 用户管理模块重构 - 任务清单

> 按照依赖关系和优先级排序，每个任务可独立完成

## Phase 1: 后端 API 开发

### 任务 1.1: 数据库迁移 - 新增 force_password_change 字段
- [ ] 创建 migration 文件: `api-new/database/migrations/xxx_add_force_password_change.ts`
- [ ] 在 profiles 表添加 `force_password_change` boolean 字段，默认 false
- [ ] 运行迁移验证字段添加成功

### 任务 1.2: 后端 - 实现重置密码接口
- [ ] 在 `api-new/src/services/authService.ts` 添加 `resetPassword` 函数
  - 支持两种模式: random / fixed
  - 固定密码默认值为 `POP-101-ADA`
  - 使用 bcrypt 加密新密码
- [ ] 在 `api-new/src/routes/auth.ts` 添加路由
  - `POST /auth/v1/admin/users/:id/reset-password`
  - 验证管理员权限
  - 返回新密码（明文，仅显示一次）

### 任务 1.3: 后端 - 实现强制改密接口
- [ ] 在 `api-new/src/services/authService.ts` 添加 `setForcePasswordChange` 函数
- [ ] 在 `api-new/src/routes/auth.ts` 添加路由
  - `POST /auth/v1/admin/users/:id/force-password-change`
  - 更新 `force_password_change` 字段

### 任务 1.4: 后端 - 验证现有接口
- [ ] 验证 `GET /auth/v1/admin/users` 列表接口支持分页和搜索
- [ ] 验证 `PUT /auth/v1/admin/users/:id` 更新接口正常工作
- [ ] 验证 `DELETE /auth/v1/admin/users/:id` 禁用接口正常工作

---

## Phase 2: 前端类型定义和 Service 层

### 任务 2.1: 前端 - 创建 admin 类型定义
- [ ] 创建 `src/types/admin.ts`
  - `ResetPasswordMode` 类型
  - `ResetPasswordRequest` / `ResetPasswordResponse` 接口
  - `ForcePasswordChangeRequest` 接口
  - `UserFormData` 接口

### 任务 2.2: 前端 - 创建 adminUserService
- [ ] 创建 `src/services/adminUserService.ts`
  - `getUsers(params)` - 获取用户列表
  - `createUser(data)` - 创建用户
  - `updateUser(id, data)` - 更新用户
  - `resetPassword(userId, mode)` - 重置密码
  - `setForcePasswordChange(userId, force)` - 设置强制改密
  - `toggleUserStatus(userId, isActive)` - 禁用/启用用户
  - 统一错误处理和 Toast 提示

---

## Phase 3: 前端组件开发

### 任务 3.1: 创建 UserManagement 目录结构
- [ ] 创建目录 `src/pages/system/tabs/UserManagement/`
- [ ] 创建子目录 `components/` 和 `hooks/`

### 任务 3.2: 开发 UserTable 组件
- [ ] 创建 `src/pages/system/tabs/UserManagement/components/UserTable.tsx`
  - 接收 users, loading, onEdit, onResetPassword, onToggleStatus 等 props
  - 实现分页展示
  - 操作按钮：编辑、重置密码、禁用/启用

### 任务 3.3: 开发 UserForm 组件
- [ ] 创建 `src/pages/system/tabs/UserManagement/components/UserForm.tsx`
  - 支持新增和编辑两种模式
  - 表单字段：用户名、姓名、邮箱、密码、角色、状态
  - 表单验证：用户名必填、邮箱格式、密码强度
  - 提交时调用 onSubmit 回调

### 任务 3.4: 开发 ResetPasswordModal 组件
- [ ] 创建 `src/pages/system/tabs/UserManagement/components/ResetPasswordModal.tsx`
  - 模式选择：随机密码 / 固定密码
  - 显示生成的新密码
  - 复制按钮
  - 强制改密开关
  - 确认重置按钮

### 任务 3.5: 开发 useUsers Hook
- [ ] 创建 `src/pages/system/tabs/UserManagement/hooks/useUsers.ts`
  - 管理用户列表状态
  - 封装加载、刷新、搜索逻辑
  - 返回 { users, loading, error, refresh, search }

---

## Phase 4: 重构主入口组件

### 任务 4.1: 重构 UserManagement 主组件
- [ ] 重写 `src/pages/system/tabs/UserManagement/index.tsx`
  - 使用 useUsers Hook 管理数据
  - 使用 UserTable 组件展示列表
  - 使用 UserForm 组件处理新增/编辑
  - 使用 ResetPasswordModal 组件处理重置密码
  - 移除原有内联代码（430行简化到150行以内）

### 任务 4.2: 更新路由引用
- [ ] 更新 `src/pages/system/SystemManagement.tsx` 中的导入路径
- [ ] 验证路由正常工作

---

## Phase 5: 集成测试和验证

### 任务 5.1: 后端接口测试
- [ ] 使用 curl 测试重置密码接口（随机模式）
- [ ] 使用 curl 测试重置密码接口（固定模式）
- [ ] 使用 curl 测试强制改密接口
- [ ] 验证数据库字段更新正确

### 任务 5.2: 前端功能测试
- [ ] 测试新增用户流程
- [ ] 测试编辑用户流程
- [ ] 测试重置密码-随机模式
- [ ] 测试重置密码-固定模式
- [ ] 测试强制改密开关
- [ ] 测试禁用/启用用户

### 任务 5.3: 回归测试
- [ ] 验证现有功能未受影响
- [ ] 验证登录流程正常
- [ ] 验证权限控制正常

---

## Phase 6: 文档更新

### 任务 6.1: 更新项目开发日报
- [ ] 创建 `.agent/records/2026-02-14/用户管理模块重构记录.md`
- [ ] 记录重构过程、遇到的问题、解决方案

### 任务 6.2: 代码审查准备
- [ ] 确保所有代码符合项目规范
- [ ] 确保没有遗留 console.log
- [ ] 确保错误处理完善

---

## 执行顺序建议

```
Phase 1 (后端) → Phase 2 (类型/Service) → Phase 3 (组件) → Phase 4 (重构) → Phase 5 (测试) → Phase 6 (文档)
```

每个 Phase 内部的任务可以并行或按顺序执行，但 Phase 之间有依赖关系：
- Phase 2 依赖 Phase 1（需要后端接口就绪）
- Phase 3 依赖 Phase 2（需要类型定义和 Service）
- Phase 4 依赖 Phase 3（需要子组件）

---

## 开始执行

输入 `@tasks.md 执行任务编号` 开始执行具体任务，例如：
- `@tasks.md 执行任务 1.1` - 开始数据库迁移
- `@tasks.md 执行 Phase 1` - 执行整个 Phase 1 的所有任务
