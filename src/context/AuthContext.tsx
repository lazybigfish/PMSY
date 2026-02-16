import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, userService } from '../services';
import type { Profile } from '../types';

// User 类型定义
interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

// 简化的 Session 类型
interface Session {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // 获取当前会话
    const initSession = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          // 构造 session 对象
          const token = localStorage.getItem('access_token') || '';
          setSession({
            user: currentUser as User,
            access_token: token,
            refresh_token: '',
            expires_at: Date.now() + 3600000,
          });
          setUser(currentUser as User);
          await fetchProfile(currentUser.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error getting session:', err);
        setLoading(false);
      }
    };

    initSession();

    // 监听认证状态变化（轮询方式）
    const interval = setInterval(async () => {
      const currentUser = await authService.getCurrentUser();
      if (currentUser?.id !== user?.id) {
        if (currentUser) {
          const token = localStorage.getItem('access_token') || '';
          setSession({
            user: currentUser as User,
            access_token: token,
            refresh_token: '',
            expires_at: Date.now() + 3600000,
          });
          setUser(currentUser as User);
          await fetchProfile(currentUser.id);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const profileData = await userService.getUserById(userId);

      if (!profileData) {
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            fetchProfile(userId);
          }, 1000);
          return;
        }
        setError('无法加载用户信息');
      } else {
        setProfile(profileData);
        setError(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('网络错误，请检查连接');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await authService.logout();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, error, signOut }}>
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
