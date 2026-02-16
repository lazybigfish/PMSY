import { db } from '../src/config/database';

async function runMigration() {
  try {
    await db.raw(`
      ALTER TABLE project_suppliers
      ADD COLUMN IF NOT EXISTS module_ids JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('Migration completed successfully: module_ids column added to project_suppliers');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
