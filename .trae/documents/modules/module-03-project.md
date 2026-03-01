# 模块03：项目管理模块需求文档

## 版本信息

* **版本**: 3.0

* **更新日期**: 2026-02-25

* **状态**: 已同步代码实现

***

## 一、模块概述

### 1.1 模块定位

项目管理模块是PMSY系统的核心模块，负责项目的全生命周期管理，包括项目创建、信息管理、功能模块管理、里程碑管理、风险管理、供应商关联、回款管理、合同外需求管理等功能。

### 1.2 核心职责

* 项目创建与基础信息管理

* 功能模块的树形结构管理

* 里程碑阶段管理（支持模板版本控制）

* 项目风险登记与跟踪

* 供应商关联与采购管理

* 客户回款管理

* 合同外需求管理

* 项目健康度评估

***

## 二、用户角色与权限

### 2.1 角色定义

| 角色    | 说明         | 权限范围         |
| ----- | ---------- | ------------ |
| 系统管理员 | 系统管理员      | 可查看和管理所有项目   |
| 项目经理  | 项目创建者或经理角色 | 拥有项目的完整管理权限  |
| 项目成员  | 被添加到项目的用户  | 可查看项目，部分编辑权限 |
| 相关方   | 公开项目的访问者   | 仅可查看项目概览     |

### 2.2 权限矩阵

| 功能      | 系统管理员 | 项目经理 | 项目成员 | 相关方 |
| ------- | ----- | ---- | ---- | --- |
| 创建项目    | ✓     | ✓    | ✗    | ✗   |
| 编辑项目信息  | ✓     | ✓    | ✗    | ✗   |
| 删除项目    | ✓     | ✓    | ✗    | ✗   |
| 管理功能模块  | ✓     | ✓    | ✓    | ✗   |
| 管理里程碑   | ✓     | ✓    | ✓    | ✗   |
| 管理风险    | ✓     | ✓    | ✓    | ✗   |
| 关联供应商   | ✓     | ✓    | ✓    | ✗   |
| 管理回款    | ✓     | ✓    | ✓    | ✗   |
| 管理合同外需求 | ✓     | ✓    | ✓    | ✗   |
| 查看周日报   | ✓     | ✓    | ✓    | ✗   |
| 查看项目概览  | ✓     | ✓    | ✓    | ✓   |

***

## 三、功能需求

### 3.1 项目列表页面

#### 3.1.1 页面头部

* **标题**: "项目管理"

* **副标题**: "管理项目全生命周期，跟踪进度与里程碑"

* **新建项目按钮**: 跳转到项目创建页面

#### 3.1.2 统计卡片

| 卡片    | 说明                 |
| ----- | ------------------ |
| 项目总数  | 当前用户可见的所有项目数量      |
| 合同总金额 | 作为项目经理的项目金额总和      |
| 已验收项目 | 作为项目经理且已完成最终阶段的项目数 |
| 公开项目  | 全员可见的项目数量          |

#### 3.1.3 搜索与筛选

| 功能   | 说明                |
| ---- | ----------------- |
| 搜索框  | 支持按项目名称、客户名称、描述搜索 |
| 状态筛选 | 全部/待处理/进行中/已完成    |

#### 3.1.4 项目列表表格

| 列名   | 说明                             |
| ---- | ------------------------------ |
| 序号   | 项目序号                           |
| 项目信息 | 项目名称 + 客户名称 + 成员数量             |
| 项目金额 | 合同金额（大写）+ 回款金额 + 回款比例进度条       |
| 当前阶段 | 显示当前里程碑阶段名称，带颜色标识，可点击进入里程碑Tab  |
| 进度   | 功能模块平均进度百分比 + 进度条，可点击进入功能模块Tab |
| 健康度  | 0-100分，根据风险计算，可点击进入风险Tab       |
| 我的角色 | 项目经理/团队成员/-                    |
| 操作   | 详情按钮 + 删除按钮（仅项目经理可见）           |

**阶段颜色标识:**

| 阶段    | 颜色  |
| ----- | --- |
| 进场前阶段 | 灰色  |
| 启动阶段  | 蓝色  |
| 实施阶段  | 靛蓝色 |
| 初验阶段  | 紫色  |
| 试运行阶段 | 黄色  |
| 终验阶段  | 橙色  |
| 运维阶段  | 绿色  |

