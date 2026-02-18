/**
 * 数据库迁移脚本
 * 执行所有待执行的迁移文件
 */

import { db } from '../src/config/database';
import { logger } from '../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations');

async function runMigrations() {
  try {
    logger.info('开始执行数据库迁移...');

    // 获取所有迁移文件
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    logger.info(`发现 ${files.length} 个迁移文件`);

    // 创建迁移记录表（如果不存在）
    await db.raw(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const file of files) {
      // 检查是否已执行
      const executed = await db('migrations')
        .where('filename', file)
        .first();

      if (executed) {
        logger.info(`跳过已执行的迁移: ${file}`);
        continue;
      }

      // 读取并执行 SQL
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      
      logger.info(`执行迁移: ${file}`);
      
      // 分割 SQL 语句并逐条执行
      const statements = sql.split(/;\s*$/m).filter(s => s.trim());
      
      await db.transaction(async (trx) => {
        for (const statement of statements) {
          if (statement.trim()) {
            await trx.raw(statement);
          }
        }
        
        // 记录迁移
        await trx('migrations').insert({ filename: file });
      });

      logger.info(`✅