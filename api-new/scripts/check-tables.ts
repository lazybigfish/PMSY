import { db } from '../src/config/database';

async function checkTables() {
  try {
    // 检查 milestone_task_templates 表结构
    const columns = await db.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'milestone_task_templates'
      ORDER BY ordinal_position
    `);
    console.log('milestone_task_templates 表结构:');
    console.log(columns.rows);

    // 检查 milestone_tasks 表结构
    const taskColumns = await db.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'milestone_tasks'
      ORDER BY ordinal_position
    `);
    console.log('\nmilestone_tasks 表结构:');
    console.log(taskColumns.rows);

    // 检查表是否存在
    const hasTable = await db.schema.hasTable('milestone_task_templates');
    console.log('\nmilestone_task_templates 表存在:', hasTable);

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await db.destroy();
  }
}

checkTables();
