/**
 * 领域服务层统一导出
 * 
 * 所有 API 调用都通过服务层进行
 */

// 认证服务
export { authService } from './authService';

// 用户服务
export { userService } from './userService';

// 角色权限服务
export { roleService } from './roleService';

// 任务服务
export { taskService } from './taskService';

// 项目服务
export { projectService } from './projectService';

// 文件服务
export { fileService } from './fileService';

// 系统配置服务
export { systemService } from './systemService';

// 论坛服务
export { forumService } from './forumService';

// 供应商服务
export { supplierService } from './supplierService';

// 客户服务
export { clientService } from './clientService';

// 分析报表服务
export { analysisService } from './analysisService';

// 通知服务
export { notificationService } from './notificationService';
