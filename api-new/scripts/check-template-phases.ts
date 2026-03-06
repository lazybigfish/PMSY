import { db } from '../src/config/database';

async function check() {
  const versionId = '26001b88-f99b-4784-9300-4f2b5f650274';
  
  try {
    console.log('Checking template version:', versionId);
    
    // 查询模板版本
    const version = await db('template_versions')
      .where('id', versionId)
      .select('id', 'name', 'version_number', 'is_active')
      .first();
    console.log('Template version:', version);
    
    // 查询阶段（不带 is_active 条件）
    const allPhases = await db('milestone_templates')
      .where('version_id', versionId)
      .orderBy('phase_order')
      .select('id', 'name', 'phase_order', 'is_active');
    console.log('\nAll phases (without is_active filter):', allPhases.length);
    allPhases.forEach((p: any) => console.log('  -', p.name, '(is_active:', p.is_active + ')'));
    
    // 查询阶段（带 is_active = true 条件）
    const activePhases = await db('milestone_templates')
      .where('version_id', versionId)
      .where('is_active', true)
      .orderBy('phase_order')
      .select('id', 'name', 'phase_order', 'is_active');
    console.log('\nActive phases (with is_active = true):', activePhases.length);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
