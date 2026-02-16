import { db } from '../config/database';
import { Knex } from 'knex';

/**
 * 数据库服务
 * 封装数据库 CRUD 操作，支持 Supabase 风格的查询参数
 */

/**
 * 查询选项接口
 */
export interface QueryOptions {
  select?: string;           // 选择字段，如 "id,name,status"
  eq?: Record<string, any>;  // 等于条件，如 { status: 'active' }
  neq?: Record<string, any>; // 不等于条件
  gt?: Record<string, any>;  // 大于条件
  gte?: Record<string, any>; // 大于等于条件
  lt?: Record<string, any>;  // 小于条件
  lte?: Record<string, any>; // 小于等于条件
  like?: Record<string, string>;   // LIKE 模糊查询
  ilike?: Record<string, string>;  // ILIKE 不区分大小写模糊查询
  in?: Record<string, any[]>;      // IN 查询
  is?: Record<string, null | boolean>;  // IS NULL / IS NOT NULL
  order?: string;            // 排序，如 "created_at.desc"
  limit?: number;            // 限制数量
  offset?: number;           // 偏移量
  page?: number;             // 页码（与 limit 一起使用）
}

/**
 * 构建查询
 * @param table - 表名
 * @param options - 查询选项
 * @returns Knex 查询构建器
 */
function buildQuery(table: string, options: QueryOptions): Knex.QueryBuilder {
  let query = db(table);

  // 选择字段
  if (options.select) {
    const fields = options.select.split(',').map(f => f.trim());
    query = query.select(fields);
  }

  // 等于条件
  if (options.eq) {
    Object.entries(options.eq).forEach(([key, value]) => {
      query = query.where(key, value);
    });
  }

  // 不等于条件
  if (options.neq) {
    Object.entries(options.neq).forEach(([key, value]) => {
      query = query.whereNot(key, value);
    });
  }

  // 大于条件
  if (options.gt) {
    Object.entries(options.gt).forEach(([key, value]) => {
      query = query.where(key, '>', value);
    });
  }

  // 大于等于条件
  if (options.gte) {
    Object.entries(options.gte).forEach(([key, value]) => {
      query = query.where(key, '>=', value);
    });
  }

  // 小于条件
  if (options.lt) {
    Object.entries(options.lt).forEach(([key, value]) => {
      query = query.where(key, '<', value);
    });
  }

  // 小于等于条件
  if (options.lte) {
    Object.entries(options.lte).forEach(([key, value]) => {
      query = query.where(key, '<=', value);
    });
  }

  // LIKE 模糊查询
  if (options.like) {
    Object.entries(options.like).forEach(([key, value]) => {
      query = query.whereLike(key, value);
    });
  }

  // ILIKE 不区分大小写模糊查询
  if (options.ilike) {
    Object.entries(options.ilike).forEach(([key, value]) => {
      query = query.whereILike(key, value);
    });
  }

  // IN 查询
  if (options.in) {
    Object.entries(options.in).forEach(([key, values]) => {
      query = query.whereIn(key, values);
    });
  }

  // IS NULL / IS NOT NULL
  if (options.is) {
    Object.entries(options.is).forEach(([key, value]) => {
      if (value === null) {
        query = query.whereNull(key);
      } else if (value === true) {
        query = query.where(key, true);
      } else if (value === false) {
        query = query.where(key, false);
      }
    });
  }

  // 排序
  if (options.order) {
    const orderParts = options.order.split(',');
    orderParts.forEach(part => {
      const [column, direction] = part.trim().split('.');
      if (column) {
        query = query.orderBy(column, direction === 'desc' ? 'desc' : 'asc');
      }
    });
  }

  // 分页
  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset !== undefined) {
    query = query.offset(options.offset);
  } else if (options.page && options.limit) {
    query = query.offset((options.page - 1) * options.limit);
  }

  return query;
}

/**
 * 查询数据
 * @param table - 表名
 * @param options - 查询选项
 * @returns 数据数组
 */
export async function query(table: string, options: QueryOptions = {}): Promise<any[]> {
  const query = buildQuery(table, options);
  return await query;
}

/**
 * 查询单条数据
 * @param table - 表名
 * @param options - 查询选项
 * @returns 单条数据或 null
 */
export async function queryOne(table: string, options: QueryOptions = {}): Promise<any | null> {
  const query = buildQuery(table, options).limit(1);
  const results = await query;
  return results[0] || null;
}

