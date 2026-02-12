/**
 * This is a user authentication API route demo.
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { createClient } from '@supabase/supabase-js'

const router = Router()

/**
 * Fallback: 使用 Root 账号 (Anon Key) 创建用户
 * 当 Service Role Key 无效时使用此方法
 */
async function handleCreateUserWithRootFallback(req: Request, res: Response) {
  const { username, password, email, role, full_name } = req.body;
  const finalEmail = email || `${username}@pmsy.com`;

  console.log('Falling back to Root User creation strategy...');

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Anon Key configuration');
    }

    // 1. 初始化 Anon Client 用于注册
    const supabaseAnon = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 2. 注册新用户
    const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
      email: finalEmail,
      password: password,
      options: {
        data: {
          username: username,
          full_name: full_name || username
        }
      }
    });

    if (signUpError) {
      throw signUpError;
    }

    if (!signUpData.user) {
      throw new Error('User registration returned no user object');
    }

    // 3. 登录 Root 用户以获取权限修改 Role
    const supabaseRoot = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // 从环境变量读取 Root 用户凭据
    const rootEmail = process.env.ROOT_USER_EMAIL || 'root@pmsy.com';
    const rootPassword = process.env.ROOT_USER_PASSWORD;

    if (!rootPassword) {
      console.warn('ROOT_USER_PASSWORD not configured in environment variables');
      return res.status(200).json({ 
        success: true, 
        message: '用户已创建，但因 Root 账号配置缺失无法自动设置角色。请联系管理员。',
        user: signUpData.user 
      });
    }
    
    const { error: loginError } = await supabaseRoot.auth.signInWithPassword({
      email: rootEmail, 
      password: rootPassword
    });

    if (loginError) {
      console.warn('Root login failed during fallback:', loginError.message);
      return res.status(200).json({ 
        success: true, 
        message: '用户已创建，但因 Root 账号验证失败无法自动设置角色。请联系管理员。',
        user: signUpData.user 
      });
    }

    // 4. 更新 Profile Role
    // 尝试多次，等待 Trigger 创建 Profile
    let profileUpdated = false;
    const userId = signUpData.user.id;

    for (let i = 0; i < 5; i++) {
      // 检查 Profile 是否存在
      const { data: profiles } = await supabaseRoot.from('profiles').select('id').eq('id', userId);
      
      if (profiles && profiles.length > 0) {
        // 更新 Role
        const { error: updateError } = await supabaseRoot
          .from('profiles')
          .update({ 
            role: role || 'user',
            username: username 
          })
          .eq('id', userId);
          
        if (!updateError) {
          profileUpdated = true;
          break;
        } else {
          console.warn(`Profile update attempt ${i+1} failed:`, updateError.message);
        }
      }
      
      // 等待 500ms
      await new Promise(r => setTimeout(r, 500));
    }

    if (!profileUpdated) {
      console.warn('Failed to update profile role after multiple attempts');
       return res.status(200).json({ 
        success: true, 
        message: '用户已创建，但角色设置可能延迟或失败。',
        user: signUpData.user 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: '用户创建成功',
      user: signUpData.user 
    });

  } catch (error: unknown) {
    console.error('Fallback creation error:', error);
    
    let errorMessage = '创建用户失败';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (errorMessage.includes('email_address_invalid')) {
        errorMessage = '无法创建用户：系统可能禁用了公开注册，且管理员 API Key 配置无效。请检查 .env 文件中的 SUPABASE_SERVICE_ROLE_KEY。';
      } else if (errorMessage.includes('Invalid API key')) {
        errorMessage = '无法创建用户：服务端 API Key 配置无效。';
      }
    }

    res.status(500).json({ 
      success: false, 
      error: errorMessage
    });
  }
}

/**
 * 管理员创建用户接口
 * POST /api/auth/create-user
 */
router.post('/create-user', async (req: Request, res: Response): Promise<void> => {
  const { username, full_name, password, role, email } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, error: '用户名和密码为必填项' });
    return;
  }

  // 如果没有提供邮箱，根据用户名生成虚拟邮箱（符合系统迁移策略）
  // 必须与前端 Login.tsx 中的域名保持一致 (@pmsy.com)
  const finalEmail = email || `${username}@pmsy.com`;

  try {
    // 1. 调用 Supabase Admin API 创建用户
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: finalEmail,
      password: password,
      email_confirm: true, // 自动确认邮箱
      user_metadata: {
        username: username,
        full_name: full_name || username
      }
    });

    if (authError) {
      // 如果是 API Key 错误，尝试 Fallback 策略
      if (authError.message && (authError.message.includes('Invalid API key') || authError.status === 401)) {
        console.warn('Service Role Key invalid, switching to Root User fallback...');
        await handleCreateUserWithRootFallback(req, res);
        return;
      }
      
      // 检查是否误用了 Anon Key (403 not_admin)
      if (authError.status === 403 || authError.code === 'not_admin' || authError.message.includes('User not allowed')) {
        throw new Error('配置错误：当前使用的 API Key 权限不足。请确保 .env 文件中的 SUPABASE_SERVICE_ROLE_KEY 是 "service_role" 类型（secret），而不是 "anon" 类型（public）。');
      }

      throw authError;
    }

    if (!authData.user) {
      throw new Error('用户创建失败');
    }

    // 2. 更新用户角色 (Profiles 表)
    // 注意：系统中的触发器通常会创建初始 Profile，这里我们需要更新其 Role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: role || 'user',
        username: username // 确保 username 同步
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.warn('用户创建成功但角色更新失败:', profileError);
      // 不中断流程，返回成功但带有警告
    }

    res.status(200).json({ 
      success: true, 
      message: '用户创建成功',
      user: authData.user 
    });

  } catch (error) {
    console.error('Create user error:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器内部错误';
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * User Register
 * POST /api/auth/register
 */
router.post('/register', async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'Not implemented' })
})

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'Not implemented' })
})

/**
 * User Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  res.status(501).json({ success: false, error: 'Not implemented' })
})

export default router
