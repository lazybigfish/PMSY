/**
 * 外采统计卡片组件
 * 显示项目金额、已外采金额、剩余金额，以及低余额预警
 */

import React from 'react';
import { AlertTriangle, Wallet, Receipt, PiggyBank } from 'lucide-react';
import type { ProjectProcurementStats } from '../services/projectFinanceService';

interface ProcurementStatsCardProps {
  stats: ProjectProcurementStats | null;
  isLoading?: boolean;
}

/**
 * 格式化金额显示
 */
function formatAmount(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN')}`;
}

export function ProcurementStatsCard({ stats, isLoading = false }: ProcurementStatsCardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-dark-200 animate-pulse">
            <div className="h-4 bg-dark-200 rounded w-20 mb-2"></div>
            <div className="h-8 bg-dark-200 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const { projectAmount, totalContractAmount, remainingAmount, remainingPercentage } = stats;
  const isLowBudget = remainingPercentage < 10;

  const statItems = [
    {
      icon: Wallet,
      label: '项目金额',
      value: formatAmount(projectAmount),
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      icon: Receipt,
      label: '已外采金额',
      value: formatAmount(totalContractAmount),
      color: 'text-sun-600',
      bgColor: 'bg-sun-50',
    },
    {
      icon: PiggyBank,
      label: '剩余可外采',
      value: formatAmount(remainingAmount),
      color: isLowBudget ? 'text-red-600' : 'text-green-600',
      bgColor: isLowBudget ? 'bg-red-50' : 'bg-green-50',
    },
  ];

  return (
    <div className="mb-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-xl p-4 border border-dark-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${item.bgColor}`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <span className="text-sm text-dark-500">{item.label}</span>
            </div>
            <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* 低余额预警 */}
      {isLowBudget && (
        <div className="mt-4 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-red-700">剩余可外采金额不足10%</div>
            <div className="text-sm text-red-600">
              当前剩余 {remainingPercentage}% ({formatAmount(remainingAmount)})，请合理规划供应商分配
            </div>
          </div>
        </div>
      )}

      {/* 进度条 */}
      <div className="mt-4">
        <div className="flex justify-between text-sm text-dark-500 mb-1">
          <span>外采进度</span>
          <span>{Math.round((totalContractAmount / (projectAmount || 1)) * 100)}%</span>
        </div>
        <div className="h-2 bg-dark-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isLowBudget ? 'bg-red-500' : 'bg-primary-500'
            }`}
            style={{
              width: `${Math.min((totalContractAmount / (projectAmount || 1)) * 100, 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