/**
 * 根据 ID 查询
 * @param table - 表名
 * @param id - 记录 ID
 * @param select - 选择字段
 * @returns 单条数据或 null
 */
export async function findById(table: string, id: string, select?: string): Promise<any | null> {
  let query = db(table).where({ id }).first();
  
  if (select) {
    const fields = select.split(',').map(f => f.trim());
    query = query.select(fields);
  }

  return await query;
}

/**
 * 插入数据
 * @param table - 表名
 * @param data - 插入数据（单个对象或数组）
 * @param select - 返回字段
 * @returns 插入的数据数组（兼容Supabase格式）
 */
export async function insert(table: string, data: Record<string, any> | Record<string, any>[], select?: string): Promise<any[]> {
  const isArray = Array.isArray(data);
  const result = await db(table).insert(data).returning(select ? select.split(',').map(f => f.trim()) : '*');
  
  // Knex 的 returning 在 PostgreSQL 下总是返回数组
  // 但为了确保兼容性，统一处理为数组
  if (Array.isArray(result)) {
    return result;
  }
  // 如果结果是单个对象，包装成数组
  return result ? [result] : [];
}

/**
 * 批量插入数据
 * @param table - 表名
 * @param data - 插入数据数组
 * @param select - 返回字段
 * @returns 插入的数据数组
 */
export async function insertMany(table: string, data: Record<string, any>[], select?: string): Promise<any[]> {
  return await db(table).insert(data).returning(select ? select.split(',').map(f => f.trim()) : '*');
}

/**
 * 更新数据
 * @param table - 表名
 * @param data - 更新数据
 * @param conditions - 更新条件
 * @param select - 返回字段
 * @returns 更新的数据
 */
export async function update(
  table: string,
  data: Record<string, any>,
  conditions: Record<string, any>,
  select?: string
): Promise<any[]> {
  return await db(table)
    .where(conditions)
    .update({ ...data, updated_at: new Date() })
    .returning(select ? select.split(',').map(f => f.trim()) : '*');
}

/**
 * 根据 ID 更新数据
 * @param table - 表名
 * @param id - 记录 ID
 * @param data - 更新数据
 * @param select - 返回字段
 * @returns 更新的数据
 */
export async function updateById(
  table: string,
  id: string,
  data: Record<string, any>,
  select?: string
): Promise<any | null> {
  const [result] = await db(table)
    .where({ id })
    .update({ ...data, updated_at: new Date() })
    .returning(select ? select.split(',').map(f => f.trim()) : '*');
  return result || null;
}

/**
 * 删除数据
 * @param table - 表名
 * @param conditions - 删除条件
 * @returns 删除的行数
 */
export async function remove(table: string, conditions: Record<string, any>): Promise<number> {
  return await db(table).where(conditions).del();
}

/**
 * 根据 ID 删除数据
 * @param table - 表名
 * @param id - 记录 ID
 * @returns 是否删除成功
 */
export async function removeById(table: string, id: string): Promise<boolean> {
  const count = await db(table).where({ id }).del();
  return count > 0;
}

/**
 * 统计数量
 * @param table - 表名
 * @param conditions - 统计条件
 * @returns 数量
 */
export async function count(table: string, conditions?: Record<string, any>): Promise<number> {
  let query = db(table).count('* as count');
  
  if (conditions) {
    query = query.where(conditions);
  }

  const result = await query.first();
  return parseInt(result?.count as string || '0', 10);
}

/**
 * 执行事务
 * @param callback - 事务回调函数
 * @returns 回调函数返回值
 */
export async function transaction<T>(callback: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
  return await db.transaction(callback);
}

/**
 * 检查表是否存在
 * @param table - 表名
 * @returns 是否存在
 */
export async function tableExists(table: string): Promise<boolean> {
  try {
    await db.raw(`SELECT 1 FROM ?? LIMIT 1`, [table]);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取表的所有列
 * @param table - 表名
 * @returns 列名数组
 */
export async function getTableColumns(table: string): Promise<string[]> {
  const result = await db.raw(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = ?
  `, [table]);
  
  return result.rows.map((row: any) => row.column_name);
}

export default {
  query,
  queryOne,
  findById,
  insert,
  insertMany,
  update,
  updateById,
  remove,
  removeById,
  count,
  transaction,
  tableExists,
  getTableColumns,
};
