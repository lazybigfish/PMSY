# Tasks

- [x] Task 1: 检查并修复供应商联系人保存逻辑
  - [x] SubTask 1.1: 检查 supplier_contacts 表是否存在 created_by 字段
  - [x] SubTask 1.2: 检查 API 插入联系人时是否需要额外字段
  - [x] SubTask 1.3: 修复 SupplierFormPage.tsx 中的联系人保存逻辑
  - [x] SubTask 1.4: 添加详细的错误处理和日志

- [x] Task 2: 同样修复客户联系人保存逻辑
  - [x] SubTask 2.1: 检查 ClientFormPage.tsx 中的联系人保存逻辑
  - [x] SubTask 2.2: 确保错误处理一致

- [x] Task 3: 验证修复结果
  - [x] SubTask 3.1: 测试新增供应商并添加联系人
  - [x] SubTask 3.2: 测试新增客户并添加联系人

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
