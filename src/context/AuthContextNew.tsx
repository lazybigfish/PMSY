import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Profile } from '../types';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 检查本地存储的 token
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const userData = await api.auth.getUser();
      setUser(userData);
      
      // 转换 user 数据为 profile 格式
      const profileData: Profile = {
        id: userData.id,
        email: userData.email,
        full_name: userData.user_metadata?.full_name || null,
        avatar_url: userData.user_metadata?.avatar_url || null,
        role: userData.user_metadata?.role || 'user',
        phone: null,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      };
      setProfile(profileData);
      setError(null);
    } catch (err: any) {
      console.error('获取用户信息失败:', err);
      setError('获取用户信息失败');
      // Token 可能已过期，清除本地存储
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.auth.signIn(email, password);
      
      // 保存 token
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      
      setUser(response.user);
      
      // 转换 user 数据为 profile 格式
      const profileData: Profile = {
        id: response.user.id,
        email: response.user.email,
        full_name: response.user.user_metadata?.full_name || null,
        avatar_url: response.user.user_metadata?.avatar_url || null,
        role: response.user.user_metadata?.role || 'user',
        phone: null,
        created_at: response.user.created_at,
        updated_at: new Date().toISOString(),
      };
      setProfile(profileData);
    } catch (err: any) {
      console.error('登录失败:', err);
      setError(err.message || '登录失败');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await api.auth.signUp({
        email,
        password,
        full_name: fullName,
      });
      
      // 注册成功后自动登录
      await signIn(email, password);
    } catch (err: any) {
      console.error('注册失败:', err);
      setError(err.message || '注册失败');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await api.auth.signOut();
    } catch (err) {
      console.error('退出失败:', err);
    } finally {
      // 清除本地存储
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
