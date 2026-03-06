import { db } from '../src/config/database';

async function test() {
  const templateId = '29523a04-f6aa-47c8-828f-70e294a8f2f2';
  
  try {
    console.log('Testing template detail API for ID:', templateId);
    
    // 查询模板基本信息
    const template = await db('template_versions')
      .where('id', templateId)
      .select('id', 'name', 'version_number as version', 'description', 'created_at')
      .first();
    
    console.log('Template found:', template);
    
    if (!template) {
      console.log('Template not found!');
      return;
    }
    
    // 查询阶段列表
    const phases = await db('milestone_templates')
      .where('version_id', templateId)
      .orderBy('phase_order')
      .select('id', 'name', 'description', 'phase_order as order');
    
    console.log('Phases found:', phases.length);
    
    // 查询每个阶段的任务
    for (const phase of phases) {
      const tasks = await db('milestone_task_templates')
        .where('milestone_template_id', phase.id)
        .orderBy('sort_order')
        .select('id', 'name', 'description', 'is_required', 'output_documents', 'sort_order');
      
      console.log(`  Phase "${phase.name}": ${tasks.length} tasks`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
