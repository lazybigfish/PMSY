import { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // 检查管理员是否已存在
  const existingAdmin = await knex('profiles')
    .where('id', '00000000-0000-0000-0000-000000000001')
    .first();

  // 生成密码哈希 - 使用标准密码 Willyou@2026
  const passwordHash = await bcrypt.hash('Willyou@2026', 10);

  if (existingAdmin) {
    // 如果管理员已存在，更新密码为统一密码
    await knex('profiles')
      .where('id', '00000000-0000-0000-0000-000000000001')
      .update({
        password_hash: passwordHash,
        email: 'admin@pmsy.com',
        username: 'admin',
        updated_at: new Date(),
      });
    console.log('✅ 管理员用户密码已更新为: Willyou@2026');
    return;
  }

  // 插入默认管理员用户
  await knex('profiles').insert({
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@pmsy.com',
    username: 'admin',
    password_hash: passwordHash,
    full_name: '系统管理员',
    role: 'admin',
    is_active: true,
    email_confirmed_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  });

  console.log('✅ 默认管理员用户已创建: admin@pmsy.com / Willyou@2026');
}
