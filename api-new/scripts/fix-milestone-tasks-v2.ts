import { db } from '../src/config/database';

async function fixMilestoneTasksV2() {
  console.log('开始为所有里程碑创建任务...');

  try {
    // 1. 确保 milestone_id 字段存在
    await db.raw(`
      ALTER TABLE milestone_tasks 
      ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES project_milestones(id) ON DELETE CASCADE
    `);
    console.log('✅ 已确保 milestone_id 字段存在');

    // 2. 创建索引
    await db.raw(`
      CREATE INDEX IF NOT EXISTS idx_milestone_tasks_milestone_id ON milestone_tasks(milestone_id)
    `);
    console.log('✅ 已创建索引');

    // 3. 获取所有没有任务的里程碑
    const milestonesWithoutTasks = await db('project_milestones')
      .leftJoin('milestone_tasks', 'project_milestones.id', 'milestone_tasks.milestone_id')
      .whereNull('milestone_tasks.id')
      .select('project_milestones.id', 'project_milestones.name', 'project_milestones.template_id');

    console.log(`找到 ${milestonesWithoutTasks.length} 个没有任务的里程碑`);

    // 4. 为每个里程碑创建默认任务
    const defaultTasks = [
      {
        name: '任务规划',
        description: '制定阶段任务计划，明确目标和交付物',
        is_required: true,
        output_documents: [{ name: '任务计划书', required: true }],
      },
      {
        name: '执行与监控',
        description: '执行阶段任务并监控进度',
        is_required: true,
        output_documents: [{ name: '进度报告', required: true }],
      },
      {
        name: '阶段评审',
        description: '完成阶段评审并输出评审报告',
        is_required: true,
        output_documents: [{ name: '评审报告', required: true }],
      },
    ];

    for (const milestone of milestonesWithoutTasks) {
      // 如果有 template_id，尝试从模板获取任务
      let tasksToCreate = defaultTasks;

      if (milestone.template_id) {
        const templateTasks = await db('milestone_task_templates')
          .where('milestone_template_id', milestone.template_id)
          .select('*');

        if (templateTasks.length > 0) {
          tasksToCreate = templateTasks.map((tt: any) => ({
            name: tt.name,
            description: tt.description,
            is_required: tt.is_required,
            output_documents: tt.output_documents || [],
          }));
        }
      }

      // 创建任务
      for (let i = 0; i < tasksToCreate.length; i++) {
        const task = tasksToCreate[i];
        await db('milestone_tasks').insert({
          milestone_id: milestone.id,
          template_id: milestone.template_id,
          name: task.name,
          description: task.description,
          is_required: task.is_required,
          output_documents: JSON.stringify(task.output_documents),
          sort_order: i,
          is_completed: false,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      console.log(`✅ 已为 "${milestone.name}" 创建 ${tasksToCreate.length} 个任务`);
    }

    console.log('\n🎉 修复完成！');
  } catch (error) {
    console.error('修复失败:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

fixMilestoneTasksV2();
