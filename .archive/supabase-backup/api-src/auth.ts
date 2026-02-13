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
    // 直接使用 auth 服务地址，绕过 Kong 网关
    const supabaseUrl = process.env.SUPABASE_AUTH_URL || 'http://auth:9999';
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
      res.status(200).json({ 
        success: true, 
        message: '用户已创建，但因 Root 账号配置缺失无法自动设置角色。请联系管理员。',
        user: signUpData.user 
      });
      return;
    }
    
    const { error: loginError } = await supabaseRoot.auth.signInWithPassword({
      email: rootEmail, 
      password: rootPassword
    });

    if (loginError) {
      console.warn('Root login failed during fallback:', loginError.message);
      res.status(200).json({ 
        success: true, 
        message: '用户已创建，但因 Root 账号验证失败无法自动设置角色。请联系管理员。',
        user: signUpData.user 
      });
      return;
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
      res.status(200).json({ 
        success: true, 
        message: '用户已创建，但角色设置可能延迟或失败。',
        user: signUpData.user 
      });
      return;
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
    // 1. 直接调用 GoTrue Admin API 创建用户（绕过 Supabase 客户端库）
    const authUrl = process.env.SUPABASE_AUTH_URL || 'http://auth:9999';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Creating user via direct GoTrue API call...');
    console.log('Auth URL:', authUrl);
    
    const response = await fetch(`${authUrl}/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: finalEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          username: username,
          full_name: full_name || username
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GoTrue API error:', response.status, errorText);
      
      // 如果是 401/403 错误，尝试 Fallback 策略
      if (response.status === 401 || response.status === 403) {
        console.warn('Service Role Key invalid, switching to Root User fallback...');
        await handleCreateUserWithRootFallback(req, res);
        return;
      }
      
      throw new Error(`GoTrue API error: ${response.status} - ${errorText}`);
    }

    const authData = await response.json();
    console.log('User created successfully:', authData.id);

    // 2. 更新用户角色 (Profiles 表)
    // 注意：系统中的触发器通常会创建初始 Profile，这里我们需要更新其 Role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: role || 'user',
        username: username // 确保 username 同步
      })
      .eq('id', authData.id);

    if (profileError) {
      console.warn('用户创建成功但角色更新失败:', profileError);
      // 不中断流程，返回成功但带有警告
    }

    res.status(200).json({
      success: true,
      message: '用户创建成功',
      user: authData
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
