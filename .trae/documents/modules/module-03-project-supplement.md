# 供应商Tab数据模型补充

## 补充数据表

### supplier_payment_plans（供应商付款计划表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| project_supplier_id | uuid | 项目供应商关联ID |
| amount | decimal(15,2) | 付款金额 |
| percentage | decimal(5,2) | 付款比例（%） |
| planned_date | date | 计划付款日期 |
| actual_payment_date | date | 实际付款日期 |
| status | text | 状态：pending/paid |
| voucher_url | text | 付款凭证URL |
| reason | text | 付款事由（如：首付款、二期款） |
| created_by | uuid | 创建人ID |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### supplier_acceptances（供应商验收表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| project_supplier_id | uuid | 项目供应商关联ID |
| acceptance_type | text | 验收类型：initial（初验）/final（终验）/phase（阶段性验收） |
| acceptance_date | date | 验收日期 |
| result | text | 验收结果：passed（通过）/failed（不通过）/pending（待定） |
| description | text | 验收描述 |
| attachments | jsonb | 验收附件列表 |
| created_by | uuid | 创建人ID |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

## 补充TypeScript类型

```typescript
// 供应商验收
export interface SupplierAcceptance {
  id: string;
  project_supplier_id: string;
  acceptance_type: 'initial' | 'final' | 'phase';
  acceptance_date: string;
  result: 'passed' | 'failed' | 'pending';
  description?: string;
  attachments?: { name: string; url: string }[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 供应商付款计划
export interface SupplierPaymentPlan {
  id: string;
  project_supplier_id: string;
  amount: number;
  percentage: number;
  planned_date: string;
  actual_payment_date?: string;
  status: 'pending' | 'paid';
  voucher_url?: string;
  reason: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 项目外采统计
export interface ProjectProcurementStats {
  projectAmount: number;
  totalContractAmount: number;
  remainingAmount: number;
  remainingPercentage: number;
  supplierContracts: SupplierContractSummary[];
}

// 供应商合同摘要
export interface SupplierContractSummary {
  supplierId: string;
  supplierName: string;
  contractAmount: number;
}
```
