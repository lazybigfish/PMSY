import { db } from '../src/config/database';

async function test() {
  try {
    // 模拟 API 查询
    const templates = await db('template_versions')
      .where('is_active', true)
      .select('id', 'name', 'version_number as version', 'description', 'created_at', 'created_by');
    
    console.log('Templates from API query:');
    for (const t of templates) {
      console.log(`  ${t.name}: created_by = ${t.created_by}`);
    }
    
    // 获取创建者信息
    const createdByIds = templates.map((t: any) => t.created_by).filter(Boolean);
    console.log('\nCreated by IDs:', createdByIds);
    
    let creatorMap = new Map();
    if (createdByIds.length > 0) {
      const creators = await db('profiles')
        .whereIn('id', createdByIds)
        .select('id', 'full_name', 'username');
      console.log('\nCreators from profiles:');
      creators.forEach((c: any) => {
        console.log(`  ${c.id}: ${c.full_name || c.username}`);
        creatorMap.set(c.id, c.full_name || c.username || '系统管理员');
      });
    }
    
    // 模拟最终返回的数据
    console.log('\nFinal result:');
    for (const t of templates) {
      const createdByName = creatorMap.get(t.created_by) || '系统管理员';
      console.log(`  ${t.name}: created_by_name = ${createdByName}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
