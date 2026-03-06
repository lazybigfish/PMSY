import { db } from '../src/config/database';

async function check() {
  try {
    // 查询所有模板及其创建者
    const templates = await db('template_versions')
      .select('id', 'name', 'created_by');
    
    console.log('Templates:');
    for (const t of templates) {
      console.log(`  ${t.name}: created_by = ${t.created_by}`);
      
      // 查询创建者信息
      if (t.created_by) {
        const profile = await db('profiles')
          .where('id', t.created_by)
          .select('id', 'full_name', 'username', 'email')
          .first();
        console.log(`    Profile:`, profile);
        
        // 查询用户角色
        const roles = await db('user_roles')
          .where('user_id', t.created_by)
          .join('roles', 'user_roles.role_id', 'roles.id')
          .select('roles.name');
        console.log(`    Roles:`, roles.map((r: any) => r.name));
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
