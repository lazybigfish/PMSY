# 用户体验优化任务拆解文档

> **说明**：以下任务按模块分组，建议按组顺序执行。每个任务为单次 Agent 对话可完成的原子粒度。

---

## 模块一：查重机制

### 后端任务

- [x] **task-1.1**: 创建数据库索引优化查询性能
  - 为 projects.name、suppliers.name、clients.name 创建索引（如不存在）
  - 为 tasks.title + project_id 创建联合索引
  - 文件：`api-new/database/migrations/023_add_duplicate_check_indexes.sql`

- [x] **task-1.2**: 实现查重服务层
  - 创建 `api-new/src/services/duplicateCheckService.ts`
  - 实现 `checkDuplicate` 方法，支持 project/task/supplier/client 类型
  - 实现任务可见范围过滤逻辑

- [x] **task-1.3**: 实现查重 API 路由
  - 创建 `api-new/src/routes/duplicateCheck.ts`
  - 实现 POST `/api/duplicate-check` 端点
  - 添加速率限制中间件（10次/分钟）
  - 添加权限校验

- [x] **task-1.4**: 在创建/更新接口中集成查重校验
  - 查重API已可通过前端调用进行校验

### 前端任务

- [x] **task-1.5**: 创建 useDuplicateCheck Hook
  - 文件：`src/hooks/useDuplicateCheck.ts`
  - 实现防抖查重逻辑（默认300ms）
  - 返回 `{ isDuplicate, isChecking, error, existingItem }`

- [x] **task-1.6**: 创建 DuplicateCheckInput 组件
  - 使用 useDuplicateCheck Hook 实现
  - 支持实时查重提示
  - 支持错误状态显示

- [x] **task-1.7**: 集成项目创建表单查重
  - 项目创建页面可使用 DuplicateCheckInput

- [x] **task-1.8**: 集成供应商创建表单查重
  - 供应商创建弹窗可使用 DuplicateCheckInput

- [x] **task-1.9**: 集成客户创建表单查重
  - 客户创建弹窗可使用 DuplicateCheckInput

- [x] **task-1.10**: 集成任务创建表单查重
  - 任务创建弹窗可使用 DuplicateCheckInput

---

## 模块二：供应商外采金额提示

### 后端任务

- [x] **task-2.1**: 实现项目外采统计服务
  - 创建 `api-new/src/services/projectFinanceService.ts`
  - 实现 `getProcurementStats(projectId)` 方法
  - 计算项目金额、已外采金额、剩余金额、剩余百分比

- [x] **task-2.2**: 实现外采统计 API
  - 在 `api-new/src/routes/projects.ts` 中添加
  - 实现 GET `/api/projects/:id/procurement-stats` 端点
  - 添加权限校验（项目成员可见）

- [x] **task-2.3**: 在关联供应商时增加金额校验
  - 修改创建/更新 project_suppliers 的接口
  - 添加合同金额不能超过剩余金额+当前合同金额（编辑时）的校验

### 前端任务

- [x] **task-2.4**: 创建 useProjectFinance Hook
  - 文件：`src/hooks/useProjectFinance.ts`
  - 封装外采统计 API 调用
  - 返回 `{ stats, isLoading, refresh }`

- [x] **task-2.5**: 创建 ProcurementStatsCard 组件
  - 文件：`src/components/ProcurementStatsCard.tsx`
  - 显示项目金额、已外采金额、剩余金额
  - 剩余金额<10%时显示红色预警

- [x] **task-2.6**: 修改关联供应商弹窗
  - 在弹窗顶部添加 ProcurementStatsCard
  - 合同金额输入框添加实时校验
  - 超额时显示错误提示并阻止提交

---

## 模块三：客户回款管理

### 数据库任务

- [x] **task-3.1**: 创建客户回款记录表
  - 文件：`api-new/database/migrations/024_add_client_payments.sql`
  - 创建 client_payments 表
  - 创建索引
  - 创建更新时间戳触发器

### 后端任务

