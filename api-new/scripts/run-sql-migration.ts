/**
 * 执行 SQL 迁移文件
 * 用于执行原生 SQL 迁移脚本
 */
import fs from 'fs';
import path from 'path';
import db from '../src/config/database';

async function runMigration() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Usage: npx ts-node scripts/run-sql-migration.ts <migration-file.sql>');
    process.exit(1);
  }

  const filePath = path.resolve(__dirname, '..', 'database', 'migrations', migrationFile);
  
  if (!fs.existsSync(filePath)) {
    console.error(`Migration file not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf-8');
  
  console.log(`Running migration: ${migrationFile}`);
  
  try {
    await db.raw(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runMigration();
