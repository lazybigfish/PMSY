import React from 'react';
import { generateDefaultAvatar } from '../lib/avatarGenerator';

interface AvatarProps {
  userId?: string;
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  rounded?: 'full' | 'xl' | 'lg' | 'md';
}

const SIZE_MAP = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

const TEXT_SIZE_MAP = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
};

const ROUNDED_MAP = {
  full: 'rounded-full',
  xl: 'rounded-xl',
  lg: 'rounded-lg',
  md: 'rounded-md',
};

/**
 * 统一头像组件
 * 优先使用 avatarUrl，如果没有则根据 userId 生成抽象头像
 * 如果都没有则显示首字母
 */
export function Avatar({
  userId,
  avatarUrl,
  name,
  email,
  size = 'md',
  className = '',
  rounded = 'full',
}: AvatarProps) {
  // 生成抽象头像 URL
  const generatedAvatarUrl = React.useMemo(() => {
    if (avatarUrl) return avatarUrl;
    if (userId) return generateDefaultAvatar(userId);
    return null;
  }, [avatarUrl, userId]);

  // 获取显示文字（首字母）
  const initial = React.useMemo(() => {
    if (name) return name.charAt(0);
    if (email) return email.charAt(0);
    return '?';
  }, [name, email]);

  const sizeClass = SIZE_MAP[size];
  const textSizeClass = TEXT_SIZE_MAP[size];
  const roundedClass = ROUNDED_MAP[rounded];

  // 如果有头像 URL，显示图片
  if (generatedAvatarUrl) {
    return (
      <img
        src={generatedAvatarUrl}
        alt={name || email || '用户头像'}
        className={`${sizeClass} ${roundedClass} object-cover ${className}`}
      />
    );
  }

  // 否则显示首字母
  return (
    <div
      className={`${sizeClass} ${roundedClass} bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold ${textSizeClass} ${className}`}
    >
      {initial.toUpperCase()}
    </div>
  );
}

export default Avatar;
