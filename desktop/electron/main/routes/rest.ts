import { Router, Request, Response } from 'express';
import { getDatabase } from '../database.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * 通用的 REST API 路由处理
 * 兼容 PostgREST 风格的 API
 */

// 获取表数据（支持过滤、排序、分页）
router.get('/:table', handleGet);

// 获取单条记录
router.get('/:table/:id', handleGetOne);

// 创建记录
router.post('/:table', handlePost);

// 更新记录
router.patch('/:table', handlePatch);
router.patch('/:table/:id', handlePatch);

// 删除记录
router.delete('/:table', handleDelete);
router.delete('/:table/:id', handleDeleteOne);

/**
 * 处理 GET 请求 - 查询列表
 */
function handleGet(req: Request, res: Response): void {
  try {
    const { table } = req.params;
    const db = getDatabase();
    
    // 验证表名（防止 SQL 注入）
    if (!isValidTableName(table)) {
      res.status(400).json({ error: 'Invalid table name' });
      return;
    }
    
    // 构建查询
    let sql = `SELECT * FROM ${table}`;
    const conditions: string[] = [];
    const params: any[] = [];
    
    // 处理查询参数（过滤）
    for (const [key, value] of Object.entries(req.query)) {
      if (key.startsWith('_')) continue; // 跳过系统参数
      
      if (typeof value === 'string') {
        // 支持操作符：eq, neq, gt, gte, lt, lte, like, ilike, in
        if (value.includes('.')) {
          const [op, val] = value.split('.');
          switch (op) {
            case 'eq':
              conditions.push(`${key} = ?`);
              params.push(val);
              break;
            case 'neq':
              conditions.push(`${key} != ?`);
              params.push(val);
              break;
            case 'gt':
              conditions.push(`${key} > ?`);
              params.push(val);
              break;
            case 'gte':
              conditions.push(`${key} >= ?`);
              params.push(val);
              break;
            case 'lt':
              conditions.push(`${key} < ?`);
              params.push(val);
              break;
            case 'lte':
              conditions.push(`${key} <= ?`);
              params.push(val);
              break;
            case 'like':
              conditions.push(`${key} LIKE ?`);
              params.push(`%${val}%`);
              break;
            case 'ilike':
              conditions.push(`LOWER(${key}) LIKE LOWER(?)`);
              params.push(`%${val}%`);
              break;
            case 'in':
              const values = val.split(',');
              conditions.push(`${key} IN (${values.map(() => '?').join(',')})`);
              params.push(...values);
              break;
          }
        } else {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      }
    }
    
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // 处理排序
    const order = req.query._order as string;
    if (order) {
      const [column, direction] = order.split('.');
      if (isValidColumnName(column)) {
        sql += ` ORDER BY ${column} ${direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
      }
    }
    
    // 处理分页
    const limit = parseInt(req.query._limit as string) || 100;
    const offset = parseInt(req.query._offset as string) || 0;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    
    // 执行查询
    const rows = db.prepare(sql).all(...params);
    
    // 获取总数
    let countSql = `SELECT COUNT(*) as count FROM ${table}`;
    if (conditions.length > 0) {
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }
    const { count } = db.prepare(countSql).get(...params) as { count: number };
    
    // 设置响应头
    res.setHeader('X-Total-Count', count);
    res.setHeader('Content-Range', `${table} ${offset}-${offset + rows.length - 1}/${count}`);
    
    res.json(rows);
  } catch (error) {
    logger.error('REST GET error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * 处理 GET 单条记录
 */
function handleGetOne(req: Request, res: Response): void {
  try {
    const { table, id } = req.params;
    const db = getDatabase();
    
    if (!isValidTableName(table)) {
      res.status(400).json({ error: 'Invalid table name' });
      return;
    }
    
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    
    if (!row) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }
    
    res.json(row);
  } catch (error) {
    logger.error('REST GET ONE error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * 处理 POST 请求 - 创建记录
 */
function handlePost(req: Request, res: Response): void {
  try {
    const { table } = req.params;
    const db = getDatabase();
    const data = req.body;
    
    if (!isValidTableName(table)) {
      res.status(400).json({ error: 'Invalid table name' });
      return;
    }
    
    // 添加创建时间和更新时间
    const now = new Date().toISOString();
    if (!data.created_at) data.created_at = now;
    if (!data.updated_at) data.updated_at = now;
    
    // 添加创建者
    const user = (req as any).user;
    if (user && !data.created_by) {
      data.created_by = user.id;
    }
    
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(',');
    const values = Object.values(data);
    
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
    
    const result = db.prepare(sql).run(...values);
    
    // 返回创建的记录
    const row = db.prepare(`SELECT * FROM ${table} WHERE rowid = ?`).get(result.lastInsertRowid);
    
    res.status(201).json(row);
  } catch (error) {
    logger.error('REST POST error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * 处理 PATCH 请求 - 更新记录
 */
function handlePatch(req: Request, res: Response): void {
  try {
    const { table, id } = req.params;
    const db = getDatabase();
    const data = req.body;
    
    if (!isValidTableName(table)) {
      res.status(400).json({ error: 'Invalid table name' });
      return;
    }
    
    // 更新时间
    data.updated_at = new Date().toISOString();
    
    const columns = Object.keys(data);
    const setClause = columns.map(col => `${col} = ?`).join(',');
    const values = Object.values(data);
    
    let sql = `UPDATE ${table} SET ${setClause}`;
    let whereValues: any[] = [];
    
    if (id) {
      sql += ` WHERE id = ?`;
      whereValues = [id];
    } else {
      // 使用查询参数作为条件
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(req.query)) {
        if (!key.startsWith('_') && typeof value === 'string') {
          conditions.push(`${key} = ?`);
          whereValues.push(value);
        }
      }
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }
    
    db.prepare(sql).run(...values, ...whereValues);
    
    res.json({ message: 'Updated successfully' });
  } catch (error) {
    logger.error('REST PATCH error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * 处理 DELETE 请求 - 删除多条记录
 */
function handleDelete(req: Request, res: Response): void {
  try {
    const { table } = req.params;
    const db = getDatabase();
    
    if (!isValidTableName(table)) {
      res.status(400).json({ error: 'Invalid table name' });
      return;
    }
    
    let sql = `DELETE FROM ${table}`;
    const conditions: string[] = [];
    const params: any[] = [];
    
    // 使用查询参数作为条件
    for (const [key, value] of Object.entries(req.query)) {
      if (!key.startsWith('_') && typeof value === 'string') {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }
    
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    db.prepare(sql).run(...params);
    
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    logger.error('REST DELETE error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * 处理 DELETE 单条记录
 */
function handleDeleteOne(req: Request, res: Response): void {
  try {
    const { table, id } = req.params;
    const db = getDatabase();
    
    if (!isValidTableName(table)) {
      res.status(400).json({ error: 'Invalid table name' });
      return;
    }
    
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    logger.error('REST DELETE ONE error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * 验证表名（防止 SQL 注入）
 */
function isValidTableName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * 验证列名（防止 SQL 注入）
 */
function isValidColumnName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

export function setupRestRoutes(): Router {
  return router;
}