**健康度计算规则:**

* 基础分: 100分

* 每个活跃高风险: -20分

* 每个活跃中风险: -10分

* 每个活跃低风险: -5分

* 最低: 0分

**金额显示规则:**

* 自动转换：≥1亿显示"X亿"，≥1万显示"X万"，否则显示"¥X"

* 显示大写金额

* 回款进度条根据比例显示不同颜色（≥80%绿色，≥50%主题色，≥20%黄色，<20%红色）

#### 3.1.5 空状态

* 显示提示: "暂无项目数据"

### 3.2 项目创建页面

#### 3.2.1 表单字段

| 字段   | 类型   | 必填 | 说明            |
| ---- | ---- | -- | ------------- |
| 项目名称 | 文本   | 是  | 项目名称          |
| 客户名称 | 下拉选择 | 是  | 从客户库中选择       |
| 项目金额 | 数字   | 否  | 项目合同金额，实时显示大写 |
| 项目描述 | 文本域  | 否  | 项目详细描述        |
| 公开项目 | 开关   | 否  | 是否对所有用户可见     |

#### 3.2.2 创建流程

1. 填写项目基本信息
2. 点击"创建项目"
3. 后端自动：

   * 创建项目记录

   * 将创建者设为项目经理

   * 关联客户（project\_clients表）

   * 根据激活的模板版本初始化里程碑阶段和任务
4. 跳转到项目详情页

#### 3.2.3 里程碑模板版本

* 系统支持多版本里程碑模板

* 创建项目时使用当前激活的模板版本

* 模板包含7个标准阶段和每个阶段的必选任务

### 3.3 项目详情页面

#### 3.3.1 页面头部

* **返回按钮**: 返回项目列表

* **项目名称**: 显示/编辑项目名称

* **客户名称**: 显示客户信息

* **公开标识**: 公开项目显示标签

* **编辑按钮**: 项目经理可在项目概览Tab编辑项目信息

* **权限标识**: 仅查看权限时显示标签

#### 3.3.2 Tab导航

| Tab   | 标识         | 说明         | 权限要求  |
| ----- | ---------- | ---------- | ----- |
| 项目概览  | overview   | 项目基本信息和统计  | 所有权限  |
| 功能模块  | modules    | 项目功能模块树形管理 | 成员及以上 |
| 里程碑   | milestones | 阶段管理       | 成员及以上 |
| 风险    | risks      | 项目风险登记     | 成员及以上 |
| 供应商   | suppliers  | 关联供应商管理    | 成员及以上 |
| 回款管理  | payments   | 客户回款管理     | 成员及以上 |
| 合同外需求 | extra      | 合同外需求管理    | 成员及以上 |
| 周日报   | reports    | 项目报告管理     | 成员及以上 |

#### 3.3.3 项目概览Tab

**基本信息区域:**

* 建设内容/描述（可编辑）

* 客户名称（可编辑，支持下拉选择）

* 项目金额（可编辑，显示大写）

* 健康度（自动计算）

* 可见性（公开/私有）

* 创建时间

* 是否有外采（自动计算）

* 采购金额（有外采时显示）

* 已支付金额（有外采时显示）

**统计卡片区域:**

| 卡片   | 说明               |
| ---- | ---------------- |
| 任务统计 | 已完成/总任务数 + 环形进度图 |
| 风险统计 | 已关闭/总风险数 + 环形进度图 |
| 里程碑  | 已完成/总阶段数 + 线性进度条 |
| 功能模块 | 平均完成度百分比 + 线性进度条 |

**团队成员区域:**

* 显示所有项目成员列表

* 显示成员角色（项目经理/团队成员）

* 项目经理可添加/移除成员

* 添加成员时选择用户和角色

#### 3.3.4 功能模块Tab

**功能列表:**

* 树形结构展示功能模块

* 支持展开/收起子模块

* 显示模块进度条和百分比

* 显示模块状态标签

* 显示关联供应商标签

**操作功能:**

* 新增模块（根模块或子模块）

* 删除模块（连带删除子模块）

* 上移/下移调整顺序

* 快速开始（状态设为进行中）

* 快速完成（状态设为已完成，进度100%）

**导入导出:**

* 导出：生成Excel文件包含模块名称、描述、状态、层级

* 模板下载：提供导入模板

* 导入：从Excel批量导入模块（覆盖现有数据）

