# 系统数据备份与迁移功能任务拆解

## 任务清单

### 阶段一：数据库与基础架构

- [ ] **任务1.1**: 创建备份记录表 migration
  - 文件: `api-new/database/migrations/040_create_backup_records.sql`
  - 内容: 创建 backup_records 表及索引

- [ ] **任务1.2**: 添加定时备份配置到系统设置
  - 文件: `api-new/database/migrations/041_add_backup_schedule_config.sql`
  - 内容: 在 system_settings 中插入默认定时备份配置

- [ ] **任务1.3**: 创建备份相关类型定义
  - 文件: `api-new/src/types/backup.types.ts`
  - 内容: BackupRecord, BackupManifest, BackupOptions 等类型

- [ ] **任务1.4**: 创建前端备份类型定义
  - 文件: `src/types/backup.ts`
  - 内容: 前端使用的备份相关类型

### 阶段二：后端核心服务

- [ ] **任务2.1**: 实现 BackupService - 数据库导出
  - 文件: `api-new/src/services/backup/BackupService.ts`
  - 功能: 导出所有表数据为 JSON，处理数据依赖顺序

- [ ] **任务2.2**: 实现 FileCollector - 文件收集
  - 文件: `api-new/src/services/backup/FileCollector.ts`
  - 功能: 收集所有上传的文件资源

- [ ] **任务2.3**: 实现 BackupService - 打包与存储
  - 文件: `api-new/src/services/backup/BackupService.ts`
  - 功能: 生成 manifest.json，打包 ZIP，保存到 /backups/

- [ ] **任务2.4**: 实现 RestoreService - 预览功能
  - 文件: `api-new/src/services/backup/RestoreService.ts`
  - 功能: 解压备份包，验证 manifest，生成预览信息

- [ ] **任务2.5**: 实现 RestoreService - 数据恢复
  - 文件: `api-new/src/services/backup/RestoreService.ts`
  - 功能: 全量覆盖/增量合并恢复，事务处理

- [ ] **任务2.6**: 实现 ManifestValidator
  - 文件: `api-new/src/services/backup/validators/ManifestValidator.ts`
  - 功能: 验证备份包格式和完整性

- [ ] **任务2.7**: 实现 VersionChecker
  - 文件: `api-new/src/services/backup/validators/VersionChecker.ts`
  - 功能: 版本兼容性检查

### 阶段三：后端 API 路由

- [ ] **任务3.1**: 实现备份管理路由
  - 文件: `api-new/src/routes/system/backup.routes.ts`
  - 接口: POST /api/system/backup, GET /api/system/backup, DELETE /api/system/backup/:id

- [ ] **任务3.2**: 实现备份下载路由
  - 文件: `api-new/src/routes/system/backup.routes.ts`
  - 接口: GET /api/system/backup/:id/download (流式下载)

- [ ] **任务3.3**: 实现恢复路由
  - 文件: `api-new/src/routes/system/backup.routes.ts`
  - 接口: POST /api/system/restore/preview, POST /api/system/restore

- [ ] **任务3.4**: 实现定时备份配置路由
  - 文件: `api-new/src/routes/system/backup.routes.ts`
  - 接口: GET /api/system/backup/schedule, PUT /api/system/backup/schedule

- [ ] **任务3.5**: 注册备份路由到主应用
  - 文件: `api-new/src/app.ts`
  - 内容: 添加 backup.routes 到路由注册

### 阶段四：定时备份任务

- [ ] **任务4.1**: 实现定时备份调度器
  - 文件: `api-new/src/jobs/backup.scheduler.ts`
  - 功能: node-cron 定时任务，自动执行备份

- [ ] **任务4.2**: 集成定时备份到应用启动
  - 文件: `api-new/src/index.ts`
  - 内容: 应用启动时初始化定时备份任务

### 阶段五：前端 API 服务

- [ ] **任务5.1**: 实现备份 API 封装
  - 文件: `src/services/backupApi.ts`
  - 功能: 封装所有备份相关 API 调用

