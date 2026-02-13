import knex from 'knex';
import { DB_CONFIG } from './constants';

/**
 * Knex 数据库实例
 */
export const db = knex({
  client: 'postgresql',
  connection: {
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    database: DB_CONFIG.database,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './database/migrations',
    extension: 'ts',
  },
  seeds: {
    directory: './database/seeds',
    extension: 'ts',
  },
  // 开发环境下启用查询日志
  debug: process.env.NODE_ENV === 'development',
});

/**
 * 测试数据库连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * 关闭数据库连接
 */
export async function closeConnection(): Promise<void> {
  await db.destroy();
}

export default db;
