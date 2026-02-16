import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, Shuffle } from 'lucide-react';
import { Modal } from './Modal';
import { generateAvatarOptions, regenerateAvatar, generateDefaultAvatar } from '../lib/avatarGenerator';

interface AvatarSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatarUrl: string) => void;
  currentAvatar?: string | null;
  userId: string;
}

const STYLE_LABELS = {
  morandi: '莫兰迪',
  vibrant: '活力',
  dark: '深邃',
};

const STYLE_COLORS = {
  morandi: 'bg-stone-200 text-stone-700',
  vibrant: 'bg-gradient-to-r from-pink-400 to-cyan-400 text-white',
  dark: 'bg-slate-800 text-slate-200',
};

export function AvatarSelector({
  isOpen,
  onClose,
  onSelect,
  currentAvatar,
  userId,
}: AvatarSelectorProps) {
  const [options, setOptions] = useState<Array<{ url: string; seed: string; style: 'morandi' | 'vibrant' | 'dark' }>>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStyle, setActiveStyle] = useState<'morandi' | 'vibrant' | 'dark' | 'all'>('all');

  // 生成头像选项
  const generateOptions = () => {
    setLoading(true);
    // 使用 setTimeout 让 UI 有时间显示 loading 状态
    setTimeout(() => {
      const newOptions = generateAvatarOptions(userId, 9);
      setOptions(newOptions);
      setLoading(false);
    }, 100);
  };

  // 初始化
  useEffect(() => {
    if (isOpen) {
      generateOptions();
      setSelectedUrl(currentAvatar || null);
    }
  }, [isOpen, userId]);

  // 按风格筛选
  const filteredOptions = activeStyle === 'all' 
    ? options 
    : options.filter(opt => opt.style === activeStyle);

  // 重新生成单个头像
  const handleRegenerate = (index: number) => {
    const option = options[index];
    const newAvatar = regenerateAvatar(userId, option.style);
    
    const newOptions = [...options];
    newOptions[index] = { ...newAvatar, style: option.style };
    setOptions(newOptions);
    
    // 如果当前选中的是这个头像，更新选中状态
    if (selectedUrl === option.url) {
      setSelectedUrl(newAvatar.url);
    }
  };

  // 确认选择
  const handleConfirm = () => {
    if (selectedUrl) {
      onSelect(selectedUrl);
      onClose();
    }
  };

  // 使用默认头像
  const handleUseDefault = () => {
    const defaultAvatar = generateDefaultAvatar(userId);
    onSelect(defaultAvatar);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="选择头像"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* 风格筛选 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">风格：</span>
            <div className="flex gap-1">
              {(['all', 'morandi', 'vibrant', 'dark'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setActiveStyle(style)}
                  className={`px-3 py-1 text-xs rounded-full transition-all ${
                    activeStyle === style
                      ? style === 'all'
                        ? 'bg-indigo-600 text-white'
                        : STYLE_COLORS[style]
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {style === 'all' ? '全部' : STYLE_LABELS[style]}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={generateOptions}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <Shuffle className="h-4 w-4" />
            换一批
          </button>
        </div>

        {/* 头像网格 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {filteredOptions.map((option, index) => (
              <div key={`${option.seed}-${index}`} className="relative group">
                <button
                  onClick={() => setSelectedUrl(option.url)}
                  className={`relative w-full aspect-square rounded-xl overflow-hidden transition-all duration-200 ${
                    selectedUrl === option.url
                      ? 'ring-2 ring-indigo-600 ring-offset-2'
                      : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2'
                  }`}
                >
                  <img
                    src={option.url}
                    alt={`头像选项 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* 选中标记 */}
                  {selectedUrl === option.url && (
                    <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                      <div className="bg-indigo-600 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                  
                  {/* 风格标签 */}
                  <span className={`absolute top-1 left-1 px-1.5 py-0.5 text-[10px] rounded ${STYLE_COLORS[option.style]}`}>
                    {STYLE_LABELS[option.style]}
                  </span>
                </button>
                
                {/* 刷新按钮 */}
                <button
                  onClick={() => handleRegenerate(index)}
                  className="absolute -top-2 -right-2 p-1.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
                  title="重新生成"
                >
                  <RefreshCw className="h-3 w-3 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 底部操作 */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={handleUseDefault}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            使用系统默认
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedUrl}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认选择
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
