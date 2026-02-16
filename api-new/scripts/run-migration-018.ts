import { db } from '../src/config/database';

async function runMigration018() {
  console.log('运行迁移 018_fix_template_versions...');

  try {
    // 1. 检查并添加缺失的字段
    const columns = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'template_versions'
    `);
    
    const existingColumns = columns.rows.map((r: any) => r.column_name);
    console.log('现有字段:', existingColumns);

    // 添加缺失的字段
    if (!existingColumns.includes('name')) {
      await db.raw(`ALTER TABLE template_versions ADD COLUMN name TEXT`);
      console.log('✅ 添加 name 字段');
    }
    if (!existingColumns.includes('description')) {
      await db.raw(`ALTER TABLE template_versions ADD COLUMN description TEXT`);
      console.log('✅ 添加 description 字段');
    }
    if (!existingColumns.includes('version_number')) {
      await db.raw(`ALTER TABLE template_versions ADD COLUMN version_number TEXT`);
      console.log('✅ 添加 version_number 字段');
    }
    if (!existingColumns.includes('is_active')) {
      await db.raw(`ALTER TABLE template_versions ADD COLUMN is_active BOOLEAN DEFAULT false`);
      console.log('✅ 添加 is_active 字段');
    }

    // 2. 更新现有的版本记录
    const updated = await db('template_versions')
      .where('id', '26001b88-f99b-4784-9300-4f2b5f650274')
      .update({
        name: '标准项目里程碑模板 v1.0',
        version_number: '1.0.0',
        description: '适用于一般项目的标准里程碑流程模板',
        is_active: true,
        updated_at: new Date()
      });

    if (updated === 0) {
      // 插入默认版本
      await db('template_versions').insert({
        id: '26001b88-f99b-4784-9300-4f2b5f650274',
        name: '标准项目里程碑模板 v1.0',
        version_number: '1.0.0',
        description: '适用于一般项目的标准里程碑流程模板',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log('✅ 插入默认版本记录');
    } else {
      console.log('✅ 更新版本记录');
    }

    // 3. 更新 milestone_templates 的 version_id
    await db('milestone_templates')
      .whereNull('version_id')
      .update({ version_id: '26001b88-f99b-4784-9300-4f2b5f650274' });
    console.log('✅ 更新里程碑模板的 version_id');

    // 4. 验证结果
    const version = await db('template_versions').where('is_active', true).first();
    console.log('\n当前激活版本:', version);

    const templateCount = await db('milestone_templates')
      .where('version_id', version.id)
      .count('* as count')
      .first();
    console.log(`关联的里程碑模板: ${templateCount?.count} 个`);

    console.log('\n🎉 迁移完成！');
  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

runMigration018();