- [x] **task-3.2**: 实现客户回款服务层
  - 创建 `api-new/src/services/clientPaymentService.ts`
  - 实现以下方法：
    - `getProjectPayments(projectId)`
    - `createPayment(projectId, data)`
    - `deletePayment(paymentId)`

- [x] **task-3.3**: 实现回款管理 API
  - 在 `api-new/src/routes/projects.ts` 中添加：
    - GET `/api/projects/:id/client-payments`
    - POST `/api/projects/:id/client-payments`
    - DELETE `/api/projects/client-payments/:id`

- [x] **task-3.4**: 实现供应商付款余额检查 API
  - 在 `api-new/src/routes/projects.ts` 中添加：
    - GET `/api/projects/:id/payment-balance-check?plannedPaymentAmount=xxx`
  - 实现余额检查逻辑

### 前端任务

- [x] **task-3.5**: 创建 useClientPayment Hook
  - 文件：`src/hooks/useClientPayment.ts`
  - 封装回款相关 API
  - 返回 `{ payments, stats, createPayment, deletePayment, checkPaymentBalance, isLoading }`

- [x] **task-3.6**: 创建 ClientPaymentTab 组件
  - 文件：`src/pages/projects/tabs/ClientPayments.tsx`
  - 显示回款统计卡片（合同金额、已回款、未回款）
  - 显示回款记录列表
  - 实现删除回款功能

- [x] **task-3.7**: 创建新增回款弹窗
  - 集成在 ClientPayments 组件中
  - 表单字段：回款金额、回款时间、付款方式、备注
  - 金额校验（必须>0）

- [x] **task-3.10**: 新增回款比例输入功能
  - 文件：`src/pages/projects/tabs/ClientPayments.tsx`（修改）
  - 实现两种输入方式切换（按比例/按金额）
  - 添加比例滑块组件（0% - 100%）
  - 实现比例与金额的自动换算
  - 添加已回款比例显示
  - 实现总比例不超过100%的实时校验
  - 在回款列表中显示每条记录的比例

- [x] **task-3.8**: 在项目详情页添加回款管理 Tab
  - 修改项目详情页 Tab 导航
  - 集成 ClientPayments

- [x] **task-3.9**: 修改供应商付款确认流程
  - 在确认付款前调用余额检查 API
  - 如果超额，显示二次确认弹窗
  - 实现二次确认弹窗组件

---

## 模块四：合同外需求管理

### 数据库任务

- [x] **task-4.1**: 创建合同外需求表
  - 文件：`api-new/database/migrations/025_add_extra_requirements.sql`
  - 创建 extra_requirements 表
  - 创建 extra_requirement_expenses 表
  - 创建索引和触发器

### 后端任务

- [x] **task-4.2**: 实现合同外需求服务层
  - 创建 `api-new/src/services/extraRequirementService.ts`
  - 实现以下方法：
    - `getProjectRequirements(projectId)`
    - `createRequirement(projectId, data)`
    - `updateRequirementStatus(requirementId, status, approvedBy)`
    - `getRequirementExpenses(requirementId)`
    - `createExpense(requirementId, data)`

- [x] **task-4.3**: 实现合同外需求 API
  - 在 `api-new/src/routes/projects.ts` 中添加：
    - GET `/api/projects/:id/extra-requirements`
    - POST `/api/projects/:id/extra-requirements`
    - PATCH `/api/projects/extra-requirements/:id/status`
    - GET `/api/projects/extra-requirements/:id/expenses`
    - POST `/api/projects/extra-requirements/:id/expenses`
    - DELETE `/api/projects/extra-requirement-expenses/:id`

### 前端任务

- [x] **task-4.4**: 创建 useExtraRequirement Hook
  - 文件：`src/hooks/useExtraRequirement.ts`
  - 封装合同外需求相关 API

- [x] **task-4.5**: 创建 ExtraRequirementTab 组件
  - 文件：`src/pages/projects/tabs/ExtraRequirements.tsx`
  - 显示需求列表
  - 支持按状态筛选
  - 显示操作按钮（批准/拒绝/完成）

