import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  min?: string;
  max?: string;
}

interface QuickDateOption {
  label: string;
  days: number;
}

const quickDateOptions: QuickDateOption[] = [
  { label: '今天', days: 0 },
  { label: '明天', days: 1 },
  { label: '三天后', days: 3 },
  { label: '一周后', days: 7 },
  { label: '一月后', days: 30 },
  { label: '三月后', days: 90 },
];

export function DatePicker({
  value,
  onChange,
  placeholder = '选择日期',
  required = false,
  className = '',
  min,
  max,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      return new Date(value);
    }
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 当 value 变化时更新当前月份
  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value));
    }
  }, [value]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateSelect = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleQuickDateSelect = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const dateStr = formatDate(date);
    onChange(dateStr);
    setCurrentMonth(new Date(date));
    setIsOpen(false);
  };

  const navigateMonth = (direction: number) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days: JSX.Element[] = [];

    // 空白占位
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    // 日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(new Date(year, month, day));
      const isSelected = value === dateStr;
      const isToday = formatDate(new Date()) === dateStr;

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateSelect(dateStr)}
          className={`
            w-8 h-8 rounded-lg text-sm font-medium transition-all
            ${isSelected
              ? 'bg-primary-500 text-white'
              : isToday
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'hover:bg-dark-100 text-dark-700'
            }
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const displayValue = value
    ? new Date(value).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 输入框 - 整个可点击 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-2 px-4 py-2.5
          bg-white border rounded-xl text-left
          transition-all duration-200
          ${isOpen
            ? 'border-primary-500 ring-2 ring-primary-100'
            : 'border-dark-200 hover:border-dark-300'
          }
          ${!value && 'text-dark-400'}
        `}
      >
        <Calendar className="w-5 h-5 text-dark-400 flex-shrink-0" />
        <span className="flex-1 truncate">
          {displayValue || placeholder}
        </span>
        {required && !value && (
          <span className="text-red-500 text-xs">*</span>
        )}
      </button>

      {/* 日期选择弹窗 */}
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white rounded-2xl shadow-xl border border-dark-200 p-4 min-w-[320px]">
          {/* 快捷选项 */}
          <div className="mb-4">
            <p className="text-xs text-dark-500 mb-2 font-medium">快捷选择</p>
            <div className="flex flex-wrap gap-2">
              {quickDateOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleQuickDateSelect(option.days)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg
                    bg-dark-50 text-dark-700 hover:bg-primary-100 hover:text-primary-700
                    transition-colors border border-dark-200 hover:border-primary-300"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 月份导航 */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="p-1.5 hover:bg-dark-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-dark-600" />
            </button>
            <span className="text-sm font-semibold text-dark-900">
              {currentMonth.getFullYear()}年 {monthNames[currentMonth.getMonth()]}
            </span>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="p-1.5 hover:bg-dark-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-dark-600" />
            </button>
          </div>

          {/* 星期标题 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <div
                key={day}
                className="w-8 h-8 flex items-center justify-center text-xs font-medium text-dark-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>

          {/* 底部操作 */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-dark-100">
            <button
              type="button"
              onClick={() => handleQuickDateSelect(0)}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              今天
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="text-xs text-dark-500 hover:text-dark-700 font-medium"
            >
              清除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
