/**
 * 项目初始化服务
 * 负责创建项目时自动初始化里程碑阶段和任务
 */

import { db } from '../config/database';
import { logger } from '../utils/logger';

export interface ProjectInitData {
  projectId: string;
  createdBy: string;
}

export interface MilestoneTemplate {
  id: string;
  name: string;
  phase_order: number;
  description?: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  is_required: boolean;
  output_documents: any[];
  sort_order: number;
}

/**
 * 根据里程碑模板初始化项目里程碑和任务
 */
export async function initializeProjectMilestones(
  projectId: string,
  createdBy: string
): Promise<{ success: boolean; firstMilestoneId?: string; error?: string }> {
  const trx = await db.transaction();

  try {
    // 1. 获取当前激活的模板版本
    const activeVersion = await trx('template_versions')
      .where('is_active', true)
      .first();

    if (!activeVersion) {
      await trx.rollback();
      return { success: false, error: '没有激活的里程碑模板版本' };
    }

    logger.info(`[ProjectInit] 使用模板版本: ${activeVersion.name} (v${activeVersion.version_number})`);

    // 2. 获取该版本的所有里程碑模板
    const milestoneTemplates = await trx('milestone_templates')
      .where('version_id', activeVersion.id)
      .where('is_active', true)
      .orderBy('phase_order')
      .select('*');

    if (milestoneTemplates.length === 0) {
      await trx.rollback();
      return { success: false, error: '模板版本中没有里程碑' };
    }

    logger.info(`[ProjectInit] 找到 ${milestoneTemplates.length} 个里程碑模板`);

    // 3. 创建项目里程碑
    const milestoneInserts = milestoneTemplates.map((template: any) => ({
      project_id: projectId,
      template_id: template.id,
      name: template.name,
      description: template.description || `项目阶段 ${template.phase_order}: ${template.name}`,
      status: template.phase_order === 1 ? 'in_progress' : 'pending',
      phase_order: template.phase_order,
      is_current: template.phase_order === 1,
      created_by: createdBy,
    }));

    const createdMilestones = await trx('project_milestones')
      .insert(milestoneInserts)
      .returning('*');

    logger.info(`[ProjectInit] 创建了 ${createdMilestones.length} 个项目里程碑`);

    // 4. 获取第一个里程碑的 ID（用于设置项目的当前里程碑）
    const firstMilestone = createdMilestones.find((m: any) => m.phase_order === 1);
    const firstMilestoneId = firstMilestone?.id;

    // 5. 为每个里程碑创建任务
    let totalTasks = 0;
    for (let i = 0; i < milestoneTemplates.length; i++) {
      const template = milestoneTemplates[i];
      const milestone = createdMilestones[i];

      // 获取任务模板
      const taskTemplates = await trx('milestone_task_templates')
        .where('milestone_template_id', template.id)
        .orderBy('sort_order')
        .select('*');

      if (taskTemplates.length === 0) {
        logger.warn(`[ProjectInit] 里程碑模板 ${template.name} 没有任务模板`);
        continue;
      }

      // 准备任务数据
      const taskInserts = taskTemplates.map((taskTemplate: any, index: number) => {
        // 确保 output_documents 是正确的 JSON 格式
        let outputDocs = taskTemplate.output_documents;
        if (typeof outputDocs === 'string') {
          try {
            outputDocs = JSON.parse(outputDocs);
          } catch (e) {
            logger.warn(`[ProjectInit] 解析 output_documents 失败，使用空数组: ${taskTemplate.name}`);
            outputDocs = [];
          }
        }

        return {
          milestone_id: milestone.id,
          template_id: taskTemplate.id,
          name: taskTemplate.name,
          description: taskTemplate.description,
          is_required: taskTemplate.is_required,
          output_documents: JSON.stringify(outputDocs), // 确保是 JSON 字符串
          sort_order: taskTemplate.sort_order || index,
          status: 'pending',
          created_by: createdBy,
        };
      });

      // 批量插入任务
      await trx('milestone_tasks').insert(taskInserts);
      totalTasks += taskInserts.length;

      logger.info(`[ProjectInit] 里程碑 ${template.name} 创建了 ${taskInserts.length} 个任务`);
    }

    // 6. 更新项目的当前里程碑
    if (firstMilestoneId) {
      await trx('projects')
        .where('id', projectId)
        .update({ current_milestone_id: firstMilestoneId });
      logger.info(`[ProjectInit] 设置项目当前里程碑: ${firstMilestoneId}`);
    }

    // 提交事务
    await trx.commit();

    logger.info(`[ProjectInit] 项目初始化完成: ${projectId}, 共创建 ${createdMilestones.length} 个里程碑, ${totalTasks} 个任务`);

    return {
      success: true,
      firstMilestoneId,
    };
  } catch (error) {
    // 回滚事务
    await trx.rollback();

    const errorMessage = error instanceof Error ? error.message : '未知错误';
    logger.error(`[ProjectInit] 项目初始化失败: ${errorMessage}`, error);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 检查项目是否已经初始化过里程碑
 */
export async function isProjectInitialized(projectId: string): Promise<boolean> {
  const count = await db('project_milestones')
    .where('project_id', projectId)
    .count('id as count')
    .first();

  return (count?.count as number) > 0;
}
