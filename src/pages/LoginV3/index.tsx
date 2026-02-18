import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContextNew';
import { Loader2, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 流体背景组件 - 增加更多活泼颜色
const FluidBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // 颜色控制点 - 增加更多活泼颜色
    const colorPoints = [
      { color: [14, 165, 233], x: 0.2, y: 0.2, vx: 0.0004, vy: 0.0003, radius: 0.5 },   // sky-500 天蓝
      { color: [34, 211, 238], x: 0.8, y: 0.3, vx: -0.0003, vy: 0.0004, radius: 0.4 },  // cyan-400 青色
      { color: [139, 92, 246], x: 0.5, y: 0.6, vx: 0.0003, vy: -0.0003, radius: 0.45 }, // violet-500 紫罗兰
      { color: [251, 113, 133], x: 0.3, y: 0.8, vx: -0.0004, vy: -0.0002, radius: 0.35 }, // rose-400 珊瑚粉
      { color: [250, 204, 21], x: 0.7, y: 0.7, vx: 0.0002, vy: 0.0003, radius: 0.3 },   // yellow-400 活力黄
      { color: [52, 211, 153], x: 0.1, y: 0.5, vx: 0.0003, vy: -0.0004, radius: 0.4 },   // emerald-400 薄荷绿
      { color: [249, 115, 22], x: 0.9, y: 0.2, vx: -0.0003, vy: 0.0002, radius: 0.35 },  // orange-400 活力橙
      { color: [236, 72, 153], x: 0.6, y: 0.9, vx: 0.0002, vy: -0.0003, radius: 0.3 },   // pink-500 粉红
    ];

    const animate = () => {
      time += 0.008;

      // 绘制基础背景
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 更新颜色点位置
      colorPoints.forEach(point => {
        point.x += point.vx + Math.sin(time * 0.3 + point.color[0]) * 0.0002;
        point.y += point.vy + Math.cos(time * 0.4 + point.color[1]) * 0.0002;

        // 边界反弹
        if (point.x < -0.2 || point.x > 1.2) point.vx *= -1;
        if (point.y < -0.2 || point.y > 1.2) point.vy *= -1;
      });

      // 绘制每个颜色点
      colorPoints.forEach((point) => {
        const px = point.x * canvas.width;
        const py = point.y * canvas.height;
        const radius = Math.min(canvas.width, canvas.height) * point.radius;

        const radial = ctx.createRadialGradient(px, py, 0, px, py, radius);
        radial.addColorStop(0, `rgba(${point.color[0]}, ${point.color[1]}, ${point.color[2]}, 0.5)`);
        radial.addColorStop(0.3, `rgba(${point.color[0]}, ${point.color[1]}, ${point.color[2]}, 0.25)`);
        radial.addColorStop(0.6, `rgba(${point.color[0]}, ${point.color[1]}, ${point.color[2]}, 0.1)`);
        radial.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current!);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ filter: 'blur(80px)' }}
    />
  );
};

// 彩色粒子系统
const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    speedY: number;
    speedX: number;
    opacity: number;
    color: string;
    blur: boolean;
  }>>([]);

  // 多彩颜色配置
  const colors = [
    '14, 165, 233',   // sky
    '34, 211, 238',   // cyan
    '139, 92, 246',   // violet
    '251, 113, 133',  // rose
    '250, 204, 21',   // yellow
    '52, 211, 153',   // emerald
    '249, 115, 22',   // orange
    '236, 72, 153',   // pink
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // 初始化粒子 - 增加数量
    const initParticles = () => {
      particlesRef.current = Array.from({ length: 50 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 4 + 1,
        speedY: -Math.random() * 0.8 - 0.3,
        speedX: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.6 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        blur: Math.random() > 0.6,
      }));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach(particle => {
        // 更新位置
        particle.y += particle.speedY;
        particle.x += particle.speedX + Math.sin(Date.now() * 0.001 + particle.y * 0.01) * 0.2;

        // 循环
        if (particle.y < -20) {
          particle.y = canvas.height + 20;
          particle.x = Math.random() * canvas.width;
        }
        if (particle.x < -20) particle.x = canvas.width + 20;
        if (particle.x > canvas.width + 20) particle.x = -20;

        // 绘制
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);

        if (particle.blur) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = `rgba(${particle.color}, 0.6)`;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = `rgba(${particle.color}, ${particle.opacity})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resize();
    initParticles();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationRef.current!);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

// 浮动标签输入框 - 压缩高度
const FloatingInput = ({
  id,
  type,
  label,
  icon: Icon,
  value,
  onChange,
}: {
  id: string;
  type: string;
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value.length > 0;

  return (
    <div className="relative">
      <div
        className={`absolute left-3 transition-all duration-300 pointer-events-none ${
          isFocused || hasValue
            ? 'top-1.5 text-[10px] text-sky-500'
            : 'top-1/2 -translate-y-1/2 text-sm text-slate-400'
        }`}
      >
        <Icon className={`w-4 h-4 inline-block mr-1 ${isFocused ? 'text-sky-500' : 'text-slate-400'}`} />
        {label}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full px-3 pt-5 pb-2 bg-white/60 border rounded-xl text-slate-800 placeholder-transparent text-sm
          transition-all duration-300 outline-none
          ${isFocused
            ? 'border-sky-400 bg-white/80 shadow-md shadow-sky-200/50'
            : 'border-slate-200/60 hover:border-slate-300'
          }`}
      />
    </div>
  );
};

