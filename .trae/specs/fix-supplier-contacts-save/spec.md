# 供应商联系人保存失败修复 Spec

## Why
新增供应商时，点击保存显示失败，但供应商已保存成功，只是联系人信息没有保存。原因是联系人插入操作失败但没有正确处理错误，导致用户看到"保存失败"提示，但供应商数据已经存在于数据库中。

## What Changes
- 修复供应商插入后获取 ID 的逻辑
- 添加联系人保存的错误处理
- 确保事务一致性：如果联系人保存失败，应该回滚供应商数据或给用户明确提示

## Impact
- Affected code: `src/pages/stakeholders/SupplierFormPage.tsx`
- Affected code: `src/pages/stakeholders/ClientFormPage.tsx`（同样的问题）

## ADDED Requirements
### Requirement: 供应商联系人保存
系统 SHALL 在保存供应商时正确保存联系人信息，并正确处理错误情况。

#### Scenario: 新增供应商成功
- **WHEN** 用户填写供应商信息和联系人后点击保存
- **THEN** 供应商和联系人都应成功保存
- **AND** 用户应被导航到供应商列表页面

#### Scenario: 联系人保存失败
- **WHEN** 供应商保存成功但联系人保存失败
- **THEN** 系统应显示具体错误信息
- **AND** 不应导航到列表页面，让用户有机会重试

## MODIFIED Requirements
### Requirement: 错误处理
系统 SHALL 在保存操作失败时提供明确的错误信息，而不是通用的"保存失败"提示。
