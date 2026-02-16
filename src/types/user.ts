/**
 * 用户相关类型定义
 */

// 用户基础信息
export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  username?: string | null;
  role?: string;
  avatar_url?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string | null;
  user_metadata?: {
    full_name: string | null;
    username: string | null;
    role: string;
    avatar_url: string | null;
    department: string | null;
    position: string | null;
  };
}

// 用户资料（profiles 表）
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  role: string;
  avatar_url: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  bio?: string | null;
  is_active?: boolean;
  force_password_change?: boolean;
  created_at: string;
  updated_at: string;
}

// 登录请求
export interface LoginRequest {
  email: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name: string | null;
      username: string | null;
      role: string;
      avatar_url: string | null;
      department: string | null;
      position: string | null;
    };
    created_at: string;
  };
}

// 注册请求
export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
  username?: string;
}

// 注册响应
export interface RegisterResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  } | null;
}

// 更新用户请求
export interface UpdateUserRequest {
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  department?: string;
  position?: string;
}

// 更新密码请求
export interface UpdatePasswordRequest {
  old_password: string;
  new_password: string;
}
