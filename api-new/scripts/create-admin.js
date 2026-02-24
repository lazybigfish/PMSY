const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'pmsy',
    password: 'pmsy_dev_password',
    database: 'pmsy_dev'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const passwordHash = await bcrypt.hash('Willyou@2026', 10);

    await client.query(`
      INSERT INTO profiles (id, email, username, password_hash, full_name, role, is_active, email_confirmed_at, created_at, updated_at)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'admin@pmsy.com',
        'admin',
        $1,
        '系统管理员',
        'admin',
        true,
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        email_confirmed_at = EXCLUDED.email_confirmed_at,
        updated_at = NOW()
    `, [passwordHash]);

    console.log('✅ Admin user created/updated');
    console.log('   Username: admin');
    console.log('   Password: Willyou@2026');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createAdmin();