**模块详情编辑:**

* 模块介绍编辑

* 状态选择：未开始/进行中/已暂停/延期/已完成

* 完成度滑块（0-100%）

* 关联功能点（任务）列表

* 供应商信息展示

**层级统计卡片:**

* 按层级统计模块数量

* 显示每层级的加权平均完成度

* 卡片背景根据完成度填充

#### 3.3.5 里程碑Tab

**左侧阶段列表:**

* 显示所有阶段（按phase\_order排序）

* 显示阶段名称和进度百分比

* 显示阶段状态标签

* 点击切换选中阶段

* 支持删除自定义阶段

* 支持新增阶段（可指定插入位置）

**右侧任务区域:**

* 显示选中阶段的任务列表

* 任务筛选：搜索、状态（全部/已完成/未完成）、类型（全部/必选/可选）

* 任务操作：

  * 标记完成/未完成

  * 上传附件（支持多文件）

  * 删除附件

  * 删除自定义任务

* 新增任务（可设置是否必选、输出物）

**阶段状态切换:**

* 未开始/进行中/已完成

* 标记完成时自动将下一阶段设为进行中

**文档下载:**

* 阶段下载：打包下载当前阶段所有附件

* 完整打包下载：打包下载所有阶段所有附件

#### 3.3.6 风险Tab

**风险列表:**

* 表格展示：风险标题、等级、状态、责任人、处置记录数

* 筛选：按状态筛选、按等级筛选

* 等级标识：高（红色）、中（黄色）、低（蓝色）

* 状态标识：未处理、处理中、已关闭

**新增风险:**

* 风险标题

* 风险等级（低/中/高）

* 责任人（项目成员下拉选择）

* 风险描述

* 影响分析

* 应对措施

**风险详情弹窗:**

* 风险描述、影响分析、应对措施展示

* 处置进展时间轴

* 添加处置记录（内容 + 状态变更）

* 历史处置记录列表

#### 3.3.7 供应商Tab

**外采统计卡片:**

* 项目总金额

* 已外采金额

* 剩余可外采金额

* 外采占比进度条

* 低预算预警（剩余金额低于10%时提示）

**供应商列表:**

* 序号、供应商名称、负责模块、合同金额、已支付金额、建设进度

* 建设进度根据负责模块的平均进度计算

* 点击供应商名称查看详情

* 项目经理可移除供应商关联

**关联供应商:**

* 选择供应商（过滤已关联的供应商）

* 选择负责功能模块（树形多选，支持父子联动选择）

* 合同金额输入（实时校验不超过剩余可外采金额）

* 合同文件上传（支持查看和删除）

* 校验规则：

  * 项目必须有功能模块才能关联供应商

  * 所有模块已关联时禁止新增

  * 合同金额不能超过项目总金额

  * 合同金额不能超过剩余可外采金额

**供应商详情弹窗:**

*基本信息Tab:*

* **统计指标区域**（5个卡片）：

  * 合同金额（显示大写）

  * 已支付金额（显示大写）

  * 未支付金额（显示大写）

  * 未支付比例

  * 验收状态（未验收/初验完成/终验完成/阶段性验收，显示最新验收日期）

* **供应商信息**：

  * 供应商名称、联系人、联系电话

  * 合同金额（可编辑调整，带大写显示）

  * 负责模块（可编辑调整，树形多选）

  * 合同文件（可查看）

* **权限控制**：仅项目经理和项目成员可编辑

*验收与付款Tab:*

**验收管理:**

* **验收类型**（3种）：

  * 初验（蓝色标识）

  * 终验（绿色标识）

  * 阶段性验收（黄色标识）

* **验收记录列表**：

  * 显示验收类型标签、结果标签（通过/不通过）

  * 显示验收日期

  * 支持删除验收记录

* **新增验收**：

  * 选择验收类型（单选卡片式）

  * 选择验收日期（日期选择器）

  * 自动记录创建人

**付款管理:**

* **付款计划列表**（表格形式）：

  * 序号、计划付款时间、付款金额（显示大写）

  * 付款状态（待付款/已付款标签）

  * 操作按钮：

    * 待付款：确认付款

    * 已付款：撤回付款

* **新增付款计划**（支持批量添加）：

  * 付款时间（日期选择器）

  * 付款比例（0-100%，自动计算金额）

  * 付款金额（根据比例自动计算，显示大写）

  * 付款事由（如：首付款、二期款等）

  * 支持添加多个付款计划

  * 支持删除已添加的计划项