// 主登录组件
const LoginV3 = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, signIn } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // 3D倾斜效果
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rotateX = (e.clientY - centerY) / 60;
    const rotateY = (e.clientX - centerX) / 60;

    setMousePosition({ x: -rotateX, y: rotateY });
  }, []);

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const virtualEmail = `${username}@pmsy.com`;
      await signIn(virtualEmail, password);
      navigate('/');
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials') || err.message?.includes('邮箱或密码错误')) {
        setError('用户名或密码错误');
      } else {
        setError(err.message || '登录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50">
      {/* 背景层 */}
      <FluidBackground />
      <ParticleField />

      {/* 内容层 - 减少垂直padding */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-6">
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `perspective(1000px) rotateX(${mousePosition.x}deg) rotateY(${mousePosition.y}deg)`,
            transition: 'transform 0.1s ease-out',
          }}
          className="w-full max-w-sm"
        >
          {/* 玻璃卡片 - 压缩padding */}
          <div
            className="relative bg-white/75 backdrop-blur-xl rounded-2xl p-6 md:p-8"
            style={{
              boxShadow: `
                0 0 0 1px rgba(255, 255, 255, 0.6),
                0 10px 40px -10px rgba(14, 165, 233, 0.2),
                0 0 60px -15px rgba(139, 92, 246, 0.15)
              `,
            }}
          >
            {/* 噪点纹理 */}
            <div
              className="absolute inset-0 rounded-2xl opacity-[0.02] pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            />

            {/* Logo 区域 - 压缩间距 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-5"
            >
              {/* Logo 图标 - 缩小 */}
              <motion.div
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
                style={{
                  background: 'linear-gradient(135deg, #0EA5E9 0%, #22D3EE 50%, #06B6D4 100%)',
                  boxShadow: '0 8px 20px -5px rgba(14, 165, 233, 0.4)',
                }}
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>

              {/* 品牌名 */}
              <h1 className="text-2xl font-bold tracking-tight mb-1"
                style={{
                  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                  background: 'linear-gradient(135deg, #0F172A 0%, #475569 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                PMSY
              </h1>

              {/* 标语 - 缩小字号 */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-slate-600 text-sm leading-relaxed"
              >
                提升团队协作效率
                <br />
                <span className="text-sky-600 font-medium">管理每一个精彩项目</span>
              </motion.p>
            </motion.div>

            {/* 表单 - 压缩间距 */}
            <motion.form
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              onSubmit={handleLogin}
              className="space-y-3"
            >
              <FloatingInput
                id="username"
                type="text"
                label="用户名"
                icon={Mail}
                value={username}
                onChange={setUsername}
              />

              <FloatingInput
                id="password"
                type="password"
                label="密码"
                icon={Lock}
                value={password}
                onChange={setPassword}
              />

              {/* 忘记密码 - 更紧凑 */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => alert('请联系管理员重置密码')}
                  className="text-xs text-slate-500 hover:text-sky-600 transition-colors"
                >
                  忘记密码？
                </button>
              </div>

              {/* 错误提示 */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-2 flex items-center gap-2"
                  >
                    <div className="w-1 h-1 rounded-full bg-red-500" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 登录按钮 - 压缩高度 */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all duration-300"
                style={{
                  background: loading
                    ? 'linear-gradient(90deg, #0EA5E9, #22D3EE, #0EA5E9)'
                    : 'linear-gradient(135deg, #0EA5E9 0%, #22D3EE 100%)',
                  backgroundSize: loading ? '200% 100%' : '100% 100%',
                  boxShadow: '0 8px 20px -5px rgba(14, 165, 233, 0.35)',
                  animation: loading ? 'shimmer 1.5s infinite' : 'none',
                }}
              >
                {loading ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <>
                    立即登录
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </motion.form>

            {/* 底部提示 - 更紧凑 */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-4 text-center text-xs text-slate-400"
            >
              还没有账号？请联系管理员开通
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* 装饰性光晕 - 增加更多颜色 */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-sky-300/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-yellow-300/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-56 h-56 bg-pink-300/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 w-40 h-40 bg-emerald-300/15 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

export default LoginV3;
