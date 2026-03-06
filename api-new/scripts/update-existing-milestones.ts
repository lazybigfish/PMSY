import { db } from '../src/config/database';

async function migrate() {
  try {
    // 更新所有没有 is_custom 字段的里程碑，设置为 true
    await db.raw(`
      UPDATE project_milestones 
      SET is_custom = true 
      WHERE is_custom IS NULL
    `);
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