* **确认付款**：

  * 显示计划付款金额和时间

  * 选择实际付款时间（日期选择器）

  * 上传付款凭证（支持图片、PDF）

  * **资金余额检查**：

    * 自动检查客户回款是否足以覆盖本次付款

    * 显示客户回款金额、已付供应商金额、本次付款金额

    * 计算付款后累计支出和资金缺口

    * 余额不足时提示风险，但仍可强制继续付款

* **撤回付款**：

  * 将已付款状态重置为待付款

  * 清除实际付款时间和凭证

**数据统计与计算:**

* 已支付金额 = 所有状态为"已付款"的付款计划金额总和

* 未支付金额 = 合同金额 - 已支付金额

* 未支付比例 = (未支付金额 / 合同金额) × 100%

* 验收状态根据最新验收记录自动计算

#### 3.3.8 回款管理Tab

* 客户回款记录管理

* 回款计划与实际回款对比

#### 3.3.9 合同外需求Tab

* 合同外需求登记

* 需求状态跟踪

#### 3.3.10 周日报Tab

* 周报/日报列表

* 报告创建与编辑

***

## 四、数据模型

### 4.1 核心数据表

#### projects（项目表）

| 字段                     | 类型            | 说明                                       |
| ---------------------- | ------------- | ---------------------------------------- |
| id                     | uuid          | 主键                                       |
| name                   | text          | 项目名称                                     |
| customer\_name         | text          | 客户名称（冗余字段）                               |
| amount                 | decimal(15,2) | 项目金额                                     |
| description            | text          | 项目描述                                     |
| status                 | text          | 状态：pending/in\_progress/completed/paused |
| is\_public             | boolean       | 是否公开                                     |
| manager\_id            | uuid          | 项目经理ID                                   |
| current\_milestone\_id | uuid          | 当前里程碑ID                                  |
| created\_at            | timestamptz   | 创建时间                                     |
| updated\_at            | timestamptz   | 更新时间                                     |

#### project\_clients（项目客户关联表）

| 字段               | 类型            | 说明   |
| ---------------- | ------------- | ---- |
| id               | uuid          | 主键   |
| project\_id      | uuid          | 项目ID |
| client\_id       | uuid          | 客户ID |
| contract\_amount | decimal(15,2) | 合同金额 |

#### project\_members（项目成员表）

| 字段          | 类型          | 说明                |
| ----------- | ----------- | ----------------- |
| id          | uuid        | 主键                |
| project\_id | uuid        | 项目ID              |
| user\_id    | uuid        | 用户ID              |
| role        | text        | 角色：manager/member |
| joined\_at  | timestamptz | 加入时间              |

#### project\_modules（功能模块表）

| 字段          | 类型      | 说明                                                    |
| ----------- | ------- | ----------------------------------------------------- |
| id          | uuid    | 主键                                                    |
| project\_id | uuid    | 项目ID                                                  |
| parent\_id  | uuid    | 父模块ID                                                 |
| name        | text    | 模块名称                                                  |
| description | text    | 模块描述                                                  |
| status      | text    | 状态：not\_started/in\_progress/completed/paused/delayed |
| progress    | integer | 进度（0-100）                                             |
| sort\_order | integer | 排序序号                                                  |
| level       | integer | 层级                                                    |

#### template\_versions（模板版本表）

| 字段              | 类型      | 说明   |
| --------------- | ------- | ---- |
| id              | uuid    | 主键   |
| name            | text    | 版本名称 |
| version\_number | integer | 版本号  |
| description     | text    | 版本描述 |
| is\_active      | boolean | 是否激活 |

#### milestone\_templates（里程碑模板表）

| 字段           | 类型      | 说明     |
| ------------ | ------- | ------ |
| id           | uuid    | 主键     |
| version\_id  | uuid    | 模板版本ID |
| name         | text    | 阶段名称   |
| description  | text    | 阶段描述   |
| phase\_order | integer | 阶段顺序   |
| is\_active   | boolean | 是否激活   |

#### project\_milestones（项目里程碑表）

