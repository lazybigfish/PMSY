#!/usr/bin/env node

/**
 * 从 Supabase 迁移数据脚本
 * 用法: node migrate-from-supabase.js
 * 环境变量:
 *   SUPABASE_URL - Supabase 项目 URL
 *   SUPABASE_SERVICE_KEY - Supabase 服务密钥
 *   DATABASE_URL - 新数据库连接字符串
 */

const { createClient } = require('@supabase/supabase-js');
const { db } = require('../dist/config/database');

// 表列表（按依赖顺序）
const TABLES = [
  'profiles',
  'projects',
  'project_members',
  'project_clients',
  'project_suppliers',
  'tasks',
  'milestones',
  'folders',
  'files',
  'suppliers',
  'risks',
  'reports',
  'notifications',
  'forum_posts',
  'forum_comments',
  'hot_news',
  'clients',
  'app_roles',
  'role_permissions',
  'system_configs',
];

// 初始化 Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('错误: 请设置 SUPABASE_URL 和 SUPABASE_SERVICE_KEY 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 从 Supabase 获取数据
 * @param {string} table - 表名
 * @returns {Promise<Array>}
 */
async function fetchFromSupabase(table) {
  console.log(`正在从 Supabase 获取 ${table} 数据...`);
  
  const { data, error } = await supabase
    .from(table)
    .select('*');
  
  if (error) {
    console.error(`获取 ${table} 数据失败:`, error.message);
    return [];
  }
  
  console.log(`获取到 ${data.length} 条记录`);
  return data;
}

/**
 * 转换数据格式
 * @param {string} table - 表名
 * @param {Array} data - 原始数据
 * @returns {Array}
 */
function transformData(table, data) {
  return data.map(record => {
    const transformed = { ...record };
    
    // 处理时间戳字段
    const timestampFields = [
      'created_at', 'updated_at', 'deleted_at', 'email_confirmed_at',
      'last_sign_in_at', 'due_date', 'start_date', 'end_date',
      'completed_at', 'uploaded_at', 'read_at', 'archived_at'
    ];
    
    timestampFields.forEach(field => {
      if (transformed[field]) {
        // 确保是有效的日期格式
        const date = new Date(transformed[field]);
        if (!isNaN(date.getTime())) {
          transformed[field] = date.toISOString();
        }
      }
    });
    
    // 处理 JSON 字段
    const jsonFields = ['user_metadata', 'app_metadata', 'raw_user_meta_data'];
    jsonFields.forEach(field => {
      if (transformed[field] && typeof transformed[field] === 'object') {
        transformed[field] = JSON.stringify(transformed[field]);
      }
    });
    
    // 移除 Supabase 特有字段
    delete transformed.instance_id;
    delete transformed.confirmation_sent_at;
    delete transformed.recovery_sent_at;
    delete transformed.email_change_sent_at;
    delete transformed.new_email;
    delete transformed.new_phone;
    
    return transformed;
  });
}

/**
 * 插入数据到新数据库
 * @param {string} table - 表名
 * @param {Array} data - 数据
 */
async function insertToNewDb(table, data) {
  if (data.length === 0) {
    console.log(`${table} 没有数据需要迁移`);
    return;
  }
  
  console.log(`正在插入 ${data.length} 条记录到 ${table}...`);
  
  try {
    // 使用批量插入
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await db(table).insert(batch);
      console.log(`  已插入 ${Math.min(i + batchSize, data.length)}/${data.length}`);
    }
    
    console.log(`${table} 数据迁移完成`);
  } catch (error) {
    console.error(`插入 ${table} 数据失败:`, error.message);
    throw error;
  }
}

/**
 * 清空表
 * @param {string} table - 表名
 */
async function truncateTable(table) {
  console.log(`清空 ${table} 表...`);
  await db.raw(`TRUNCATE TABLE ?? CASCADE`, [table]);
}

/**
 * 迁移单个表
 * @param {string} table - 表名
 */
async function migrateTable(table) {
  console.log(`\n========== 迁移 ${table} ==========`);
  
  try {
    // 1. 从 Supabase 获取数据
    const data = await fetchFromSupabase(table);
    
    if (data.length === 0) {
      console.log(`${table} 没有数据`);
      return;
    }
    
    // 2. 转换数据
    const transformedData = transformData(table, data);
    
    // 3. 清空目标表（可选）
    // await truncateTable(table);
    
    // 4. 插入数据
    await insertToNewDb(table, transformedData);
    
  } catch (error) {
    console.error(`迁移 ${table} 失败:`, error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('开始从 Supabase 迁移数据...\n');
  
  const startTime = Date.now();
  let migratedTables = 0;
  let failedTables = 0;
  
  for (const table of TABLES) {
    try {
      await migrateTable(table);
      migratedTables++;
    } catch (error) {
      failedTables++;
      console.error(`表 ${table} 迁移失败，继续下一个...`);
    }
  }
  
  const duration = (Date.now() - startTime) / 1000;
  
  console.log('\n========== 迁移完成 ==========');
  console.log(`成功: ${migratedTables} 个表`);
  console.log(`失败: ${failedTables} 个表`);
  console.log(`耗时: ${duration.toFixed(2)} 秒`);
  
  // 关闭连接
  await db.destroy();
  process.exit(failedTables > 0 ? 1 : 0);
}

// 运行主函数
main().catch(error => {
  console.error('迁移失败:', error);
  process.exit(1);
});
