import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContextNew';
import { Loader2, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 数字矩阵雨背景 - 清新绿色版
const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // 字符集：数字 + 日文假名 + 符号
    const chars = '0123456789アイウエオカキクケコサシスセソタチツテト0123456789ナニヌネノハヒフヘホマミムメモ0123456789';
    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    
    // 每列的下落位置
    const drops: number[] = Array(columns).fill(1);
    // 每列的速度
    const speeds: number[] = Array(columns).fill(0).map(() => Math.random() * 0.5 + 0.5);
    // 每列的亮度
    const brightness: number[] = Array(columns).fill(0).map(() => Math.random());

    const draw = () => {
      // 半透明覆盖，产生拖尾效果 - 使用清新的浅色背景
      ctx.fillStyle = 'rgba(240, 253, 244, 0.05)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // 渐变颜色：顶部青柠色，底部薄荷绿
        const alpha = Math.max(0.1, 1 - (y / height) * 0.8);
        const isHighlight = Math.random() > 0.98;
        
        if (isHighlight) {
          ctx.fillStyle = `rgba(132, 204, 22, ${alpha})`; // 青柠黄高亮
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(132, 204, 22, 0.8)';
        } else {
          const greenAlpha = alpha * 0.6;
          ctx.fillStyle = `rgba(16, 185, 129, ${greenAlpha})`; // 薄荷绿
          ctx.shadowBlur = 0;
        }

        ctx.fillText(char, x, y);

        // 重置或继续下落
        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += speeds[i];
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);
    draw();

    return () => {
      cancelAnimationFrame(animationRef.current!);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.5 }}
    />
  );
};

// 几何光网 - 清新绿色版
const LightGrid = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 水平线 - 薄荷绿 */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`h-${i}`}
          className="absolute w-full h-px"
          style={{
            top: `${(i + 1) * 12}%`,
            background: 'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.2) 50%, transparent 100%)',
            animation: `pulse-line ${3 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
      {/* 垂直线 - 青柠黄 */}
      {[...Array(12)].map((_, i) => (
        <div
          key={`v-${i}`}
          className="absolute h-full w-px"
          style={{
            left: `${(i + 1) * 8}%`,
            background: 'linear-gradient(180deg, transparent 0%, rgba(132, 204, 22, 0.15) 50%, transparent 100%)',
            animation: `pulse-line ${4 + i * 0.4}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      {/* 交叉点光点 */}
      {[...Array(20)].map((_, i) => (
        <div
          key={`dot-${i}`}
          className="absolute w-1 h-1 rounded-full"
          style={{
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 90 + 5}%`,
            background: 'rgba(16, 185, 129, 0.6)',
            boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
            animation: `pulse-dot ${2 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
};

// 粒子网络 - 清新绿色版，带鼠标交互
const ParticleNetwork = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // 粒子配置
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }> = [];

    const particleCount = 25;
    const connectionDistance = 150;
    const mouseDistance = 200;

    // 初始化粒子
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // 更新和绘制粒子
      particles.forEach((p, i) => {
        // 鼠标吸引效果
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouseDistance) {
          const force = (mouseDistance - dist) / mouseDistance;
          p.vx += (dx / dist) * force * 0.02;
          p.vy += (dy / dist) * force * 0.02;
        }

        // 更新位置
        p.x += p.vx;
        p.y += p.vy;

        // 边界反弹
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // 绘制粒子 - 薄荷绿
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.fill();

        // 绘制连线 - 淡绿色
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx2 = p.x - p2.x;
          const dy2 = p.y - p2.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          if (dist2 < connectionDistance) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const alpha = (1 - dist2 / connectionDistance) * 0.3;
            ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current!);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

// 主登录组件
const LoginV2 = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, signIn } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#F0FDF4] via-[#ECFDF5] to-[#F7FEE7]">
      {/* 背景层 - 保留所有动态效果 */}
      <MatrixRain />
      <LightGrid />
      <ParticleNetwork />

      {/* 渐变遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#F0FDF4]/80 via-transparent to-[#ECFDF5]/50 pointer-events-none" />

      {/* 中央品牌展示区 */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          {/* Logo */}
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #84CC16 100%)',
              boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3), 0 0 60px rgba(132, 204, 22, 0.2)',
            }}
            animate={{
              boxShadow: [
                '0 10px 40px rgba(16, 185, 129, 0.3), 0 0 60px rgba(132, 204, 22, 0.2)',
                '0 15px 50px rgba(16, 185, 129, 0.4), 0 0 80px rgba(132, 204, 22, 0.3)',
                '0 10px 40px rgba(16, 185, 129, 0.3), 0 0 60px rgba(132, 204, 22, 0.2)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>

          {/* 品牌名 */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl font-bold mb-4 tracking-tight"
            style={{ 
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #65A30D 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            PMSY
          </motion.h1>

          {/* 标语 */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-xl text-[#047857] leading-relaxed"
          >
            提升团队协作效率
            <br />
            <span className="text-[#65A30D]">管理每一个精彩项目</span>
          </motion.p>
        </motion.div>
      </div>

      {/* 底部登录条 */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-0 left-0 right-0 z-20 p-4 md:p-6"
      >
        <div
          className="max-w-2xl mx-auto rounded-2xl p-4 md:p-6"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            boxShadow: '0 -10px 40px rgba(16, 185, 129, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5)',
          }}
        >
          <form onSubmit={handleLogin} className="flex flex-col md:flex-row gap-3 md:gap-4 items-end">
            {/* 用户名 */}
            <div className="flex-1 w-full">
              <label className="block text-xs text-[#047857] mb-1.5 ml-1 font-medium">用户名</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#10B981]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/80 border border-[#A7F3D0] rounded-xl text-[#064E3B] text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                  placeholder="请输入用户名"
                />
              </div>
            </div>

            {/* 密码 */}
            <div className="flex-1 w-full">
              <label className="block text-xs text-[#047857] mb-1.5 ml-1 font-medium">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#10B981]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/80 border border-[#A7F3D0] rounded-xl text-[#064E3B] text-sm placeholder-[#6B7280] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* 登录按钮 */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all whitespace-nowrap"
              style={{
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35)',
              }}
            >
              {loading ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <>
                  登录
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* 错误提示 */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 text-[#F43F5E] text-xs text-center font-medium"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 忘记密码 */}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => alert('请联系管理员重置密码')}
              className="text-xs text-[#6B7280] hover:text-[#10B981] transition-colors"
            >
              忘记密码？
            </button>
          </div>
        </div>

        {/* 底部提示 */}
        <p className="mt-3 text-center text-xs text-[#047857]/60">
          还没有账号？请联系管理员开通
        </p>
      </motion.div>
    </div>
  );
};

export default LoginV2;
