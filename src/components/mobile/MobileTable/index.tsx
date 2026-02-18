import React from 'react';
import { MobileTableProps } from './types';
import { MobileTableCard } from './MobileTableCard';

export function MobileTable<T>({
  data,
  columns,
  keyExtractor,
  onRowPress,
  onRowLongPress,
  renderActions,
  expandable = false,
  renderExpanded,
  emptyText = '暂无数据',
  loading = false,
  skeletonCount = 3,
  className = '',
  cardClassName = '',
}: MobileTableProps<T>) {
  // 骨架屏
  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div
            key={index}
            className="bg-white dark:bg-dark-800 rounded-xl border border-dark-100 dark:border-dark-700 p-4 animate-pulse"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-dark-200 dark:bg-dark-700 rounded w-1/4" />
                <div className="h-4 bg-dark-200 dark:bg-dark-700 rounded w-1/3" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-4 bg-dark-200 dark:bg-dark-700 rounded w-1/5" />
                <div className="h-4 bg-dark-200 dark:bg-dark-700 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 空状态
  if (data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <div className="w-16 h-16 bg-dark-100 dark:bg-dark-800 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-dark-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="text-dark-500 dark:text-dark-400 text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {data.map((item, index) => (
        <MobileTableCard
          key={keyExtractor(item)}
          item={item}
          columns={columns}
          index={index}
          onPress={onRowPress}
          onLongPress={onRowLongPress}
          renderActions={renderActions}
          expandable={expandable}
          renderExpanded={renderExpanded}
          className={cardClassName}
        />
      ))}
    </div>
  );
}

export { MobileTableCard } from './MobileTableCard';
export type { MobileTableProps, MobileTableColumn } from './types';