### 阶段六：前端 UI 组件

- [ ] **任务6.1**: 创建备份列表组件
  - 文件: `src/pages/system/tabs/DataBackup/BackupList.tsx`
  - 功能: 显示备份列表，支持下载、删除

- [ ] **任务6.2**: 创建创建备份弹窗组件
  - 文件: `src/pages/system/tabs/DataBackup/CreateBackupModal.tsx`
  - 功能: 填写备份名称、描述，选择备份选项

- [ ] **任务6.3**: 创建恢复面板组件
  - 文件: `src/pages/system/tabs/DataBackup/RestorePanel.tsx`
  - 功能: 上传备份包，预览，选择恢复模式，执行恢复

- [ ] **任务6.4**: 创建定时备份设置组件
  - 文件: `src/pages/system/tabs/DataBackup/ScheduleSettings.tsx`
  - 功能: 启用/禁用定时备份，设置备份时间

- [ ] **任务6.5**: 创建数据备份主组件
  - 文件: `src/pages/system/tabs/DataBackup/index.tsx`
  - 功能: 整合备份列表、恢复面板、定时设置

- [ ] **任务6.6**: 修改系统设置页面
  - 文件: `src/pages/system/SystemSettings.tsx`
  - 内容: 添加「数据备份」标签页

### 阶段七：测试与优化

- [ ] **任务7.1**: 测试备份功能
  - 验证: 创建备份、下载备份、备份包完整性

- [ ] **任务7.2**: 测试恢复功能
  - 验证: 上传备份包、预览、全量恢复、增量恢复

- [ ] **任务7.3**: 测试定时备份
  - 验证: 定时任务触发、保留策略生效

- [ ] **任务7.4**: 测试边缘情况
  - 验证: 并发备份、磁盘满、版本不兼容

- [ ] **任务7.5**: 性能优化
  - 内容: 大文件处理优化、内存使用优化

### 阶段八：文档与部署

- [ ] **任务8.1**: 创建功能使用文档
  - 文件: `.agent/records/2026-03-02/数据备份功能使用说明.md`

- [ ] **任务8.2**: 更新项目开发日报
  - 文件: `.agent/records/2026-03-02/项目开发日报.md`

- [ ] **任务8.3**: 验证部署配置
  - 内容: 确保 backups 目录权限正确

## 依赖关系

```
任务1.1 → 任务1.2 → 任务2.1 → 任务2.2 → 任务2.3 → 任务3.1 → 任务3.2
                                              ↓
任务1.3 → 任务2.4 → 任务2.5 → 任务3.3 → 任务5.1 → 任务6.1 → 任务6.5 → 任务6.6
                                              ↓
任务2.6 → 任务2.7 → 任务3.3                    ↓
                                              ↓
任务1.4 → 任务5.1 → 任务6.2 → 任务6.5          ↓
                                              ↓
任务4.1 → 任务4.2 → 任务3.4 → 任务6.3 → 任务6.5
                                              ↓
                                    任务6.4 → 任务6.5
```

## 执行建议

1. **按阶段顺序执行**：先完成数据库和基础架构，再实现后端服务，最后前端 UI
2. **并行开发**：任务2.x 和任务3.x 可以并行进行
3. **及时测试**：每完成一个核心功能立即测试
4. **注意依赖**：任务6.5 依赖前面所有 UI 组件完成

## 预估工时

| 阶段 | 预估工时 |
|------|----------|
| 阶段一：数据库与基础架构 | 0.5 天 |
| 阶段二：后端核心服务 | 1.5 天 |
| 阶段三：后端 API 路由 | 0.5 天 |
| 阶段四：定时备份任务 | 0.5 天 |
| 阶段五：前端 API 服务 | 0.25 天 |
| 阶段六：前端 UI 组件 | 1 天 |
| 阶段七：测试与优化 | 0.5 天 |
| 阶段八：文档与部署 | 0.25 天 |
| **总计** | **约 5 天** |