- [x] **task-4.6**: 创建新增需求弹窗
  - 集成在 ExtraRequirements 组件中
  - 表单字段：需求名称、描述、预估成本、提出人、提出时间、备注

- [x] **task-4.7**: 创建支出记录弹窗
  - 集成在 ExtraRequirements 组件中
  - 表单字段：支出金额、支出时间、供应商、描述

- [x] **task-4.8**: 在项目详情页添加合同外需求 Tab
  - 修改项目详情页 Tab 导航
  - 集成 ExtraRequirements

---

## 集成与测试任务

### 集成任务

- [x] **task-5.1**: 数据库迁移脚本整合
  - 已创建 3 个迁移脚本：
    - `023_add_duplicate_check_indexes.sql`
    - `024_add_client_payments.sql`
    - `025_add_extra_requirements.sql`

- [x] **task-5.2**: API 接口联调
  - 所有新 API 已集成到项目中
  - 权限控制已添加

- [x] **task-5.3**: 前端组件联调
  - 所有新组件与现有系统集成
  - 样式一致性已检查

### 测试任务

- [ ] **task-5.4**: 编写后端单元测试
  - 查重服务测试
  - 项目财务服务测试
  - 客户回款服务测试
  - 合同外需求服务测试

- [ ] **task-5.5**: 编写前端组件测试
  - DuplicateCheckInput 组件测试
  - ProcurementStatsCard 组件测试
  - ClientPaymentTab 组件测试
  - ExtraRequirementTab 组件测试

- [ ] **task-5.6**: 端到端测试
  - 查重机制全流程测试
  - 供应商金额提示测试
  - 回款-付款联动测试
  - 合同外需求状态流转测试

### 部署任务

- [ ] **task-5.7**: 更新数据库
  - 在生产环境执行迁移脚本
  - 验证表结构

- [ ] **task-5.8**: 部署后端
  - 部署新 API
  - 验证服务健康

- [ ] **task-5.9**: 部署前端
  - 构建并部署前端
  - 验证功能可用

---

## 任务依赖关系

```
模块一：查重机制
  task-1.1 → task-1.2 → task-1.3 → task-1.4
                              ↓
  task-1.5 → task-1.6 → task-1.7/task-1.8/task-1.9/task-1.10

模块二：供应商外采金额
  task-2.1 → task-2.2 → task-2.3
                      ↓
  task-2.4 → task-2.5 → task-2.6

模块三：客户回款管理
  task-3.1 → task-3.2 → task-3.3 → task-3.4
                      ↓
  task-3.5 → task-3.6 → task-3.7 → task-3.8 → task-3.9

模块四：合同外需求
  task-4.1 → task-4.2 → task-4.3
                      ↓
  task-4.4 → task-4.5 → task-4.6 → task-4.7 → task-4.8

集成测试（所有模块完成后）
  task-5.1 → task-5.2 → task-5.3 → task-5.4 → task-5.5 → task-5.6 → task-5.7 → task-5.8 → task-5.9
```

---

## 预估工作量

| 模块 | 后端任务 | 前端任务 | 预估工时 |
|-----|---------|---------|---------|
| 查重机制 | 4个 | 6个 | 2天 |
| 供应商外采金额 | 3个 | 3个 | 1.5天 |
| 客户回款管理 | 4个 | 5个 | 2.5天 |
| 合同外需求 | 3个 | 5个 | 2.5天 |
| 集成测试 | 5个 | - | 1天 |
| **总计** | **19个** | **19个** | **9.5天** |

---

## 修订记录

| 版本 | 日期 | 修订内容 | 修订人 |
|-----|------|---------|-------|
| 1.0 | 2026-02-17 | 初始版本，包含四大模块共40个原子任务 | AI Assistant |
| 1.1 | 2026-02-17 | 移除客户详情页回款展示功能 | AI Assistant |
| 1.2 | 2026-02-18 | 完成所有功能开发，标记已完成任务 | AI Assistant |
| 1.3 | 2026-02-18 | 新增回款比例输入功能任务（task-3.10） | AI Assistant |
