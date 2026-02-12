
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Mail, Lock, ArrowRight, Sparkles, Zap, Shield, Users } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { session } = useAuth();

  React.useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Virtual Email Construction: username@pmsy.com
    const virtualEmail = `${username}@pmsy.com`;

    const { error } = await supabase.auth.signInWithPassword({
      email: virtualEmail,
      password,
    });

    if (error) {
      // Improve error message for user
      if (error.message.includes('Invalid login credentials')) {
        setError('用户名或密码错误');
      } else {
        setError(error.message);
      }
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  const features = [
    { icon: Zap, text: '实时进度跟踪', color: 'text-sun-400' },
    { icon: Users, text: '高效团队协作', color: 'text-mint-400' },
    { icon: Shield, text: '安全可靠保障', color: 'text-violet-400' },
  ];

  return (
    <div className="min-h-screen flex bg-dark-50">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-violet-500 to-mint-500">
          {/* Animated Mesh Pattern */}
          <div className="absolute inset-0 opacity-30">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="0.8" fill="white"/>
                </pattern>
                <linearGradient id="mesh1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,107,74,0.4)" />
                  <stop offset="50%" stopColor="rgba(139,92,246,0.3)" />
                  <stop offset="100%" stopColor="rgba(20,184,144,0.4)" />
                </linearGradient>
              </defs>
              <rect width="100" height="100" fill="url(#grid)"/>
            </svg>
          </div>
          
          {/* Decorative Floating Elements */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl animate-pulse-slow animation-delay-200"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-mint-400/20 rounded-full blur-3xl animate-pulse-slow animation-delay-300"></div>
          
          {/* Floating Shapes */}
          <div className="absolute top-32 right-32 w-16 h-16 border-2 border-white/30 rounded-2xl rotate-12 animate-bounce-soft"></div>
          <div className="absolute bottom-40 left-40 w-12 h-12 bg-white/20 rounded-xl -rotate-12 animate-bounce-soft animation-delay-200"></div>
          <div className="absolute top-1/3 right-20 w-8 h-8 bg-sun-400/40 rounded-lg rotate-45 animate-bounce-soft animation-delay-300"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-glow">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <span className="text-5xl font-display font-bold text-white tracking-tight drop-shadow-lg">
              PMSY
            </span>
          </div>
          
          {/* Main Title */}
          <h1 className="text-4xl font-display font-bold text-white leading-tight mb-6 animate-slide-up">
            提升团队协作效率
            <br />
            <span className="text-gradient-mint">管理每一个精彩项目</span>
          </h1>
          
          {/* Description */}
          <p className="text-white/80 text-lg leading-relaxed max-w-md mb-12 animate-slide-up animation-delay-100">
            专业的项目管理平台，为您提供实时进度跟踪、资源调度与高效的团队沟通工具。
          </p>

          {/* Feature List */}
          <div className="space-y-4 animate-slide-up animation-delay-200">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <span className="text-white font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 sm:px-12 lg:px-16 py-12">
        <div className="w-full max-w-md animate-scale-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-gradient">PMSY</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-dark-900 mb-3">
              欢迎回来
            </h2>
            <p className="text-dark-500">
              请输入您的凭据以访问您的项目看板
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Username Field */}
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                电子邮箱 / 账号
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="input pl-12"
                  placeholder="name@company.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-dark-700">
                  密码
                </label>
                <button
                  type="button"
                  onClick={() => alert('请联系管理员重置密码')}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  忘记密码?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-dark-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input pl-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 text-base shadow-glow"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <>
                  立即登录
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-dark-400 text-sm">
              还没有账号？请联系管理员开通
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
