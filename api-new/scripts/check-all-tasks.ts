import { db } from '../src/config/database';

async function checkAllTasks() {
  try {
    // 检查所有任务
    const allTasks = await db('milestone_tasks').select('*');
    console.log('所有 milestone_tasks:');
    console.log(allTasks.map(t => ({
      id: t.id,
      name: t.name,
      milestone_id: t.milestone_id,
      template_id: t.template_id
    })));

    // 检查所有里程碑
    const allMilestones = await db('project_milestones').select('*');
    console.log(`\n所有 project_milestones (${allMilestones.length}个):`);
    console.log(allMilestones.map(m => ({
      id: m.id,
      name: m.name,
      project_id: m.project_id,
      template_id: m.template_id
    })));

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await db.destroy();
  }
}

checkAllTasks();
