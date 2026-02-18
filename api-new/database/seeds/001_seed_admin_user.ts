import { Knex } from 'knex';

/**
 * 管理员用户初始化脚本
 * 
 * 【注意】管理员用户现在已在迁移脚本中直接初始化
 * 此脚本保留用于幂等性检查和密码重置（如需要）
 * 
 * 默认管理员信息：
 * - 用户名: admin
 * - 邮箱: admin@pmsy.com
 * - 密码: Willyou@2026
 */

export async function seed(knex: Knex): Promise<void> {
  // 检查管理员是否已存在
  const existingAdmin = await knex('profiles')
    .where('id', '00000000-0000-0000-0000-000000000001')
    .first();

  if (existingAdmin) {
    console.log('✅ 管理员用户已存在，跳过初始化');
    console.log('   用户名: admin');
    console.log('   邮箱: admin@pmsy.com');
    return;
  }

  console.log('⚠️  警告: 管理员用户不存在，请检查迁移脚本是否已执行');
}
