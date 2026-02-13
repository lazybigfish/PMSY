import { useState, useEffect } from 'react';
import { Search, X, Calendar, Filter, Shield } from 'lucide-react';
import { Project } from '../../../types';
import { DatePicker } from '../../../components/DatePicker';

export interface TaskFilterState {
  keyword: string;
  projectId: string;
  dateRange: {
    type: 'created' | 'due';
    start: string;
    end: string;
  };
  statuses: string[];
  priorities: string[];
}

interface TaskFilterBarProps {
  projects: Project[];
  filters: TaskFilterState;
  onFilterChange: (filters: TaskFilterState) => void;
  isAdmin: boolean;
  currentUserId?: string;
}

const STATUS_OPTIONS = [
  { value: 'todo', label: '未开始', color: 'bg-gray-100 text-gray-600' },
  { value: 'in_progress', label: '进行中', color: 'bg-blue-100 text-blue-600' },
  { value: 'done', label: '已完成', color: 'bg-green-100 text-green-600' },
  { value: 'paused', label: '已暂停', color: 'bg-yellow-100 text-yellow-600' },
  { value: 'canceled', label: '已取消', color: 'bg-red-100 text-red-600' },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: '高', color: 'bg-red-100 text-red-600' },
  { value: 'medium', label: '中', color: 'bg-yellow-100 text-yellow-600' },
  { value: 'low', label: '低', color: 'bg-blue-100 text-blue-600' },
];

const DATE_PRESETS = [
  { label: '今天', days: 0 },
  { label: '本周', days: 7 },
  { label: '本月', days: 30 },
];