| 字段           | 类型      | 说明                                |
| ------------ | ------- | --------------------------------- |
| id           | uuid    | 主键                                |
| project\_id  | uuid    | 项目ID                              |
| template\_id | uuid    | 模板ID                              |
| name         | text    | 阶段名称                              |
| description  | text    | 阶段描述                              |
| status       | text    | 状态：pending/in\_progress/completed |
| phase\_order | integer | 阶段顺序                              |
| is\_current  | boolean | 是否当前阶段                            |
| start\_date  | date    | 开始日期                              |
| end\_date    | date    | 结束日期                              |
| is\_custom   | boolean | 是否自定义阶段                           |

#### milestone\_task\_templates（里程碑任务模板表）

| 字段                      | 类型      | 说明      |
| ----------------------- | ------- | ------- |
| id                      | uuid    | 主键      |
| milestone\_template\_id | uuid    | 里程碑模板ID |
| name                    | text    | 任务名称    |
| description             | text    | 任务描述    |
| is\_required            | boolean | 是否必选    |
| output\_documents       | jsonb   | 输出物配置   |
| sort\_order             | integer | 排序序号    |

#### milestone\_tasks（里程碑任务表）

| 字段                | 类型          | 说明                                |
| ----------------- | ----------- | --------------------------------- |
| id                | uuid        | 主键                                |
| milestone\_id     | uuid        | 里程碑ID                             |
| template\_id      | uuid        | 模板ID                              |
| name              | text        | 任务名称                              |
| description       | text        | 任务描述                              |
| is\_required      | boolean     | 是否必选                              |
| is\_completed     | boolean     | 是否完成                              |
| is\_custom        | boolean     | 是否自定义任务                           |
| completed\_at     | timestamptz | 完成时间                              |
| completed\_by     | uuid        | 完成人ID                             |
| output\_documents | jsonb       | 输出文档列表                            |
| sort\_order       | integer     | 排序序号                              |
| status            | text        | 状态：pending/in\_progress/completed |

#### risks（风险表）

| 字段                | 类型          | 说明                      |
| ----------------- | ----------- | ----------------------- |
| id                | uuid        | 主键                      |
| project\_id       | uuid        | 项目ID                    |
| title             | text        | 风险标题                    |
| description       | text        | 风险描述                    |
| level             | text        | 等级：low/medium/high      |
| status            | text        | 状态：open/handling/closed |
| owner\_id         | uuid        | 责任人ID                   |
| impact            | text        | 影响分析                    |
| mitigation\_plan  | text        | 应对措施                    |
| handling\_records | jsonb       | 处置记录                    |
| created\_by       | uuid        | 创建人ID                   |
| created\_at       | timestamptz | 创建时间                    |
| updated\_at       | timestamptz | 更新时间                    |

#### project\_suppliers（项目供应商关联表）

| 字段                  | 类型            | 说明       |
| ------------------- | ------------- | -------- |
| id                  | uuid          | 主键       |
| project\_id         | uuid          | 项目ID     |
| supplier\_id        | uuid          | 供应商ID    |
| contract\_amount    | decimal(15,2) | 合同金额     |
| module\_ids         | jsonb         | 负责模块ID列表 |
| contract\_file\_url | text          | 合同文件URL  |
| created\_at         | timestamptz   | 创建时间     |

#### supplier\_payment\_plans（供应商付款计划表）

| 字段                    | 类型            | 说明              |
| --------------------- | ------------- | --------------- |
| id                    | uuid          | 主键              |
| project\_supplier\_id | uuid          | 项目供应商关联ID       |
| amount                | decimal(15,2) | 付款金额            |
| percentage            | decimal(5,2)  | 付款比例（%）         |
| planned\_date         | date          | 计划付款日期          |
| actual\_payment\_date | date          | 实际付款日期          |
| status                | text          | 状态：pending/paid |
| voucher\_url          | text          | 付款凭证URL         |
| reason                | text          | 付款事由（如：首付款、二期款） |
| created\_by           | uuid          | 创建人ID           |
| created\_at           | timestamptz   | 创建时间            |
| updated\_at           | timestamptz   | 更新时间            |

#### supplier\_acceptances（供应商验收表）

