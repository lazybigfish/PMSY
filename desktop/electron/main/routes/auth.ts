import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database.js';
import { logger } from '../utils/logger.js';

const router = Router();

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * 用户登录
 * POST /auth/v1/token
 */
router.post('/token', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required'
      });
    }
    
    const db = getDatabase();
    
    // 查询用户
    const user = db.prepare(`
      SELECT p.*, r.permissions
      FROM profiles p
      LEFT JOIN app_roles r ON p.role = r.id
      WHERE p.email = ?
    `).get(email) as any;
    
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }
    
    // 验证密码
    // 注意：桌面版使用简化的密码验证，实际密码存储在数据库中
    // 这里使用 bcrypt 比较
    const isValidPassword = await bcrypt.compare(password, user.password_hash || '');
    
    // 如果是默认管理员，使用默认密码验证
    const isDefaultAdmin = email === 'admin@pmsy.local' && password === 'admin123';
    
    if (!isValidPassword && !isDefaultAdmin) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }
    
    // 生成 JWT
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // 返回用户信息
    res.json({
      access_token: token,
      token_type: 'bearer',
      expires_in: 604800, // 7 days
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
        force_password_change: user.force_password_change,
      }
    });
    
    logger.info(`User logged in: ${email}`);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to authenticate'
    });
  }
});

/**
 * 获取当前用户信息
 * GET /auth/v1/user
 */
router.get('/user', async (req, res) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Not authenticated'
      });
    }
    
    const db = getDatabase();
    
    const profile = db.prepare(`
      SELECT p.*, r.permissions
      FROM profiles p
      LEFT JOIN app_roles r ON p.role = r.id
      WHERE p.id = ?
    `).get(user.id) as any;
    
    if (!profile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    res.json({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      avatar_url: profile.avatar_url,
      permissions: profile.permissions ? JSON.parse(profile.permissions) : [],
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user info'
    });
  }
});

/**
 * 修改密码
 * POST /auth/v1/password
 */
router.post('/password', async (req, res) => {
  try {
    const user = (req as any).user;
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password and new password are required'
      });
    }
    
    const db = getDatabase();
    
    // 获取用户当前密码
    const profile = db.prepare('SELECT password_hash FROM profiles WHERE id = ?').get(user.id) as any;
    
    if (!profile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    // 验证当前密码
    const isValid = await bcrypt.compare(current_password, profile.password_hash || '');
    
    if (!isValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Current password is incorrect'
      });
    }
    
    // 更新密码
    const newHash = await bcrypt.hash(new_password, 10);
    
    db.prepare(`
      UPDATE profiles 
      SET password_hash = ?, force_password_change = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(newHash, user.id);
    
    res.json({
      message: 'Password updated successfully'
    });
    
    logger.info(`Password changed for user: ${user.email}`);
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
});

/**
 * 登出
 * POST /auth/v1/logout
 */
router.post('/logout', (_req, res) => {
  // 客户端负责清除 token
  res.json({
    message: 'Logged out successfully'
  });
});

export function setupAuthRoutes(): Router {
  return router;
}
