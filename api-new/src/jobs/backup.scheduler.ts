/**
 * 定时备份调度器
 * 使用 node-cron 实现定时备份任务
 */

import cron from 'node-cron';
import { createBackup, getBackupList } from '../services/backup/BackupService';
import { query } from '../services/dbService';
import { BackupScheduleConfig } from '../types/backup.types';

// 定时任务实例
let scheduledTask: cron.ScheduledTask | null = null;

// 系统管理员ID（用于定时备份）
const SYSTEM_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

/**
 * 获取定时备份配置
 */
async function getScheduleConfig(): Promise<BackupScheduleConfig | null> {
  try {
    const configs = await query('system_settings', {
      eq: { key: 'backup_schedule' },
      limit: 1,
    });

    if (configs.length === 0) {
      return null;
    }

    return configs[0].value as BackupScheduleConfig;
  } catch (error) {
    console.error('获取定时备份配置失败:', error);
    return null;
  }
}

/**
 * 执行定时备份
 */
async function executeScheduledBackup(): Promise<void> {
  console.log('[定时备份] 开始执行定时备份任务...');

  try {
    const config = await getScheduleConfig();
    if (!config) {
      console.error('[定时备份] 无法获取配置，跳过本次备份');
      return;
    }

    // 生成备份名称
    const now = new Date();
    const backupName = `scheduled_backup_${now.toISOString().replace(/[:.]/g, '-')}`;
    const description = `定时自动备份 - ${now.toLocaleString('zh-CN')}`;

    // 执行备份
    await createBackup(SYSTEM_ADMIN_ID, backupName, description, config.options);

    console.log('[定时备份] 定时备份任务完成');
  } catch (error) {
    console.error('[定时备份] 定时备份任务失败:', error);
  }
}

/**
 * 验证 cron 表达式是否有效
 */
function isValidCron(cronExpression: string): boolean {
  return cron.validate(cronExpression);
}

/**
 * 初始化定时备份调度器
 */
export async function initBackupScheduler(): Promise<void> {
  console.log('[定时备份] 初始化定时备份调度器...');

  // 停止现有任务
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  // 获取配置
  const config = await getScheduleConfig();
  if (!config) {
    console.log('[定时备份] 未找到定时备份配置');
    return;
  }

  // 检查是否启用
  if (!config.enabled) {
    console.log('[定时备份] 定时备份已禁用');
    return;
  }

  // 验证 cron 表达式
  if (!isValidCron(config.cron)) {
    console.error(`[定时备份] 无效的 cron 表达式: ${config.cron}`);
    return;
  }

  // 创建定时任务
  try {
    scheduledTask = cron.schedule(
      config.cron,
      executeScheduledBackup,
      {
        scheduled: true,
        timezone: config.timeZone || 'Asia/Shanghai',
      }
    );

    console.log(`[定时备份] 定时备份已启动，执行计划: ${config.cron} (${config.timeZone || 'Asia/Shanghai'})`);
  } catch (error) {
    console.error('[定时备份] 启动定时备份失败:', error);
  }
}

/**
 * 停止定时备份调度器
 */
export function stopBackupScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[定时备份] 定时备份已停止');
  }
}

/**
 * 重启定时备份调度器
 */
export async function restartBackupScheduler(): Promise<void> {
  console.log('[定时备份] 重启定时备份调度器...');
  stopBackupScheduler();
  await initBackupScheduler();
}

/**
 * 立即执行一次备份
 */
export async function runBackupNow(): Promise<void> {
  console.log('[定时备份] 手动触发备份...');
  await executeScheduledBackup();
}

/**
 * 获取定时备份状态
 */
export async function getSchedulerStatus(): Promise<{
  running: boolean;
  cron?: string;
  timezone?: string;
}> {
  const config = scheduledTask ? await getScheduleConfig() : null;
  return {
    running: scheduledTask !== null,
    cron: config?.cron,
    timezone: config?.timeZone,
  };
}

export default {
  initBackupScheduler,
  stopBackupScheduler,
  restartBackupScheduler,
  runBackupNow,
  getSchedulerStatus,
};