| 字段                    | 类型          | 说明                                      |
| --------------------- | ----------- | --------------------------------------- |
| id                    | uuid        | 主键                                      |
| project\_supplier\_id | uuid        | 项目供应商关联ID                               |
| acceptance\_type      | text        | 验收类型：initial（初验）/final（终验）/phase（阶段性验收） |
| acceptance\_date      | date        | 验收日期                                    |
| result                | text        | 验收结果：passed（通过）/failed（不通过）/pending（待定） |
| description           | text        | 验收描述                                    |
| attachments           | jsonb       | 验收附件列表                                  |
| created\_by           | uuid        | 创建人ID                                   |
| created\_at           | timestamptz | 创建时间                                    |
| updated\_at           | timestamptz | 更新时间                                    |

#### client\_payments（客户回款表）

| 字段            | 类型            | 说明   |
| ------------- | ------------- | ---- |
| id            | uuid          | 主键   |
| project\_id   | uuid          | 项目ID |
| amount        | decimal(15,2) | 金额   |
| payment\_date | date          | 回款日期 |
| description   | text          | 说明   |

### 4.2 TypeScript类型定义

```typescript
// 项目状态
export type ProjectStatus = 'pending' | 'in_progress' | 'completed' | 'paused';

// 项目基础信息
export interface Project {
  id: string;
  name: string;
  description: string | null;
  customer_name: string | null;
  amount: number | null;
  is_public: boolean;
  status: ProjectStatus;
  manager_id: string | null;
  current_milestone_id: string | null;
  created_at: string;
  updated_at: string;
}

// 项目详情
export interface ProjectDetail extends Project {
  manager?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  modules?: ProjectModule[];
  milestones?: ProjectMilestone[];
  members?: ProjectMember[];
  risks?: ProjectRisk[];
}

// 项目模块
export interface ProjectModule {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  parent_id?: string | null;
  children?: ProjectModule[];
  level?: number;
  progress?: number;
  status?: 'not_started' | 'pending' | 'in_progress' | 'completed' | 'delayed';
}

// 项目里程碑
export interface ProjectMilestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  planned_date: string | null;
  actual_date: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  sort_order: number;
  created_at: string;
  phase_order?: number;
  progress?: number;
  is_custom?: boolean;
}

// 里程碑任务
export interface MilestoneTask {
  id: string;
  milestone_id: string;
  name: string;
  description: string;
  is_required: boolean;
  is_completed: boolean;
  is_custom?: boolean;
  completed_at?: string;
  completed_by?: string;
  output_documents: { 
    name: string; 
    url: string; 
    uploaded_at?: string; 
    uploaded_by?: string;
    required?: boolean;
  }[];
  sort_order?: number;
  status?: 'pending' | 'in_progress' | 'completed';
}

// 项目成员
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// 项目风险
export interface ProjectRisk {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  level: 'low' | 'medium' | 'high';
  status: 'open' | 'handling' | 'closed';
  mitigation_plan: string | null;
  impact?: string;
  owner_id?: string;
  handling_records: {
    date: string;
    content: string;
    handler_id: string;
    handler?: Profile;
  }[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 项目供应商
export interface ProjectSupplier {
  id: string;
  project_id: string;
  supplier_id: string;
  contract_amount?: number | null;
  role?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  module_ids?: string[] | null;
  contract_file_url?: string | null;
  created_at: string;
  supplier?: {
    id: string;
    name: string;
    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  payments?: SupplierPaymentPlan[];
  progress?: number;
  paid_amount?: number;
  acceptances?: SupplierAcceptance[];
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

// 供应商
export interface Supplier {
  id: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  description?: string | null;
  status?: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// 模板版本
export interface TemplateVersion {
  id: string;
  name: string;
  version_number: number;
  description: string;
  is_active: boolean;
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

***

## 五、接口规范

### 5.1 项目列表

```typescript
// 获取项目列表（含关联数据）
const { data: projectsData } = await api.db
  .from('projects')
  .select('*')
  .order('created_at', { ascending: false });

// 获取里程碑、模块、风险、成员、回款等关联数据
// 在前端进行数据组装计算
```

### 5.2 项目详情

```typescript
// 获取项目详情
const { data: projectData } = await api.db
  .from('projects')
  .select('*')
  .eq('id', id)
  .single();

// 获取项目经理信息
const { data: manager } = await api.db
  .from('profiles')
  .select('id, full_name, email')
  .eq('id', project.manager_id)
  .single();
