import { db } from '../src/config/database';

async function fixVersionData() {
  console.log('修复版本数据...');

  try {
    // 1. 更新现有的 template_versions 记录
    await db('template_versions')
      .where('id', '26001b88-f99b-4784-9300-4f2b5f650274')
      .update({
        name: '标准项目里程碑模板',
        version_number: '1.0.0',
        description: '适用于一般项目的标准里程碑流程',
        is_active: true,
        updated_at: new Date()
      });
    console.log('✅ 已更新版本记录');

    // 2. 验证修复结果
    const version = await db('template_versions')
      .where('is_active', true)
      .first();
    console.log('当前激活版本:', version);

    // 3. 统计各版本的里程碑和任务数量
    const templates = await db('milestone_templates')
      .where('version_id', version.id)
      .select('*');
    
    console.log(`\n版本 "${version.name}" 包含:`);
    console.log(`- ${templates.length} 个里程碑阶段`);

    let totalTasks = 0;
    for (const t of templates) {
      const tasks = await db('milestone_task_templates')
        .where('milestone_template_id', t.id)
        .count('* as count')
        .first();
      totalTasks += parseInt(String(tasks?.count || '0'));
    }
    console.log(`- ${totalTasks} 个任务`);

    console.log('\n🎉 版本数据修复完成！');
  } catch (error) {
    console.error('修复失败:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

fixVersionData();
