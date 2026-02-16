import { db } from '../src/config/database';

async function restoreMilestoneTasks() {
  console.log('开始恢复正确的里程碑任务...');

  try {
    // 1. 删除我之前创建的虚构任务（通过名称识别）
    const fakeTaskNames = ['任务规划', '执行与监控', '阶段评审'];
    const deleted = await db('milestone_tasks')
      .whereIn('name', fakeTaskNames)
      .delete();
    console.log(`✅ 已删除 ${deleted} 个虚构任务`);

    // 2. 获取所有里程碑模板
    const milestoneTemplates = await db('milestone_templates')
      .orderBy('phase_order')
      .select('*');

    console.log(`\n找到 ${milestoneTemplates.length} 个里程碑模板`);

    // 3. 为每个项目创建正确的里程碑和任务
    const projects = await db('projects').select('id');
    console.log(`\n找到 ${projects.length} 个项目`);

    for (const project of projects) {
      // 检查项目是否已有里程碑
      const existingMilestones = await db('project_milestones')
        .where('project_id', project.id)
        .select('*');

      if (existingMilestones.length === 0) {
        // 项目没有里程碑，创建新的
        console.log(`\n为项目 ${project.id} 创建里程碑...`);

        for (let i = 0; i < milestoneTemplates.length; i++) {
          const template = milestoneTemplates[i];

          // 创建项目里程碑
          const [milestone] = await db('project_milestones')
            .insert({
              project_id: project.id,
              template_id: template.id,
              name: template.name,
              status: i === 0 ? 'in_progress' : 'pending',
              phase_order: template.phase_order,
              is_current: i === 0,
              created_at: new Date(),
              updated_at: new Date(),
            })
            .returning('id');

          // 根据模板创建任务
          const taskTemplates = await db('milestone_task_templates')
            .where('milestone_template_id', template.id)
            .orderBy('sort_order')
            .select('*');

          for (const taskTemplate of taskTemplates) {
            await db('milestone_tasks').insert({
              milestone_id: milestone.id,
              template_id: template.id,
              name: taskTemplate.name,
              description: taskTemplate.description,
              is_required: taskTemplate.is_required,
              output_documents: JSON.stringify(taskTemplate.output_documents || []),
              sort_order: taskTemplate.sort_order,
              is_completed: false,
              created_at: new Date(),
              updated_at: new Date(),
            });
          }

          console.log(`  ✅ ${template.name}: 创建 ${taskTemplates.length} 个任务`);
        }
      } else {
        // 项目已有里程碑，检查是否需要创建任务
        console.log(`\n项目 ${project.id} 已有 ${existingMilestones.length} 个里程碑，检查任务...`);

        for (const milestone of existingMilestones) {
          // 检查里程碑是否已有任务
          const existingTasks = await db('milestone_tasks')
            .where('milestone_id', milestone.id)
            .select('*');

          if (existingTasks.length === 0) {
            // 找到对应的模板
            const template = milestoneTemplates.find(
              (t: any) => t.id === milestone.template_id || t.name === milestone.name
            );

            if (template) {
              // 根据模板创建任务
              const taskTemplates = await db('milestone_task_templates')
                .where('milestone_template_id', template.id)
                .orderBy('sort_order')
                .select('*');

              for (const taskTemplate of taskTemplates) {
                await db('milestone_tasks').insert({
                  milestone_id: milestone.id,
                  template_id: template.id,
                  name: taskTemplate.name,
                  description: taskTemplate.description,
                  is_required: taskTemplate.is_required,
                  output_documents: JSON.stringify(taskTemplate.output_documents || []),
                  sort_order: taskTemplate.sort_order,
                  is_completed: false,
                  created_at: new Date(),
                  updated_at: new Date(),
                });
              }

              console.log(`  ✅ ${milestone.name}: 创建 ${taskTemplates.length} 个任务`);
            } else {
              console.log(`  ⚠️ ${milestone.name}: 未找到对应模板，跳过`);
            }
          } else {
            console.log(`  ✓ ${milestone.name}: 已有 ${existingTasks.length} 个任务`);
          }
        }
      }
    }

    // 4. 统计结果
    const totalTasks = await db('milestone_tasks').count('* as count').first();
    console.log(`\n🎉 修复完成！当前共有 ${totalTasks?.count} 个里程碑任务`);

  } catch (error) {
    console.error('修复失败:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

restoreMilestoneTasks();