```

### 5.3 创建项目

```typescript
// 调用后端API创建项目（自动初始化里程碑）
const project = await apiClient.post('/api/projects', {
  name: string,
  customer_name: string,
  amount: number,
  description: string,
  is_public: boolean,
  client_id: string,
});
```

### 5.4 更新项目

```typescript
const { error } = await api.db
  .from('projects')
  .update({
    name,
    customer_name,
    amount,
    description,
    is_public
  })
  .eq('id', id);
```

### 5.5 删除项目

```typescript
const { error } = await api.db
  .from('projects')
  .delete()
  .eq('id', projectId);
```

### 5.6 项目初始化服务

```typescript
// 后端服务：initializeProjectMilestones
// 根据激活的模板版本初始化项目里程碑和任务
export async function initializeProjectMilestones(
  projectId: string,
  createdBy: string
): Promise<{ success: boolean; firstMilestoneId?: string; error?: string }>
```

### 5.7 供应商付款资金检查

```typescript
// 检查客户回款是否足以覆盖本次付款
const result = await apiClient.get(`/api/projects/${projectId}/payment-balance-check`, {
  params: { plannedPaymentAmount: number }
});

// 返回结果
interface PaymentBalanceCheckResult {
  canProceed: boolean;           // 是否可以继续付款
  clientTotalPayment: number;    // 客户回款总金额
  supplierTotalPaid: number;     // 已付供应商总金额
  plannedPaymentAmount: number;  // 本次计划付款金额
  projectedTotal: number;        // 付款后累计支出
  deficit: number;               // 资金缺口（负数表示余额充足）
  message: string;               // 提示信息
}
```

***

## 六、界面原型

### 6.1 项目列表

```
┌─────────────────────────────────────────────────────────────────────┐
│ 项目管理                                            [+ 新建项目]      │
│ 管理项目全生命周期，跟踪进度与里程碑                                   │
├─────────────────────────────────────────────────────────────────────┤
│ [统计卡片：项目总数 | 合同总金额 | 已验收项目 | 公开项目]              │
├─────────────────────────────────────────────────────────────────────┤
│ [搜索项目...] [全部状态 ▼]                                           │
├─────────────────────────────────────────────────────────────────────┤
│ 序号 │ 项目信息        │ 项目金额      │ 当前阶段   │ 进度  │ 健康度 │
├──────┼─────────────────┼───────────────┼────────────┼───────┼────────┤
│  1   │ 项目名称A       │ ¥100万        │ [实施阶段] │ 60%   │  80    │
│      │ 客户：某某公司  │ 回款：¥60万   │            │       │        │
│      │ 5成员           │ ████████ 60%  │            │       │        │
├──────┼─────────────────┼───────────────┼────────────┼───────┼────────┤
│  2   │ 项目名称B       │ ¥50万         │ [启动阶段] │ 30%   │  100   │
│      │ 客户：另一公司  │ 回款：¥10万   │            │       │        │
│      │ 3成员           │ ██ 20%        │            │       │        │
└──────┴─────────────────┴───────────────┴────────────┴───────┴────────┘
```

### 6.2 项目详情

```
┌─────────────────────────────────────────────────────────────────────┐
│ [←] 项目名称A                                    [公开] [编辑项目]   │
│     客户：某某公司                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ [概览] [功能模块] [里程碑] [风险] [供应商] [回款] [需求] [报告]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 项目基本信息                                                 │   │
│  │ 建设内容：xxx                                               │   │
│  │ 客户名称：xxx        项目金额：¥xxx（大写）                  │   │
│  │ 健康度：80分         可见性：公开                            │   │
│  │ 是否有外采：是       采购金额：¥xxx   已支付：¥xxx           │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │ 项目统计：[任务] [风险] [里程碑] [功能模块]                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 团队成员                                          [添加成员] │   │
│  │ ● 张三 (项目经理)    ● 李四 (团队成员)                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 里程碑管理

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐  ┌──────────────────────────────────────────────┐ │
│ │ 进场前阶段    │  │ 实施阶段                              [下载] │ │
│ │ 启动阶段 ●   │  │ 进度：60% | 任务：3/5                        │ │
│ │ 实施阶段     │  ├──────────────────────────────────────────────┤ │
│ │ 初验阶段     │  │ [搜索...] [全部状态] [全部类型] [新增任务]   │ │
│ │ ...          │  ├──────────────────────────────────────────────┤ │
│ │ [+ 新增阶段] │  │ ☑ 任务1 (必选)                    [附件 2]   │ │
│ └──────────────┘  │ ☐ 任务2 (可选)                    [上传]     │ │
│                   │ ☑ 任务3 (必选)                               │ │
│                   └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.4 供应商详情弹窗

