import React from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, AlertTriangle, Clock, Wallet, Activity, ArrowRight } from 'lucide-react';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  taskTotal: number;
  overdueTasks: number;
  highPriorityTasks: number;
  pendingRisks: number;
  totalBudget: number;
}

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const formatAmount = (amount?: number) => {
    if (amount === undefined || amount === null) return '¥0.00';
    if (amount >= 100000000) {
      return '¥' + (amount / 100000000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '亿';
    }
    if (amount >= 10000) {
      return '¥' + (amount / 10000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '万';
    }
    return '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Project Contract Amount Card */}
      <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-200 transition-all duration-200 ease-out cursor-pointer group">
        <div className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform duration-200">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">合同总金额（作为项目经理）</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-gray-900 truncate max-w-[140px] group-hover:text-indigo-600 transition-colors duration-200" title={formatAmount(stats.totalBudget)}>
                  {formatAmount(stats.totalBudget)}
                </h3>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-2 group-hover:bg-indigo-50/50 transition-colors duration-200">
          <div className="text-xs font-medium text-indigo-600 flex items-center justify-between cursor-default">
            财务概览 <Activity className="h-3 w-3" />
          </div>
        </div>
      </div>

      {/* Risks Card */}
      <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 hover:border-red-200 transition-all duration-200 ease-out cursor-pointer group">
        <div className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-red-50 text-red-600 group-hover:scale-110 transition-transform duration-200">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">风险提示</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-red-600 transition-colors duration-200">{stats.pendingRisks}</h3>
                <span className="text-xs text-gray-400">待处理</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-2 group-hover:bg-red-50/50 transition-colors duration-200">
          <Link to="/projects" className="text-xs font-medium text-red-600 hover:text-red-500 flex items-center justify-between group/link">
            风险中心 <ArrowRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Total Tasks Card */}
      <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 transition-all duration-200 ease-out cursor-pointer group">
        <div className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform duration-200">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">任务总数</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">{stats.taskTotal}</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-2 group-hover:bg-blue-50/50 transition-colors duration-200">
          <Link to="/tasks" className="text-xs font-medium text-blue-600 hover:text-blue-500 flex items-center justify-between group/link">
            我的任务 <ArrowRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Overdue Tasks Card */}
      <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 hover:border-orange-200 transition-all duration-200 ease-out cursor-pointer group">
        <div className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-50 text-orange-600 group-hover:scale-110 transition-transform duration-200">
              <Clock className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">超期未完成</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors duration-200">{stats.overdueTasks}</h3>
                <span className="text-xs text-gray-400">需尽快处理</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-2 group-hover:bg-orange-50/50 transition-colors duration-200">
          <Link to="/tasks" className="text-xs font-medium text-orange-600 hover:text-orange-500 flex items-center justify-between group/link">
            去处理 <ArrowRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
