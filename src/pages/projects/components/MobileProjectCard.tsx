import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, Layers, Wallet, TrendingUp, Activity } from 'lucide-react';
import { ThemedCard } from '../../../components/theme/ThemedCard';

interface ProjectWithDetails {
  id: string;
  name: string;
  customer_name?: string;
  amount?: number;
  status: string;
  is_public?: boolean;
  current_stage_name?: string;
  module_progress?: number;
  member_count?: number;
  health_score?: number;
  user_role?: 'manager' | 'member' | null;
  total_payment?: number;
  payment_percentage?: number;
}

interface MobileProjectCardProps {
  project: ProjectWithDetails;
  index: number;
  onDelete: (projectId: string) => void;
  isDark: boolean;
  colors: any;
}

const statusLabels: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成'
};

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700' },
  in_progress: { bg: 'bg-green-100', text: 'text-green-700' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-700' }
};

const getStageColor = (stageName: string, isDark: boolean): { bg: string; text: string } => {
  const stageColors: Record<string, { bg: string; text: string }> = {
    '进场前阶段': { bg: isDark ? 'bg-slate-700' : 'bg-slate-100', text: isDark ? 'text-slate-300' : 'text-slate-600' },
    '启动阶段': { bg: isDark ? 'bg-blue-900' : 'bg-blue-100', text: isDark ? 'text-blue-300' : 'text-blue-600' },
    '实施阶段': { bg: isDark ? 'bg-purple-900' : 'bg-purple-100', text: isDark ? 'text-purple-300' : 'text-purple-600' },
    '初验阶段': { bg: isDark ? 'bg-fuchsia-900' : 'bg-fuchsia-100', text: isDark ? 'text-fuchsia-300' : 'text-fuchsia-600' },
    '试运行阶段': { bg: isDark ? 'bg-amber-900' : 'bg-amber-100', text: isDark ? 'text-amber-300' : 'text-amber-600' },
    '终验阶段': { bg: isDark ? 'bg-cyan-900' : 'bg-cyan-100', text: isDark ? 'text-cyan-300' : 'text-cyan-600' },
    '运维阶段': { bg: isDark ? 'bg-emerald-900' : 'bg-emerald-100', text: isDark ? 'text-emerald-300' : 'text-emerald-600' },
  };
  return stageColors[stageName] || { bg: isDark ? 'bg-slate-700' : 'bg-slate-100', text: isDark ? 'text-slate-300' : 'text-slate-600' };
};

const getHealthColor = (score: number, isDark: boolean) => {
  if (score >= 80) return isDark ? 'text-emerald-400' : 'text-emerald-600';
  if (score >= 60) return isDark ? 'text-amber-400' : 'text-amber-600';
  return isDark ? 'text-red-400' : 'text-red-600';
};

const getPaymentPercentageColor = (percentage: number, isDark: boolean) => {
  if (percentage >= 80) return isDark ? 'text-emerald-400' : 'text-emerald-600';
  if (percentage >= 50) return isDark ? 'text-blue-400' : 'text-blue-600';
  if (percentage >= 20) return isDark ? 'text-amber-400' : 'text-amber-600';
  return isDark ? 'text-red-400' : 'text-red-600';
};

const formatAmount = (amount?: number) => {
  if (amount === undefined || amount === null) return '¥0.00';
  if (amount >= 100000000) {
    return (amount / 100000000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '亿';
  }
  if (amount >= 10000) {
    return (amount / 10000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '万';
  }
  return '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function MobileProjectCard({ project, index, onDelete, isDark, colors }: MobileProjectCardProps) {
  const navigate = useNavigate();
  const stageStyle = getStageColor(project.current_stage_name || '', isDark);
  const statusStyle = statusColors[project.status] || statusColors.pending;

  return (
    <ThemedCard variant="default" className="p-3 sm:p-4">
      {/* 头部：序号 + 项目名称 + 状态 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} flex-shrink-0`}>
            {index + 1}
          </span>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {project.is_public && (
              <Eye className="w-3 h-3 flex-shrink-0" style={{ color: isDark ? '#34d399' : '#059669' }} />
            )}
            <h3 
              className="font-semibold text-sm truncate cursor-pointer"
              style={{ color: isDark ? '#fff' : colors.primary[600] }}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              {project.name}
            </h3>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs ${statusStyle.bg} ${statusStyle.text} flex-shrink-0`}>
          {statusLabels[project.status]}
        </span>
      </div>

      {/* 客户信息 */}
      {project.customer_name && (
        <p className={`text-xs mt-1 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {project.customer_name}
        </p>
      )}

      {/* 中间信息：阶段、成员、进度 */}
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span className={`px-2 py-0.5 rounded-full text-xs ${stageStyle.bg} ${stageStyle.text}`}>
          {project.current_stage_name || '未设置'}
        </span>
        <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <Layers className="w-3 h-3" />
          {project.member_count || 0} 成员
        </span>
        {project.health_score !== undefined && (
          <span className={`text-xs flex items-center gap-1 ${getHealthColor(project.health_score, isDark)}`}>
            <Activity className="w-3 h-3" />
            {project.health_score}分
          </span>
        )}
      </div>

      {/* 进度条 */}
      {project.module_progress !== undefined && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>进度</span>
            <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{project.module_progress}%</span>
          </div>
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${project.module_progress}%`,
                backgroundColor: colors.primary[500]
              }}
            />
          </div>
        </div>
      )}

      {/* 金额信息 */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }}>
        <div>
          <div className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>合同金额</div>
          <div className="text-sm font-semibold" style={{ color: colors.primary[600] }}>
            {formatAmount(project.amount)}
          </div>
        </div>
        
        {project.total_payment ? (
          <div className="text-right">
            <div className="text-xs flex items-center justify-end gap-1" style={{ color: isDark ? '#34d399' : '#059669' }}>
              <Wallet className="w-3 h-3" />
              已回款
            </div>
            <div className="text-sm font-semibold" style={{ color: isDark ? '#34d399' : '#059669' }}>
              {formatAmount(project.total_payment)}
            </div>
            <div className={`text-xs ${getPaymentPercentageColor(project.payment_percentage || 0, isDark)}`}>
              {(project.payment_percentage || 0).toFixed(1)}%
            </div>
          </div>
        ) : (
          <div className="text-right">
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>暂无回款</div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {project.user_role === 'manager' && (
        <div className="flex justify-end mt-2">
          <button
            onClick={() => onDelete(project.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </ThemedCard>
  );
}
