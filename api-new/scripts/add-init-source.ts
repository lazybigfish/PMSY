import { db } from '../src/config/database';

async function migrate() {
  try {
    await db.raw(`
      ALTER TABLE project_milestones 
      ADD COLUMN IF NOT EXISTS init_source TEXT DEFAULT 'custom' CHECK (init_source IN ('custom', 'template'))
    `);
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
