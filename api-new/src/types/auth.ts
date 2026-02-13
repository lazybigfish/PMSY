/**
 * 认证相关类型定义
 */

// JWT Payload
export interface JWTPayload {
  sub: string;           // 用户 ID
  email: string;         // 用户邮箱
  role: string;          // 用户角色
  iat: number;           // 签发时间
  exp: number;           // 过期时间
  iss?: string;          // 签发者
  aud?: string;          // 受众
}

// 用户信息
export interface User {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  phone: string | null;
  is_active: boolean;
  email_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  password_hash?: string | null;
}

// 登录请求
export interface LoginRequest {
  email: string;
  password: string;
}

// 注册请求
export interface SignUpRequest {
  email: string;
  password: string;
  full_name?: string;
  username?: string;
}

// 更新用户请求
export interface UpdateUserRequest {
  email?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  phone?: string;
}

// 认证响应（兼容 Supabase）
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name: string | null;
      role: string;
      avatar_url: string | null;
    };
    created_at: string;
  };
  session: {
    access_token: string;
    token_type: 'bearer';
    expires_in: number;
    expires_at: number;
    refresh_token: string;
  };
}

// 用户元数据
export interface UserMetadata {
  full_name: string | null;
  role: string;
  avatar_url: string | null;
}

// 扩展 Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