```
┌─────────────────────────────────────────────────────────────────────┐
│ 供应商名称                              [X]                         │
│ 供应商详情管理                                                       │
├─────────────────────────────────────────────────────────────────────┤
│ [基本信息] [验收与付款]                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──────┐│
│  │ 合同金额    │ │ 已支付金额  │ │ 未支付金额  │ │未支付比例 │ │验收状态││
│  │ ¥100万     │ │ ¥60万      │ │ ¥40万      │ │ 40.0%    │ │初验完成││
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘ └──────┘│
│                                                                     │
│  供应商信息                                                          │
│  ─────────────────────────────────────────────────────────────────  │
│  供应商名称：XXX公司                    联系人：张三                 │
│  联系电话：138xxxxxx                    合同金额：¥100万 [调整]      │
│  负责模块：[模块A, 模块B, 模块C] [调整]                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.5 验收与付款Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌───────────────────────────────┐ ┌───────────────────────────────┐ │
│ │ 验收记录                      │ │ 付款管理                      │ │
│ │                               │ │                               │ │
│ │ [+ 新增验收]                  │ │ [+ 新增付款计划]              │ │
│ │                               │ │                               │ │
│ │ ┌───────────────────────────┐ │ │ 序号│ 时间      │ 金额    │状态│ │
│ │ │ [初验] [通过]             │ │ │ ───┼───────────┼─────────┼─── │ │
│ │ │ 2026-02-25                │ │ │ 1  │ 2026-03-01│ ¥30万  │待付│ │
│ │ │ [删除]                    │ │ │    │           │ 叁拾万  │[确认│ │
│ │ └───────────────────────────┘ │ │ 2  │ 2026-06-01│ ¥70万  │已付│ │
│ │                               │ │ │    │           │ 柒拾万  │[撤回│ │
│ │ ┌───────────────────────────┐ │ │                               │ │
│ │ │ [阶段性验收] [通过]       │ │ │                               │ │
│ │ │ 2026-01-15                │ │ │                               │ │
│ │ │ [删除]                    │ │ │                               │ │
│ │ └───────────────────────────┘ │ │                               │ │
│ │                               │ │                               │ │
│ └───────────────────────────────┘ └───────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

***

## 七、验收标准

### 7.1 功能验收

| 验收项   | 验收标准                 | 状态  |
| ----- | -------------------- | --- |
| 项目列表  | 显示所有项目，支持搜索筛选，显示回款比例 | 已实现 |
| 项目创建  | 创建后自动根据模板版本初始化里程碑    | 已实现 |
| 项目编辑  | 项目经理可编辑项目信息，支持客户选择   | 已实现 |
| 项目删除  | 项目经理可删除项目            | 已实现 |
| 功能模块  | 支持树形结构管理，Excel导入导出   | 已实现 |
| 里程碑   | 支持7个标准阶段，可自定义添加，任务管理 | 已实现 |
| 风险    | 风险登记、等级、状态管理，处置记录    | 已实现 |
| 供应商   | 供应商关联、付款计划、验收管理      | 已实现 |
| 回款管理  | 客户回款记录管理             | 已实现 |
| 合同外需求 | 需求登记与跟踪              | 已实现 |
| 健康度   | 根据风险自动计算             | 已实现 |

### 7.2 性能验收

| 验收项  | 标准         | 状态  |
| ---- | ---------- | --- |
| 列表加载 | < 3秒       | 已实现 |
| 详情加载 | < 2秒       | 已实现 |
| 创建项目 | < 5秒（含初始化） | 已实现 |

***

## 八、修订记录

| 版本  | 日期         | 修订内容                                                                       | 修订人          |
| --- | ---------- | -------------------------------------------------------------------------- | ------------ |
| 1.0 | 2025-02-09 | 初始版本                                                                       | AI Assistant |
| 2.0 | 2026-02-10 | 同步代码实现，更新项目列表、详情、里程碑、健康度计算                                                 | AI Assistant |
| 3.0 | 2026-02-25 | 全面更新与代码现状同步：新增回款管理、合同外需求Tab，更新里程碑模板版本机制，完善数据模型和类型定义，补充供应商Tab详细的验收管理和付款管理功能 | AI Assistant |

