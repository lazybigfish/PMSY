import { useState, useCallback } from 'react';
import { Heart } from 'lucide-react';

interface LikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  onLike: () => void | Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  stopPropagation?: boolean;
}

export function LikeButton({ 
  isLiked, 
  likeCount, 
  onLike, 
  size = 'md',
  showCount = true,
  stopPropagation = false
}: LikeButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);

  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isAnimating) return;
    
    // 阻止事件冒泡
    if (stopPropagation) {
      e.stopPropagation();
    }
    
    setIsAnimating(true);
    
    // 生成粒子效果（仅在点赞时）
    if (!isLiked) {
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.cos((i / 8) * Math.PI * 2) * 30,
        y: Math.sin((i / 8) * Math.PI * 2) * 30,
        color: ['#ef4444', '#f97316', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 4)]
      }));
      setParticles(newParticles);
    }
    
    // 调用点赞处理器
    onLike();
    
    // 重置动画状态
    setTimeout(() => {
      setIsAnimating(false);
      setParticles([]);
    }, 600);
  }, [isAnimating, isLiked, onLike, stopPropagation]);

  return (
    <button
      onClick={handleClick}
      aria-label={isLiked ? `取消点赞，当前${likeCount}个赞` : `点赞，当前${likeCount}个赞`}
      aria-pressed={isLiked}
      className={`
        relative flex items-center gap-2 px-3 py-1.5 rounded-full
        transition-all duration-300 ease-out
        ${isLiked 
          ? 'bg-red-50 text-red-500 hover:bg-red-100' 
          : 'bg-dark-100 text-dark-500 hover:bg-dark-200 hover:text-red-400'
        }
        ${isAnimating ? 'scale-110' : 'scale-100'}
        active:scale-95
        focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2
      `}
    >
      {/* 粒子爆炸效果 */}
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full pointer-events-none motion-safe:animate-particle-explode"
          style={{
            backgroundColor: particle.color,
            transform: `translate(-50%, -50%)`,
            '--tx': `${particle.x}px`,
            '--ty': `${particle.y}px`,
          } as React.CSSProperties}
        />
      ))}
      
      {/* 心形图标及动画 */}
      <span className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
        <Heart 
          className={`
            ${iconSizes[size]} transition-all duration-300
            ${isLiked ? 'fill-current scale-110' : 'scale-100'}
            ${isAnimating && isLiked ? 'motion-safe:animate-heart-beat' : ''}
          `}
        />
        
        {/* 涟漪扩散效果 */}
        {isAnimating && isLiked && (
          <span className="absolute inset-0 rounded-full bg-red-400/30 motion-safe:animate-ripple" />
        )}
      </span>
      
      {/* 点赞数量 */}
      {showCount && (
        <span 
          className={`
            text-sm font-semibold min-w-[1.5rem] text-center
            transition-all duration-300
            ${isAnimating ? 'scale-125' : 'scale-100'}
          `}
          aria-hidden="true"
        >
          {likeCount}
        </span>
      )}

      <style>{`
        @keyframes particle-explode {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0);
            opacity: 0;
          }
        }
        
        @keyframes heart-beat {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.2); }
          50% { transform: scale(0.95); }
          75% { transform: scale(1.1); }
        }
        
        @keyframes ripple {
          0% {
            transform: scale(0.5);
            opacity: 0.8;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        .motion-safe\\:animate-heart-beat {
          animation: heart-beat 0.4s ease-in-out;
        }
        
        .motion-safe\\:animate-ripple {
          animation: ripple 0.5s ease-out;
        }
        
        .motion-safe\\:animate-particle-explode {
          animation: particle-explode 0.6s ease-out forwards;
        }
        
        /* 支持减少动画偏好 */
        @media (prefers-reduced-motion: reduce) {
          .motion-safe\\:animate-heart-beat,
          .motion-safe\\:animate-ripple,
          .motion-safe\\:animate-particle-explode {
            animation: none;
          }
        }
      `}</style>
    </button>
  );
}
