import { db } from '../src/config/database';

async function createRpcFunction() {
  console.log('创建 set_active_template_version 函数...');

  try {
    await db.raw(`
      CREATE OR REPLACE FUNCTION set_active_template_version(target_version_id UUID)
      RETURNS VOID AS $$
      BEGIN
          -- 先将所有版本设为非激活
          UPDATE template_versions 
          SET is_active = false,
              updated_at = NOW();
          
          -- 将指定版本设为激活
          UPDATE template_versions 
          SET is_active = true,
              updated_at = NOW()
          WHERE id = target_version_id;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ 函数创建成功！');
  } catch (error) {
    console.error('创建失败:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

createRpcFunction();
