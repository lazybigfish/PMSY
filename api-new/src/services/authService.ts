import { db } from '../config/database';
import {
  generateToken,
  generateRefreshToken,
  getExpiresIn,
  getExpiresAt,
} from './jwtService';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  User,
  LoginRequest,
  SignUpRequest,
  UpdateUserRequest,
  AuthResponse,
} from '../types/auth';
import { v4 as uuidv4 } from 'uuid';

// 管理员创建用户请求类型
export interface AdminCreateUserRequest {
  email: string;
  password: string;
  full_name?: string;
  username?: string;
  role?: string;
  phone?: string;
}

/**
 * 认证服务
 * 处理用户注册、登录、信息管理等认证相关逻辑
 */

/**
 * 根据邮箱查找用户
 * @param email - 用户邮箱
 * @returns 用户信息或 null
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const user = await db('profiles')
    .where({ email: email.toLowerCase() })
    .first();
  return user || null;
}

/**
 * 根据用户 ID 查找用户
 * @param id - 用户 ID
 * @returns 用户信息或 null
 */
export async function findUserById(id: string): Promise<User | null> {
  const user = await db('profiles').where({ id }).first();
  return user || null;
}

/**
 * 根据用户名查找用户
 * @param username - 用户名
 * @returns 用户信息或 null
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  const user = await db('profiles')
    .where({ username: username.toLowerCase() })
    .first();
  return user || null;
}

/**
 * 用户注册
 * @param data - 注册请求数据
 * @returns 认证响应
 */
export async function register(data: SignUpRequest): Promise<AuthResponse> {
  const { email, password, full_name, username } = data;

  // 检查邮箱是否已存在
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('该邮箱已被注册');
  }

  // 如果提供了用户名，检查是否已存在
  if (username) {
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      throw new Error('该用户名已被使用');
    }
  }

  // 哈希密码
  const passwordHash = await hashPassword(password);

  // 创建用户
  const newUser = {
    id: uuidv4(),
    email: email.toLowerCase(),
    username: username ? username.toLowerCase() : null,
    password_hash: passwordHash,
    full_name: full_name || null,
    avatar_url: null,
    role: 'user',
    is_active: true,
    email_confirmed_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    last_sign_in_at: null,
    phone: null,
  };

  await db('profiles').insert(newUser);

  // 生成 Token
  const accessToken = generateToken({
    sub: newUser.id,
    email: newUser.email,
    role: newUser.role,
  });

  const refreshToken = generateRefreshToken(newUser.id);

  return {
    user: {
      id: newUser.id,
      email: newUser.email,
      user_metadata: {
        full_name: newUser.full_name,
        role: newUser.role,
        avatar_url: null,
      },
      created_at: newUser.created_at.toISOString(),
    },
    session: {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: getExpiresIn(),
      expires_at: getExpiresAt(),
      refresh_token: refreshToken,
    },
  };
}

/**
 * 用户登录
 * @param data - 登录请求数据
 * @returns 认证响应
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  const { email, password } = data;

  // 查找用户 - 支持邮箱或用户名登录
  let user = await findUserByEmail(email);
  
  // 如果邮箱找不到，尝试用用户名查找
  if (!user) {
    user = await findUserByUsername(email);
  }
  
  if (!user) {
    throw new Error('邮箱或密码错误');
  }

  // 检查用户是否激活
  if (!user.is_active) {
    throw new Error('账号已被禁用');
  }

  // 验证密码
  const isPasswordValid = await verifyPassword(password, user.password_hash || '');
  if (!isPasswordValid) {
    throw new Error('邮箱或密码错误');
  }

  // 更新最后登录时间
  await db('profiles')
    .where({ id: user.id })
    .update({ last_sign_in_at: new Date() });

  // 生成 Token
  const accessToken = generateToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
      created_at: user.created_at,
    },
    session: {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: getExpiresIn(),
      expires_at: getExpiresAt(),
      refresh_token: refreshToken,
    },
  };
}

/**
 * 获取用户信息
 * @param userId - 用户 ID
 * @returns 用户信息
 */
export async function getUserInfo(userId: string): Promise<User | null> {
  const user = await findUserById(userId);
  if (!user) {
    return null;
  }

  // 不返回密码哈希
  const { password_hash, ...userWithoutPassword } = user as User & { password_hash?: string };
  return userWithoutPassword as User;
}

/**
 * 更新用户信息
 * @param userId - 用户 ID
 * @param data - 更新数据
 * @returns 更新后的用户信息
 */
export async function updateUser(
  userId: string,
  data: UpdateUserRequest
): Promise<User | null> {
  const { email, full_name, username, avatar_url, phone } = data;

  // 检查用户是否存在
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  // 如果更新邮箱，检查是否已被其他用户使用
  if (email && email !== user.email) {
    const existingUser = await findUserByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      throw new Error('该邮箱已被其他用户使用');
    }
  }

  // 如果更新用户名，检查是否已被其他用户使用
  if (username && username !== user.username) {
    const existingUser = await findUserByUsername(username);
    if (existingUser && existingUser.id !== userId) {
      throw new Error('该用户名已被其他用户使用');
    }
  }

  // 构建更新数据
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (email !== undefined) updateData.email = email.toLowerCase();
  if (full_name !== undefined) updateData.full_name = full_name;
  if (username !== undefined) updateData.username = username.toLowerCase();
  if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
  if (phone !== undefined) updateData.phone = phone;

  await db('profiles').where({ id: userId }).update(updateData);

  return await getUserInfo(userId);
}

/**
 * 更新用户密码
 * @param userId - 用户 ID
 * @param oldPassword - 旧密码
 * @param newPassword - 新密码
 */
