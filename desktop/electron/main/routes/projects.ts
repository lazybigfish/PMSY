import { Router } from 'express';
import { getDatabase } from '../database.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * 获取项目列表（带关联数据）
 * GET /api/projects
 */
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const user = (req as any).user;
    
    // 基础查询
    let sql = `
      SELECT 
        p.*,
        c.name as client_name,
        c.contact_name as client_contact,
        COUNT(DISTINCT pm.user_id) as member_count,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks
      FROM projects p
      LEFT JOIN project_clients c ON p.client_id = c.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN tasks t ON p.id = t.project_id
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    
    // 非管理员只能看到自己的项目
    if (user?.role !== 'admin') {
      sql += ` LEFT JOIN project_members pm2 ON p.id = pm2.project_id`;
      conditions.push('(p.created_by = ? OR pm2.user_id = ?)');
      params.push(user.id, user.id);
    }
    
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    sql += ` GROUP BY p.id ORDER BY p.created_at DESC`;
    
    const projects = db.prepare(sql).all(...params);
    
    res.json(projects);
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get projects'
    });
  }
});

/**
 * 获取项目详情
 * GET /api/projects/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    // 项目基本信息
    const project = db.prepare(`
      SELECT p.*, c.name as client_name, c.contact_name as client_contact
      FROM projects p
      LEFT JOIN project_clients c ON p.client_id = c.id
      WHERE p.id = ?
    `).get(id);
    
    if (!project) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Project not found'
      });
    }
    
    // 项目成员
    const members = db.prepare(`
      SELECT pm.*, pr.full_name, pr.email, pr.avatar_url
      FROM project_members pm
      JOIN profiles pr ON pm.user_id = pr.id
      WHERE pm.project_id = ?
    `).all(id);
    
    // 里程碑
    const milestones = db.prepare(`
      SELECT * FROM project_milestones
      WHERE project_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `).all(id);
    
    // 任务统计
    const taskStats = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM tasks
      WHERE project_id = ?
      GROUP BY status
    `).all(id);
    
    res.json({
      ...project,
      members,
      milestones,
      task_stats: taskStats
    });
  } catch (error) {
    logger.error('Get project detail error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get project details'
    });
  }
});

/**
 * 获取项目任务
 * GET /api/projects/:id/tasks
 */
router.get('/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, milestone_id } = req.query;
    const db = getDatabase();
    
    let sql = `
      SELECT 
        t.*,
        GROUP_CONCAT(DISTINCT ta.user_id) as assignee_ids,
        GROUP_CONCAT(DISTINCT pr.full_name) as assignee_names
      FROM tasks t
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN profiles pr ON ta.user_id = pr.id
      WHERE t.project_id = ?
    `;
    
    const params: any[] = [id];
    
    if (status) {
      sql += ` AND t.status = ?`;
      params.push(status);
    }
    
    if (milestone_id) {
      sql += ` AND t.milestone_id = ?`;
      params.push(milestone_id);
    }
    
    sql += ` GROUP BY t.id ORDER BY t.created_at DESC`;
    
    const tasks = db.prepare(sql).all(...params);
    
    res.json(tasks);
  } catch (error) {
    logger.error('Get project tasks error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get tasks'
    });
  }
});

/**
 * 获取项目里程碑详情
 * GET /api/projects/:id/milestones
 */
router.get('/:id/milestones', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    const milestones = db.prepare(`
      SELECT 
        pm.*,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks
      FROM project_milestones pm
      LEFT JOIN tasks t ON pm.id = t.milestone_id
      WHERE pm.project_id = ?
      GROUP BY pm.id
      ORDER BY pm.sort_order ASC, pm.created_at ASC
    `).all(id);
    
    res.json(milestones);
  } catch (error) {
    logger.error('Get milestones error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get milestones'
    });
  }
});

/**
 * 获取项目供应商
 * GET /api/projects/:id/suppliers
 */
router.get('/:id/suppliers', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    const suppliers = db.prepare(`
      SELECT 
        s.*,
        ps.module_ids,
        ps.contract_amount,
        ps.contract_file_url
      FROM suppliers s
      JOIN project_suppliers ps ON s.id = ps.supplier_id
      WHERE ps.project_id = ?
      ORDER BY s.name ASC
    `).all(id);
    
    res.json(suppliers);
  } catch (error) {
    logger.error('Get suppliers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get suppliers'
    });
  }
});

/**
 * 获取项目文件
 * GET /api/projects/:id/files
 */
router.get('/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    const files = db.prepare(`
      SELECT f.*, pr.full_name as uploaded_by_name
      FROM files f
      LEFT JOIN profiles pr ON f.created_by = pr.id
      WHERE f.project_id = ?
      ORDER BY f.created_at DESC
    `).all(id);
    
    res.json(files);
  } catch (error) {
    logger.error('Get files error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get files'
    });
  }
});

/**
 * 获取项目动态
 * GET /api/projects/:id/activities
 */
router.get('/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;
    const db = getDatabase();
    
    // 合并任务历史和其他活动
    const activities = db.prepare(`
      SELECT 
        th.id,
        th.task_id as entity_id,
        'task' as entity_type,
        th.action,
        th.old_value,
        th.new_value,
        th.created_at,
        th.created_by,
        pr.full_name as created_by_name,
        t.title as task_title
      FROM task_history th
      JOIN tasks t ON th.task_id = t.id
      LEFT JOIN profiles pr ON th.created_by = pr.id
      WHERE t.project_id = ?
      
      UNION ALL
      
      SELECT 
        pc.id,
        pc.project_id as entity_id,
        'comment' as entity_type,
        'commented' as action,
        NULL as old_value,
        pc.content as new_value,
        pc.created_at,
        pc.created_by,
        pr.full_name as created_by_name,
        NULL as task_title
      FROM project_comments pc
      LEFT JOIN profiles pr ON pc.created_by = pr.id
      WHERE pc.project_id = ?
      
      ORDER BY created_at DESC
      LIMIT ?
    `).all(id, id, parseInt(limit as string));
    
    res.json(activities);
  } catch (error) {
    logger.error('Get activities error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get activities'
    });
  }
});

export function setupProjectRoutes(): Router {
  return router;
}
