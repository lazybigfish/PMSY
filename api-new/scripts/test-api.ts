import { db } from '../src/config/database';

async function testAPI() {
  try {
    console.log('测试 API 数据...\n');

    // 1. 获取当前激活的版本
    const activeVersion = await db('template_versions')
      .where('is_active', true)
      .first();
    console.log('1. 当前激活版本:', activeVersion);

    // 2. 获取里程碑模板
    const milestoneTemplates = await db('milestone_templates')
      .where('version_id', activeVersion.id)
      .where('is_active', true)
      .orderBy('phase_order')
      .select('*');
    console.log(`\n2. 里程碑模板数量: ${milestoneTemplates.length}`);

    // 3. 获取第一个里程碑的任务
    if (milestoneTemplates.length > 0) {
      const tasks = await db('milestone_task_templates')
        .where('milestone_template_id', milestoneTemplates[0].id)
        .orderBy('sort_order')
        .select('*');
      console.log(`\n3. 第一个里程碑 "${milestoneTemplates[0].name}" 的任务:`);
      tasks.forEach((t: any, i: number) => {
        console.log(`   ${i + 1}. ${t.name}`);
      });
    }

    console.log('\n✅ API 数据测试完成！');
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await db.destroy();
  }
}

testAPI();
