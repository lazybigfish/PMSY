# 供应商关联 JSON 格式修复

## 问题描述

添加供应商时报错：

```
invalid input syntax for type json
insert into "project_suppliers" ("contract_amount", "contract_file_url", "created_by", "module_ids", ...) 
values ($1, $2, $3, $4, $5, $6) returning *
```

## 问题原因

`module_ids` 是数组类型，但直接提交数组到数据库 JSONB 字段时，API 层没有正确处理，导致 `invalid input syntax for type json` 错误。需要将数组转换为 JSON 字符串。

## 修复内容

### 修改文件

`src/pages/projects/tabs/Suppliers.tsx`

### 修改前

```typescript
try {
  const { error } = await api.db.from('project_suppliers').insert({
    project_id: projectId,
    supplier_id: selectedSupplierId,
    contract_amount: addForm.contract_amount,
    module_ids: selectedModuleIds,  // 直接提交数组
    contract_file_url: addForm.contract_file_url || null
  });
  // ...
}
```

### 修改后

```typescript
try {
  const { error } = await api.db.from('project_suppliers').insert({
    project_id: projectId,
    supplier_id: selectedSupplierId,
    contract_amount: addForm.contract_amount,
    module_ids: JSON.stringify(selectedModuleIds),  // 转换为 JSON 字符串
    contract_file_url: addForm.contract_file_url || null
  });
  // ...
}
```

## 修复要点

- 将 `module_ids` 数组使用 `JSON.stringify()` 转换为 JSON 字符串后再提交
- 与风险处置记录的 `handling_records` 处理方式一致

## 测试验证

1. 进入项目详情页的供应商页面
2. 点击"关联供应商"按钮
3. 选择供应商、填写合同金额
4. 选择功能模块
5. 点击确认保存
6. 供应商应正确关联，不再报 JSON 格式错误

## 修复时间

2026-02-16
