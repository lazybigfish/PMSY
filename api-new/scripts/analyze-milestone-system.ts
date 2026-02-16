import { db } from '../src/config/database';

async function analyzeMilestoneSystem() {
  try {
    console.log('=== 分析里程碑系统实现 ===\n');

    // 1. 检查 template_versions 表
    console.log('1. 模板版本表 (template_versions):');
    const hasVersionTable = await db.schema.hasTable('template_versions');
    console.log('   表存在:', hasVersionTable);
    
    if (hasVersionTable) {
      const versions = await db('template_versions').select('*');
      console.log('   版本数量:', versions.length);
      for (const v of versions) {
        console.log(`   - ID: ${v.id}, 名称: ${v.name}, 版本号: ${v.version_number}, 激活: ${v.is_active}`);
      }
    }

    // 2. 检查 milestone_templates 表
    console.log('\n2. 里程碑模板表 (milestone_templates):');
    const templates = await db('milestone_templates').orderBy('phase_order').select('*');
    console.log('   模板数量:', templates.length);
    for (const t of templates) {
      console.log(`   - ${t.name} (ID: ${t.id}, 版本ID: ${t.version_id || 'null'}, 激活: ${t.is_active})`);
    }

    // 3. 检查 milestone_task_templates 表
    console.log('\n3. 任务模板表 (milestone_task_templates):');
    const taskTemplates = await db('milestone_task_templates').select('*');
    console.log('   任务模板数量:', taskTemplates.length);

    // 4. 检查 project_milestones 表结构
    console.log('\n4. 项目里程碑表 (project_milestones):');
    const projectMilestones = await db('project_milestones').select('*').limit(5);
    console.log('   示例数据:');
    for (const pm of projectMilestones) {
      console.log(`   - 项目: ${pm.project_id}, 阶段: ${pm.name}, 模板ID: ${pm.template_id || 'null'}`);
    }

    // 5. 检查项目创建时是否有触发器或钩子
    console.log('\n5. 检查数据库触发器:');
    const triggers = await db.raw(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE event_object_table = 'projects'
    `);
    console.log('   projects 表触发器数量:', triggers.rows.length);
    for (const t of triggers.rows) {
      console.log(`   - ${t.trigger_name} (${t.event_manipulation})`);
    }

    // 6. 统计各项目的里程碑数量
    console.log('\n6. 各项目的里程碑数量:');
    const stats = await db('project_milestones')
      .select('project_id')
      .count('* as count')
      .groupBy('project_id');
    for (const s of stats) {
      console.log(`   - 项目 ${s.project_id}: ${s.count} 个里程碑`);
    }

  } catch (error) {
    console.error('分析失败:', error);
  } finally {
    await db.destroy();
  }
}

analyzeMilestoneSystem();
