const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');

async function runMigrationFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf-8');

  let buffer = '';
  let i = 0;
  let inDollar = false;
  let dollarTag = '';

  while (i < sql.length) {
    if (!inDollar && sql[i] === '$') {
      const dollarEnd = sql.indexOf('$', i + 1);
      if (dollarEnd > i) {
        const potentialTag = sql.substring(i, dollarEnd + 1);
        if (potentialTag === '$$' || (potentialTag.length > 2 && potentialTag.startsWith('$') && potentialTag.endsWith('$'))) {
          inDollar = true;
          dollarTag = potentialTag;
        }
      }
    }

    if (inDollar) {
      buffer += sql[i];
      if (buffer.endsWith(dollarTag)) {
        inDollar = false;
        dollarTag = '';
      }
      i++;
      continue;
    }

    if (sql[i] === ';' && sql[i+1] === '\n') {
      if (buffer.trim()) {
        await client.query(buffer.trim());
      }
      buffer = '';
      i += 2;
      continue;
    }

    buffer += sql[i];
    i++;
  }

  if (buffer.trim()) {
    await client.query(buffer.trim());
  }
}

async function runMigrations() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'pmsy',
    password: 'pmsy_dev_password',
    database: 'pmsy_dev'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files\n`);

    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      console.log(`📄 ${file}...`);

      try {
        await runMigrationFile(client, filePath);
        console.log('  ✅ Done');
      } catch (err) {
        console.log(`  ⚠️  ${err.message.split('\n')[0]}`);
      }
    }

    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    console.log(`\n✅ Complete! ${tables.rows.length} tables created`);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    await client.end();
  }
}

runMigrations();
