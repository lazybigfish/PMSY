import { db } from '../src/config/database';

async function checkTemplates() {
  try {
    // 检查里程碑模板
    const milestoneTemplates = await db('milestone_templates')
      .orderBy('phase_order')
      .select('*');
    
    console.log('=== 里程碑模板 ===');
    console.log(`共 ${milestoneTemplates.length} 个模板`);
    for (const mt of milestoneTemplates) {
      console.log(`\n阶段 ${mt.phase_order}: ${mt.name} (ID: ${mt.id})`);
      
      // 检查对应的任务模板
      const taskTemplates = await db('milestone_task_templates')
        .where('milestone_template_id', mt.id)
        .orderBy('sort_order')
        .select('*');
      
      console.log(`  任务 (${taskTemplates.length}个):`);
      for (const tt of taskTemplates) {
        console.log(`    - ${tt.name} (${tt.is_required ? '必选' : '可选'})`);
        console.log(`      描述: ${tt.description}`);
        console.log(`      输出物: ${JSON.stringify(tt.output_documents)}`);
      }
    }

    // 检查 template_versions 表
    const hasVersionTable = await db.schema.hasTable('template_versions');
    console.log('\n\n=== 模板版本表 ===');
    console.log('template_versions 表存在:', hasVersionTable);
    
    if (hasVersionTable) {
      const versions = await db('template_versions').select('*');
      console.log(`共 ${versions.length} 个版本`);
      for (const v of versions) {
        console.log(`- ${v.name} (v${v.version_number}, 激活: ${v.is_active})`);
      }
    }

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await db.destroy();
  }
}

checkTemplates();
