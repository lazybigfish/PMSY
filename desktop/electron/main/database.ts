import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from './utils/logger.js';

let db: Database.Database | null = null;

/**
 * 获取数据库文件路径
 */
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'database');
  
  // 确保目录存在
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`Created database directory: ${dbDir}`);
  }
  
  return path.join(dbDir, 'pmsy.db');
}

/**
 * 获取迁移文件路径
 */
function getMigrationsPath(): string {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    return path.join(process.cwd(), '../api-new/database/migrations');
  }
  
  // 生产环境使用 extraResources 复制的路径
  return path.join(process.resourcesPath, 'migrations');
}

/**
 * 初始化数据库连接
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call setupDatabase() first.');
  }
  return db;
}

/**
 * 设置数据库
 * 1. 创建数据库连接
 * 2. 执行迁移
 * 3. 初始化数据
 */
export async function setupDatabase(): Promise<void> {
  try {
    const dbPath = getDatabasePath();
    logger.info(`Database path: ${dbPath}`);
    
    // 创建数据库连接
    db = new Database(dbPath);
    logger.info('Database connection established');
    
    // 启用外键约束
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    logger.info('Database pragmas set (WAL mode, foreign keys)');
    
    // 创建迁移记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 执行迁移
    await runMigrations();
    
    // 初始化种子数据
    await runSeeds();
    
    logger.info('Database setup completed successfully');
  } catch (error) {
    logger.error('Failed to setup database:', error);
    throw error;
  }
}

/**
 * 执行数据库迁移
 */
