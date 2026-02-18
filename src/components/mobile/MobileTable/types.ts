import React from 'react';

/**
 * 移动端表格列配置
 */
export interface MobileTableColumn<T = any> {
  key: string;
  title: string;
  render?: (record: T) => React.ReactNode;
  priority: 'high' | 'medium' | 'low';
  width?: 'full' | 'half' | 'auto';
}

/**
 * 移动端表格 Props
 */
export interface MobileTableProps<T = any> {
  data: T[];
  columns: MobileTableColumn<T>[];
  keyExtractor: (item: T) => string;
  onRowPress?: (item: T) => void;
  onRowLongPress?: (item: T) => void;
  renderActions?: (item: T) => React.ReactNode;
  expandable?: boolean;
  renderExpanded?: (item: T) => React.ReactNode;
  emptyText?: string;
  loading?: boolean;
  skeletonCount?: number;
  className?: string;
  cardClassName?: string;
}

/**
 * 移动端表格卡片项 Props
 */
export interface MobileTableCardProps<T = any> {
  item: T;
  columns: MobileTableColumn<T>[];
  index: number;
  onPress?: (item: T) => void;
  onLongPress?: (item: T) => void;
  renderActions?: (item: T) => React.ReactNode;
  expandable?: boolean;
  renderExpanded?: (item: T) => React.ReactNode;
  className?: string;
}
