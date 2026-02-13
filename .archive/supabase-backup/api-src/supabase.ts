import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// 优先使用 VITE_ 前缀的变量（与前端保持一致），如果没有则尝试标准命名
// 在 Docker 环境中，直接使用 auth 服务地址绕过 Kong 网关
const supabaseUrl = process.env.SUPABASE_AUTH_URL || 'http://auth:9999';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase Config Check:');
console.log('URL:', supabaseUrl);
console.log('Service Role Key Length:', serviceRoleKey?.length);
console.log('Service Role Key Start:', serviceRoleKey?.substring(0, 10));

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables for server-side client (SUPABASE_SERVICE_ROLE_KEY required)');
}

// 创建拥有 Service Role 权限的客户端，用于管理操作
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