async function runMigrations(): Promise<void> {
  if (!db) return;
  
  const migrationsPath = getMigrationsPath();
  logger.info(`Migrations path: ${migrationsPath}`);
  
  if (!fs.existsSync(migrationsPath)) {
    logger.warn(`Migrations directory not found: ${migrationsPath}`);
    return;
  }
  
  // 获取已执行的迁移
  const executedMigrations = db.prepare('SELECT name FROM _migrations').all() as { name: string }[];
  const executedSet = new Set(executedMigrations.map(m => m.name));
  
  // 读取迁移文件
  const migrationFiles = fs.readdirSync(migrationsPath)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  logger.info(`Found ${migrationFiles.length} migration files`);
  
  for (const file of migrationFiles) {
    if (executedSet.has(file)) {
      logger.debug(`Migration already executed: ${file}`);
      continue;
    }
    
    const filePath = path.join(migrationsPath, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    // 转换 PostgreSQL 语法到 SQLite
    const sqliteSql = convertPostgresToSQLite(sql);
    
    try {
      db.exec(sqliteSql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      logger.info(`Executed migration: ${file}`);
    } catch (error) {
      logger.error(`Failed to execute migration ${file}:`, error);
      throw error;
    }
  }
  
  logger.info('All migrations completed');
}

/**
 * 执行种子数据
 */
async function runSeeds(): Promise<void> {
  if (!db) return;
  
  // 检查是否已有用户数据
  const userCount = db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number };
  
  if (userCount.count > 0) {
    logger.info('Seed data already exists, skipping');
    return;
  }
  
  logger.info('Running seed data...');
  
  // 创建默认管理员用户
  const adminId = '00000000-0000-0000-0000-000000000001';
  const now = new Date().toISOString();
  
  try {
    // 插入管理员角色
    db.prepare(`
      INSERT OR IGNORE INTO app_roles (id, name, description, permissions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'admin',
      '管理员',
      '系统管理员，拥有所有权限',
      JSON.stringify(['*']),
      now,
      now
    );
    
    // 插入默认管理员用户
    db.prepare(`
      INSERT OR IGNORE INTO profiles (
        id, email, full_name, role, avatar_url, 
        created_at, updated_at, force_password_change
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      'admin@pmsy.local',
      '系统管理员',
      'admin',
      null,
      now,
      now,
      1
    );
    
    logger.info('Seed data inserted successfully');
  } catch (error) {
    logger.error('Failed to insert seed data:', error);
    // 种子数据失败不阻止应用启动
  }
}

/**
 * 将 PostgreSQL 语法转换为 SQLite 语法
 */
function convertPostgresToSQLite(sql: string): string {
  let converted = sql;
  
  // 1. 移除 PostgreSQL 特有的扩展
  converted = converted.replace(/CREATE EXTENSION[^;]*;/gi, '');
  converted = converted.replace(/DROP EXTENSION[^;]*;/gi, '');
  
  // 2. 转换数据类型
  const typeMappings: [RegExp, string][] = [
    [/SERIAL\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT'],
    [/BIGSERIAL/gi, 'INTEGER'],
    [/SERIAL/gi, 'INTEGER'],
    [/UUID/gi, 'TEXT'],
    [/VARCHAR\((\d+)\)/gi, 'TEXT'],
    [/CHAR\((\d+)\)/gi, 'TEXT'],
    [/TEXT\[\]/gi, 'TEXT'], // 数组类型转为 TEXT（JSON 存储）
    [/INTEGER\[\]/gi, 'TEXT'],
    [/BOOLEAN/gi, 'INTEGER'], // SQLite 没有布尔类型，用 0/1
    [/TIMESTAMP\s+WITH\s+TIME\s+ZONE/gi, 'TEXT'],
    [/TIMESTAMP\s+WITHOUT\s+TIME\s+ZONE/gi, 'TEXT'],
    [/TIMESTAMP/gi, 'TEXT'],
    [/DATE/gi, 'TEXT'],
    [/TIME/gi, 'TEXT'],
    [/JSONB/gi, 'TEXT'],
    [/JSON/gi, 'TEXT'],
    [/BYTEA/gi, 'BLOB'],
    [/DOUBLE\s+PRECISION/gi, 'REAL'],
    [/NUMERIC\(([^)]+)\)/gi, 'REAL'],
    [/DECIMAL\(([^)]+)\)/gi, 'REAL'],
  ];
  
  for (const [pattern, replacement] of typeMappings) {
    converted = converted.replace(pattern, replacement);
  }
  
  // 3. 转换默认值
  converted = converted.replace(/DEFAULT\s+now\(\)/gi, "DEFAULT (datetime('now'))");
  converted = converted.replace(/DEFAULT\s+CURRENT_TIMESTAMP/gi, "DEFAULT (datetime('now'))");
  converted = converted.replace(/DEFAULT\s+gen_random_uuid\(\)/gi, "DEFAULT (lower(hex(randomblob(16))))");
  converted = converted.replace(/DEFAULT\s+uuid_generate_v4\(\)/gi, "DEFAULT (lower(hex(randomblob(16))))");
  converted = converted.replace(/DEFAULT\s+true/gi, 'DEFAULT 1');
  converted = converted.replace(/DEFAULT\s+false/gi, 'DEFAULT 0');
  
  // 4. 转换函数
  converted = converted.replace(/now\(\)/gi, "datetime('now')");
  converted = converted.replace(/CURRENT_TIMESTAMP/gi, "datetime('now')");
  
  // 5. 移除 PostgreSQL 特有的语法
  converted = converted.replace(/IF\s+NOT\s+EXISTS/gi, 'IF NOT EXISTS');
  converted = converted.replace(/IF\s+EXISTS/gi, 'IF EXISTS');
  
  // 6. 处理 ON CONFLICT
  converted = converted.replace(/ON\s+CONFLICT\s+DO\s+NOTHING/gi, 'ON CONFLICT DO NOTHING');
  
  // 7. 移除 CREATE INDEX CONCURRENTLY
  converted = converted.replace(/CREATE\s+INDEX\s+CONCURRENTLY/gi, 'CREATE INDEX');
  converted = converted.replace(/DROP\s+INDEX\s+CONCURRENTLY/gi, 'DROP INDEX');
  
  // 8. 处理 ALTER TABLE ... TYPE
  // SQLite 不支持直接修改列类型，需要重建表，这里先注释掉
  if (/ALTER\s+TABLE.*TYPE/gi.test(converted)) {
    logger.warn('ALTER TABLE ... TYPE is not supported in SQLite, statement will be skipped');
    converted = converted.replace(/ALTER\s+TABLE[^;]*TYPE[^;]*;/gi, '');
  }
  
  // 9. 处理 CREATE TRIGGER（需要特殊处理）
  // SQLite 的触发器语法与 PostgreSQL 不同，保留原样但记录警告
  if (/CREATE\s+TRIGGER/gi.test(converted)) {
    logger.debug('Trigger detected, may need manual adjustment for SQLite');
  }
  
  return converted;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}
