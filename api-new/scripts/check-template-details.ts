import { db } from '../src/config/database';

async function check() {
  try {
    // 查询所有模板
    const templates = await db('template_versions')
      .select('id', 'name', 'version_number');
    
    console.log('Templates and their phases:');
    for (const t of templates) {
      const phases = await db('milestone_templates')
        .where('version_id', t.id)
        .select('id', 'name', 'phase_order');
      
      console.log(`\n  ${t.name} (v${t.version_number}):`);
      console.log(`    ID: ${t.id}`);
      console.log(`    Phases: ${phases.length}`);
      phases.forEach((p: any) => {
        console.log(`      - ${p.name} (order: ${p.phase_order})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
