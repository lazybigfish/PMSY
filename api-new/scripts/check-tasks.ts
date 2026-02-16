import { db } from '../src/config/database';

async function checkTasks() {
  try {
    // 检查项目里程碑
    const projectId = 'd8c4dc32-1511-4b4b-a54b-2dea31a21e16';
    const milestones = await db('project_milestones')
      .where('project_id', projectId)
      .select('*');
    
    console.log(`项目 ${projectId} 的里程碑:`);
    console.log(milestones.map(m => ({ id: m.id, name: m.name, template_id: m.template_id })));

    // 检查每个里程碑的任务
    for (const milestone of milestones) {
      const tasks = await db('milestone_tasks')
        .where('milestone_id', milestone.id)
        .select('*');
      console.log(`\n里程碑 "${milestone.name}" (${milestone.id}) 的任务:`);
      console.log(tasks.map(t => ({ id: t.id, name: t.name, milestone_id: t.milestone_id })));
    }

    // 统计
    const totalTasks = await db('milestone_tasks').count('* as count').first();
    console.log(`\n总任务数: ${totalTasks?.count}`);

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await db.destroy();
  }
}

checkTasks();
