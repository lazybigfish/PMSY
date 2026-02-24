const { Client } = require('pg');

async function checkDb() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'pmsy',
    password: 'pmsy_dev_password',
    database: 'pmsy_dev'
  });

  try {
    await client.connect();
    console.log('✅ Database connected\n');

    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log(`📊 Tables: ${tables.rows.length}`);
    tables.rows.forEach(t => console.log(`  - ${t.table_name}`));

    console.log('\n👤 Admin user:');
    const admin = await client.query("SELECT id, email, username, full_name, role FROM profiles WHERE username = 'admin'");
    if (admin.rows.length > 0) {
      console.log(`  Email: ${admin.rows[0].email}`);
      console.log(`  Username: ${admin.rows[0].username}`);
      console.log(`  Role: ${admin.rows[0].role}`);
    } else {
      console.log('  ❌ Admin user not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDb();
