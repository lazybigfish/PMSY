# 模块间接口定义文档

## 一、接口规范

### 1.1 接口命名规范
- RESTful API风格
- 模块前缀：`/api/{module-code}/`
- 资源操作：GET（查询）、POST（创建）、PUT（更新）、DELETE（删除）

### 1.2 接口版本控制
- URL路径版本：`/api/v1/projects`
- 请求头版本：`Accept: application/vnd.api.v1+json`

### 1.3 响应格式规范
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1704067200000
}
```

### 1.4 错误码定义
| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 二、模块间接口清单

### 2.1 认证模块对外接口

| 接口 | 方法 | 路径 | 消费方 |
|------|------|------|--------|
| 用户登录 | POST | /api/auth/login | 所有模块 |
| 用户登出 | POST | /api/auth/logout | 所有模块 |
| Token刷新 | POST | /api/auth/refresh | 所有模块 |
| 获取当前用户 | GET | /api/auth/me | 所有模块 |

### 2.2 项目管理模块对外接口

| 接口 | 方法 | 路径 | 消费方 |
|------|------|------|--------|
| 项目列表 | GET | /api/projects | 工作台、数据分析 |
| 项目详情 | GET | /api/projects/:id | 任务中心、供应商、周日报 |
| 功能模块树 | GET | /api/projects/:id/modules | 任务中心、周日报 |
| 里程碑列表 | GET | /api/projects/:id/milestones | 数据分析、周日报 |
| 风险列表 | GET | /api/projects/:id/risks | 数据分析 |

### 2.3 任务中心模块对外接口

| 接口 | 方法 | 路径 | 消费方 |
|------|------|------|--------|
| 任务列表 | GET | /api/tasks | 工作台、数据分析、周日报 |
| 任务详情 | GET | /api/tasks/:id | 项目管理 |
| 任务统计 | GET | /api/tasks/stats | 工作台、数据分析 |

### 2.4 供应商模块对外接口

| 接口 | 方法 | 路径 | 消费方 |
|------|------|------|--------|
| 供应商列表 | GET | /api/suppliers | 数据分析 |
| 项目供应商 | GET | /api/projects/:id/suppliers | 项目管理、数据分析 |

### 2.5 系统管理模块对外接口

| 接口 | 方法 | 路径 | 消费方 |
|------|------|------|--------|
| 里程碑模板 | GET | /api/admin/milestone-templates | 项目管理 |
| AI配置 | GET | /api/admin/ai-config | 周日报 |
| 报告模板 | GET | /api/admin/report-templates | 周日报 |

---

## 三、数据流转接口

### 3.1 项目数据同步

**接口**：GET /api/projects/:id/full-data
**描述**：获取项目完整数据（用于数据分析、报告生成）
**响应**：
```json
{
  "project": {},
  "modules": [],
  "milestones": [],
  "tasks": [],
  "risks": [],
  "suppliers": [],
  "members": []
}
```

### 3.2 统计数据接口

**接口**：GET /api/analytics/project-stats
**描述**：获取项目统计数据
**响应**：
```json
{
  "total_projects": 10,
  "in_progress": 5,
  "completed": 3,
  "pending": 2,
  "total_amount": 1000000
}
```

### 3.3 AI分析接口

**接口**：POST /api/ai/analyze
**描述**：调用AI进行分析
**请求**：
```json
{
  "provider_id": "uuid",
  "role_id": "uuid",
  "content": "分析内容",
  "context": {}
}
```
**响应**：
```json
{
  "result": "分析结果",
  "suggestions": [],
  "risks": []
}
```

---

## 四、事件通知接口

### 4.1 WebSocket事件

| 事件名 | 描述 | 数据 |
|--------|------|------|
| project.updated | 项目更新 | 项目ID、更新字段 |
| task.assigned | 任务分配 | 任务ID、处理人ID |
| milestone.completed | 里程碑完成 | 里程碑ID、项目ID |
| risk.created | 风险创建 | 风险ID、项目ID |

### 4.2 消息通知接口

**接口**：POST /api/notifications/send
**描述**：发送系统通知
**请求**：
```json
{
  "user_ids": ["uuid"],
  "type": "task_assigned",
  "title": "新任务分配",
  "content": "您被分配了一个新任务",
  "data": {"task_id": "uuid"}
}
```

---

## 五、文件接口

### 5.1 文件上传

**接口**：POST /api/files/upload
**描述**：上传文件
**请求**：multipart/form-data
**响应**：
```json
{
  "file_id": "uuid",
  "file_name": "xxx.pdf",
  "file_url": "https://...",
  "file_size": 1024
}
```

### 5.2 文件下载

**接口**：GET /api/files/:id/download
**描述**：下载文件

---

## 六、接口安全

### 6.1 认证方式
- JWT Token认证
- Token有效期：2小时
- Refresh Token有效期：7天

### 6.2 权限控制
- 基于角色的访问控制（RBAC）
- 接口级别权限校验
- 数据级别权限过滤

### 6.3 限流策略
- 普通接口：100次/分钟
- 导出接口：10次/分钟
- AI接口：20次/小时

---

## 七、接口版本管理

### 7.1 版本策略
- 主版本号：重大变更
- 次版本号：功能新增
- 修订号：Bug修复

### 7.2 兼容性保证
- 向后兼容至少一个主版本
- 废弃接口保留至少6个月
- 版本变更提前30天通知