export async function updatePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const user = await db('profiles').where({ id: userId }).first();
  if (!user) {
    throw new Error('用户不存在');
  }

  // 验证旧密码
  const isOldPasswordValid = await verifyPassword(oldPassword, user.password_hash);
  if (!isOldPasswordValid) {
    throw new Error('旧密码错误');
  }

  // 哈希新密码
  const newPasswordHash = await hashPassword(newPassword);

  await db('profiles')
    .where({ id: userId })
    .update({
      password_hash: newPasswordHash,
      updated_at: new Date(),
    });
}

/**
 * 管理员更新用户信息
 * @param userId - 要更新的用户 ID
 * @param data - 更新数据（可包含 role, is_active 等字段）
 * @returns 更新后的用户信息
 */
export async function adminUpdateUser(
  userId: string,
  data: Partial<User> & { password?: string }
): Promise<User | null> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  // 允许管理员更新的字段
  if (data.email !== undefined) updateData.email = data.email.toLowerCase();
  if (data.full_name !== undefined) updateData.full_name = data.full_name;
  if (data.username !== undefined) updateData.username = data.username?.toLowerCase();
  if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  // 如果提供了新密码，更新密码
  if (data.password) {
    updateData.password_hash = await hashPassword(data.password);
  }

  await db('profiles').where({ id: userId }).update(updateData);

  return await getUserInfo(userId);
}

/**
 * 列出所有用户（管理员功能）
 * @param options - 查询选项
 * @returns 用户列表和总数
 */
export async function listUsers(options: {
  page?: number;
  limit?: number;
  role?: string;
  is_active?: boolean;
}): Promise<{ users: User[]; total: number }> {
  const { page = 1, limit = 20, role, is_active } = options;

  let query = db('profiles');

  if (role) {
    query = query.where({ role });
  }

  if (is_active !== undefined) {
    query = query.where({ is_active });
  }

  // 获取总数
  const countResult = await query.clone().count('id as count').first();
  const total = parseInt(countResult?.count as string || '0', 10);

  // 获取分页数据
  const users = await query
    .select('id', 'email', 'username', 'full_name', 'avatar_url', 'role', 'phone', 'is_active', 'email_confirmed_at', 'created_at', 'updated_at', 'last_sign_in_at')
    .orderBy('created_at', 'desc')
    .offset((page - 1) * limit)
    .limit(limit);

  return { users, total };
}

/**
 * 删除用户（软删除，将 is_active 设为 false）
 * @param userId - 用户 ID
 */
export async function deactivateUser(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  await db('profiles')
    .where({ id: userId })
    .update({
      is_active: false,
      updated_at: new Date(),
    });
}

/**
 * 管理员创建用户
 * @param data - 创建用户请求数据
 * @returns 创建的用户信息
 */
export async function adminCreateUser(data: AdminCreateUserRequest): Promise<User> {
  const { email, password, full_name, username, role = 'user', phone } = data;

  // 检查邮箱是否已存在
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('该邮箱已被注册');
  }

  // 如果提供了用户名，检查是否已存在
  if (username) {
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      throw new Error('该用户名已被使用');
    }
  }

  // 哈希密码
  const passwordHash = await hashPassword(password);

  // 创建用户
  const newUser = {
    id: uuidv4(),
    email: email.toLowerCase(),
    username: username ? username.toLowerCase() : null,
    password_hash: passwordHash,
    full_name: full_name || null,
    avatar_url: null,
    role: role,
    is_active: true,
    email_confirmed_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    last_sign_in_at: null,
    phone: phone || null,
  };

  await db('profiles').insert(newUser);

  // 返回用户信息（不包含密码，并将 Date 转换为 string）
  const { password_hash, ...userWithoutPassword } = newUser;
  return {
    ...userWithoutPassword,
    email_confirmed_at: userWithoutPassword.email_confirmed_at?.toISOString() || null,
    created_at: userWithoutPassword.created_at.toISOString(),
    updated_at: userWithoutPassword.updated_at.toISOString(),
  } as User;
}

/**
 * 生成随机密码
 * @param length - 密码长度
 * @returns 随机密码
 */
function generateRandomPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const all = uppercase + lowercase + numbers + special;

  let password = '';
  // 确保至少包含每种类型的字符
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // 填充剩余长度
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // 打乱顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * 重置用户密码（管理员功能）
 * @param userId - 用户 ID
 * @param mode - 重置模式：'random' 随机密码 / 'fixed' 固定密码
 * @param fixedPassword - 固定密码（mode='fixed' 时使用）
 * @returns 新密码
 */
export async function resetPassword(
  userId: string,
  mode: 'random' | 'fixed',
  fixedPassword?: string
): Promise<string> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  // 生成新密码
  const newPassword = mode === 'fixed' && fixedPassword
    ? fixedPassword
    : generateRandomPassword();

  // 哈希新密码
  const passwordHash = await hashPassword(newPassword);

  await db('profiles')
    .where({ id: userId })
    .update({
      password_hash: passwordHash,
      updated_at: new Date(),
    });

  return newPassword;
}

/**
 * 设置强制改密状态（管理员功能）
 * @param userId - 用户 ID
 * @param force - 是否强制改密
 */
export async function setForcePasswordChange(userId: string, force: boolean): Promise<void> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  await db('profiles')
    .where({ id: userId })
    .update({
      force_password_change: force,
      updated_at: new Date(),
    });
}

export default {
  findUserByEmail,
  findUserById,
  findUserByUsername,
  register,
  login,
  getUserInfo,
  updateUser,
  updatePassword,
  adminUpdateUser,
  listUsers,
  deactivateUser,
  adminCreateUser,
  resetPassword,
  setForcePasswordChange,
};
