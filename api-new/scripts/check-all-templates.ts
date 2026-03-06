import { db } from '../src/config/database';

async function check() {
  try {
    // 查询所有模板
    const templates = await db('template_versions')
      .select('*');
    
    console.log('All Templates:');
    for (const t of templates) {
      console.log(`\n  Name: ${t.name}`);
      console.log(`  ID: ${t.id}`);
      console.log(`  created_by: ${t.created_by}`);
      console.log(`  version_name: ${t.version_name}`);
      console.log(`  version_number: ${t.version_number}`);
      console.log(`  is_active: ${t.is_active}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