export default function TaskFilterBar({ projects, filters, onFilterChange, isAdmin, currentUserId }: TaskFilterBarProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.filter-dropdown')) {
        setIsStatusOpen(false);
        setIsPriorityOpen(false);
        setIsDateOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeywordChange = (value: string) => {
    onFilterChange({ ...filters, keyword: value });
  };

  const handleProjectChange = (projectId: string) => {
    onFilterChange({ ...filters, projectId });
  };

  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFilterChange({ ...filters, statuses: newStatuses });
  };

  const handlePriorityToggle = (priority: string) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    onFilterChange({ ...filters, priorities: newPriorities });
  };

  const handleDateRangeChange = (field: 'type' | 'start' | 'end', value: string) => {
    onFilterChange({
      ...filters,
      dateRange: { ...filters.dateRange, [field]: value }
    });
  };

  const applyDatePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    if (days > 0) {
      start.setDate(end.getDate() - days);
    }
    onFilterChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    });
    setIsDateOpen(false);
  };

  const clearDateRange = () => {
    onFilterChange({
      ...filters,
      dateRange: { type: 'created', start: '', end: '' }
    });
  };

  const resetFilters = () => {
    onFilterChange({
      keyword: '',
      projectId: '',
      dateRange: { type: 'created', start: '', end: '' },
      statuses: [],
      priorities: []
    });
  };

  const hasActiveFilters = filters.keyword || filters.projectId || 
    filters.statuses.length > 0 || filters.priorities.length > 0 ||
    filters.dateRange.start || filters.dateRange.end;

  return (
    <div className="card p-4">
      {/* 权限提示 */}
      {!isAdmin && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg">
          <Shield className="h-4 w-4" />
          <span>您只能搜索与自己相关的任务（我创建的、我负责的、我参与的）</span>
        </div>
      )}
      
      <div className="flex flex-wrap items-center gap-3">
        {/* 关键词搜索 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
          <input
            type="text"
            placeholder={isAdmin ? "搜索任务、项目、责任人..." : "搜索我的任务..."}
            value={filters.keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            className="input pl-9 pr-8 w-full"
          />
          {filters.keyword && (
            <button
              onClick={() => handleKeywordChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 项目筛选 */}
        <div className="filter-dropdown relative">
          <select
            value={filters.projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="input min-w-[140px] cursor-pointer appearance-none pr-8"
            style={{ backgroundImage: 'none' }}
          >
            <option value="">全部项目</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <Filter className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
        </div>

        {/* 时间范围筛选 */}
        <div className="filter-dropdown relative">
          <button
            onClick={() => {
              setIsDateOpen(!isDateOpen);
              setIsStatusOpen(false);
              setIsPriorityOpen(false);
            }}
            className={`input min-w-[140px] flex items-center justify-between gap-2 cursor-pointer ${
              filters.dateRange.start || filters.dateRange.end ? 'border-primary-500 ring-1 ring-primary-500' : ''
            }`}
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-dark-400" />
              <span className="text-sm">
                {filters.dateRange.start && filters.dateRange.end
                  ? `${filters.dateRange.start.slice(5)} ~ ${filters.dateRange.end.slice(5)}`
                  : '时间范围'}
              </span>
            </span>
          </button>
          
          {isDateOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-dark-100 p-4 z-50">
              <div className="space-y-4">
                {/* 日期类型选择 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDateRangeChange('type', 'created')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      filters.dateRange.type === 'created'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-dark-50 text-dark-600 hover:bg-dark-100'
                    }`}
                  >
                    创建时间
                  </button>
                  <button
                    onClick={() => handleDateRangeChange('type', 'due')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      filters.dateRange.type === 'due'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-dark-50 text-dark-600 hover:bg-dark-100'
                    }`}
                  >
                    截止日期
                  </button>
                </div>

                {/* 快捷选项 */}
                <div className="flex gap-2">
                  {DATE_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => applyDatePreset(preset.days)}
                      className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-dark-50 text-dark-600 hover:bg-dark-100 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* 自定义日期 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-dark-500">自定义范围</label>
                  <div className="flex items-center gap-2">
                    <DatePicker
                      value={filters.dateRange.start}
                      onChange={(date) => handleDateRangeChange('start', date)}
                      placeholder="开始日期"
                      className="flex-1"
                    />
                    <span className="text-dark-400">~</span>
                    <DatePicker
                      value={filters.dateRange.end}
                      onChange={(date) => handleDateRangeChange('end', date)}
                      placeholder="结束日期"
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* 清除按钮 */}
                {(filters.dateRange.start || filters.dateRange.end) && (
                  <button
                    onClick={clearDateRange}
                    className="w-full py-2 text-sm text-dark-500 hover:text-dark-700 hover:bg-dark-50 rounded-lg transition-colors"
                  >
                    清除时间筛选
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 状态筛选 */}
        <div className="filter-dropdown relative">
          <button
            onClick={() => {
              setIsStatusOpen(!isStatusOpen);
              setIsPriorityOpen(false);
              setIsDateOpen(false);
            }}
            className={`input min-w-[100px] flex items-center justify-between gap-2 cursor-pointer ${
              filters.statuses.length > 0 ? 'border-primary-500 ring-1 ring-primary-500' : ''
            }`}
          >
            <span className="text-sm">
              {filters.statuses.length > 0 ? `状态 (${filters.statuses.length})` : '状态'}
            </span>
            <Filter className="h-4 w-4 text-dark-400" />
          </button>
          
          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-dark-100 p-2 z-50">
              {STATUS_OPTIONS.map(option => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 p-2 hover:bg-dark-50 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.statuses.includes(option.value)}
                    onChange={() => handleStatusToggle(option.value)}
                    className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${option.color}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 优先级筛选 */}
        <div className="filter-dropdown relative">
          <button
            onClick={() => {
              setIsPriorityOpen(!isPriorityOpen);
              setIsStatusOpen(false);
              setIsDateOpen(false);
            }}
            className={`input min-w-[100px] flex items-center justify-between gap-2 cursor-pointer ${
              filters.priorities.length > 0 ? 'border-primary-500 ring-1 ring-primary-500' : ''
            }`}
          >
            <span className="text-sm">
              {filters.priorities.length > 0 ? `优先级 (${filters.priorities.length})` : '优先级'}
            </span>
            <Filter className="h-4 w-4 text-dark-400" />
          </button>
          
          {isPriorityOpen && (
            <div className="absolute top-full left-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-dark-100 p-2 z-50">
              {PRIORITY_OPTIONS.map(option => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 p-2 hover:bg-dark-50 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.priorities.includes(option.value)}
                    onChange={() => handlePriorityToggle(option.value)}
                    className="w-4 h-4 rounded border-dark-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${option.color}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 重置按钮 */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-3 py-2 text-sm font-medium text-dark-500 hover:text-dark-700 hover:bg-dark-50 rounded-lg transition-colors flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            重置
          </button>
        )}
      </div>

      {/* 已选筛选标签 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-dark-100">
          <span className="text-xs text-dark-400">已选筛选:</span>
          
          {filters.keyword && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full">
              关键词: {filters.keyword}
              <button onClick={() => handleKeywordChange('')} className="hover:text-primary-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {filters.projectId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full">
              项目: {projects.find(p => p.id === filters.projectId)?.name}
              <button onClick={() => handleProjectChange('')} className="hover:text-primary-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {filters.statuses.map(status => {
            const option = STATUS_OPTIONS.find(o => o.value === status);
            return (
              <span key={status} className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${option?.color}`}>
                {option?.label}
                <button onClick={() => handleStatusToggle(status)} className="hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          
          {filters.priorities.map(priority => {
            const option = PRIORITY_OPTIONS.find(o => o.value === priority);
            return (
              <span key={priority} className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${option?.color}`}>
                {option?.label}优先级
                <button onClick={() => handlePriorityToggle(priority)} className="hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          
          {(filters.dateRange.start || filters.dateRange.end) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-700 text-xs rounded-full">
              {filters.dateRange.type === 'created' ? '创建' : '截止'}: {filters.dateRange.start?.slice(5)} ~ {filters.dateRange.end?.slice(5)}
              <button onClick={clearDateRange} className="hover:text-violet-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
