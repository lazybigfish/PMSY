import { Router, Request, Response, NextFunction } from 'express';
import {
  register,
  login,
  getUserInfo,
  updateUser,
  updatePassword,
  listUsers,
  adminUpdateUser,
  deactivateUser,
} from '../services/authService';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { ValidationError } from '../middleware/errorHandler';

/**
 * Auth API 路由
 * 兼容 Supabase Auth API 格式
 * 基础路径: /auth/v1
 */

const router = Router();

/**
 * POST /auth/v1/token?grant_type=password
 * 用户登录（兼容 Supabase 格式）
 */
router.post('/token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { grant_type } = req.query;

    if (grant_type !== 'password') {
      throw new ValidationError('不支持的 grant_type');
    }

    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('邮箱和密码不能为空');
    }

    const authResponse = await login({ email, password });

    // 返回 Supabase 兼容格式
    res.json({
      access_token: authResponse.session.access_token,
      token_type: authResponse.session.token_type,
      expires_in: authResponse.session.expires_in,
      expires_at: authResponse.session.expires_at,
      refresh_token: authResponse.session.refresh_token,
      user: authResponse.user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/v1/signup
 * 用户注册（兼容 Supabase 格式）
 */
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, full_name, username } = req.body;

    if (!email || !password) {
      throw new ValidationError('邮箱和密码不能为空');
    }

    const authResponse = await register({
      email,
      password,
      full_name,
      username,
    });

    res.status(201).json({
      user: authResponse.user,
      session: authResponse.session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/v1/logout
 * 用户退出登录
 */
router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 在实际应用中，这里可以将 Token 加入黑名单
    // 或者使用 Redis 存储已失效的 Token
    res.json({
      success: true,
      message: '退出登录成功',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/v1/user
 * 获取当前用户信息（兼容 Supabase 格式）
 */
router.get('/user', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      throw new ValidationError('无法获取用户 ID');
    }

    const user = await getUserInfo(userId);

    if (!user) {
      throw new ValidationError('用户不存在');
    }

    // 返回 Supabase 兼容格式
    res.json({
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_sign_in_at: user.last_sign_in_at,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /auth/v1/user
 * 更新当前用户信息（兼容 Supabase 格式）
 */
router.put('/user', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      throw new ValidationError('无法获取用户 ID');
    }

    const { email, full_name, username, avatar_url, phone } = req.body;

    const updatedUser = await updateUser(userId, {
      email,
      full_name,
      username,
      avatar_url,
      phone,
    });

    if (!updatedUser) {
      throw new ValidationError('用户不存在');
    }

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      user_metadata: {
        full_name: updatedUser.full_name,
        role: updatedUser.role,
        avatar_url: updatedUser.avatar_url,
      },
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/v1/user/password
 * 更新当前用户密码
 */
router.post('/user/password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      throw new ValidationError('无法获取用户 ID');
    }

    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      throw new ValidationError('旧密码和新密码不能为空');
    }

    if (new_password.length < 6) {
      throw new ValidationError('新密码长度不能少于 6 位');
    }

    await updatePassword(userId, old_password, new_password);

    res.json({
      success: true,
      message: '密码更新成功',
    });
  } catch (error) {
    next(error);
  }
});

// ============== 管理员接口 ==============

/**
 * GET /auth/v1/admin/users
 * 列出所有用户（管理员权限）
 */
router.get('/admin/users', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string | undefined;
    const is_active = req.query.is_active !== undefined
      ? req.query.is_active === 'true'
      : undefined;

    const result = await listUsers({ page, limit, role, is_active });

    res.json({
      users: result.users,
      total: result.total,
      page,
      limit,
      total_pages: Math.ceil(result.total / limit),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/v1/admin/users/:id
 * 获取指定用户信息（管理员权限）
 */
router.get('/admin/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await getUserInfo(id);

    if (!user) {
      throw new ValidationError('用户不存在');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /auth/v1/admin/users/:id
 * 更新指定用户信息（管理员权限）
 */
router.put('/admin/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { email, full_name, username, avatar_url, phone, role, is_active, password } = req.body;

    const updatedUser = await adminUpdateUser(id, {
      email,
      full_name,
      username,
      avatar_url,
      phone,
      role,
      is_active,
      password,
    });

    if (!updatedUser) {
      throw new ValidationError('用户不存在');
    }

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /auth/v1/admin/users/:id
 * 禁用用户（管理员权限，软删除）
 */
router.delete('/admin/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await deactivateUser(id);

    res.json({
      success: true,
      message: '用户已禁用',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
