import React from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, AlertTriangle, Clock, Wallet, Activity, ArrowRight } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { ThemedCard } from '../../../components/theme/ThemedCard';

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
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';

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

  const cards = [
    {
      id: 'budget',
      title: '合同总金额（作为项目经理）',
      value: formatAmount(stats.totalBudget),
      rawValue: stats.totalBudget,
      icon: Wallet,
      color: colors.primary[500],
      bgColor: isDark ? `${colors.primary[500]}20` : `${colors.primary[50]}`,
      footer: '财务概览',
      link: null,
    },
    {
      id: 'risks',
      title: '风险提示',
      value: stats.pendingRisks,
      suffix: '待处理',
      icon: AlertTriangle,
      color: colors.status.error,
      bgColor: isDark ? `${colors.status.error}20` : `${colors.status.error}15`,
      footer: '风险中心',
      link: '/projects',
    },
    {
      id: 'tasks',
      title: '任务总数',
      value: stats.taskTotal,
      icon: CheckSquare,
      color: colors.status.info,
      bgColor: isDark ? `${colors.status.info}20` : `${colors.status.info}15`,
      footer: '我的任务',
      link: '/tasks',
    },
    {
      id: 'overdue',
      title: '超期未完成',
      value: stats.overdueTasks,
      suffix: '需尽快处理',
      icon: Clock,
      color: colors.status.warning,
      bgColor: isDark ? `${colors.status.warning}20` : `${colors.status.warning}15`,
      footer: '去处理',
      link: '/tasks',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <ThemedCard
          key={card.id}
          variant="default"
          className="overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer group p-0"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div
                className="p-3 rounded-lg group-hover:scale-110 transition-transform duration-200"
                style={{
                  backgroundColor: card.bgColor,
                  color: card.color,
                }}
              >
                <card.icon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {card.title}
                </p>
                <div className="flex items-baseline gap-2">
                  <h3
                    className={`text-2xl font-bold truncate max-w-[140px] group-hover:transition-colors duration-200 group-hover:text-[${card.color}] ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                    title={String(card.value)}
                  >
                    {card.value}
                  </h3>
                  {card.suffix && (
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {card.suffix}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div
            className="px-6 py-2 transition-colors duration-200"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.background.main,
            }}
          >
            {card.link ? (
              <Link
                to={card.link}
                className="text-xs font-medium flex items-center justify-between group/link"
                style={{ color: card.color }}
              >
                {card.footer}
                <ArrowRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <div
                className="text-xs font-medium flex items-center justify-between cursor-default"
                style={{ color: card.color }}
              >
                {card.footer}
                <Activity className="h-3 w-3" />
              </div>
            )}
          </div>
        </ThemedCard>
      ))}
    </div>
  );
}
