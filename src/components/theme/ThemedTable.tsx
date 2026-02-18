import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  title: string;
  width?: string;
  render?: (record: T) => React.ReactNode;
}

interface ThemedTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number) => void;
  };
  rowKey?: string | ((record: T) => string);
  onRowClick?: (record: T) => void;
  emptyText?: string;
}

export function ThemedTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  rowKey = 'id',
  onRowClick,
  emptyText = '暂无数据',
}: ThemedTableProps<T>) {
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] ?? index.toString();
  };

  // 主题特定样式
  const getTableStyles = () => {
    switch (themeConfig.name) {
      case 'V1 经典版':
        return {
          container: 'bg-white rounded-xl shadow-sm border border-orange-100',
          header: 'bg-gradient-to-r from-orange-50 to-orange-100/50',
          headerCell: 'text-gray-700 font-semibold',
          row: 'border-b border-orange-50 hover:bg-orange-50/30 transition-colors',
          cell: 'text-gray-600',
          empty: 'text-gray-400',
        };
      case 'V2 科技版':
        return {
          container: `rounded-lg border ${isDark ? 'bg-gray-900/50 border-cyan-500/20' : 'bg-white border-gray-200'} overflow-hidden`,
          header: isDark ? 'bg-cyan-500/10 border-b border-cyan-500/20' : 'bg-gray-50 border-b border-gray-200',
          headerCell: isDark ? 'text-cyan-400 font-mono font-semibold' : 'text-gray-700 font-semibold',
          row: isDark
            ? 'border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors'
            : 'border-b border-gray-100 hover:bg-gray-50 transition-colors',
          cell: isDark ? 'text-gray-300' : 'text-gray-600',
          empty: isDark ? 'text-gray-500' : 'text-gray-400',
        };
      case 'V3 时尚版':
        return {
          container: 'bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-100/50 shadow-sm overflow-hidden',
          header: 'bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-blue-100/50',
          headerCell: 'text-gray-700 font-semibold',
          row: 'border-b border-blue-50 hover:bg-blue-50/30 transition-colors',
          cell: 'text-gray-600',
          empty: 'text-gray-400',
        };
      default:
        return {
          container: 'bg-white rounded-lg border border-gray-200',
          header: 'bg-gray-50 border-b border-gray-200',
          headerCell: 'text-gray-700 font-semibold',
          row: 'border-b border-gray-100 hover:bg-gray-50 transition-colors',
          cell: 'text-gray-600',
          empty: 'text-gray-400',
        };
    }
  };

  const styles = getTableStyles();

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;

  return (
    <div className={styles.container}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={styles.header}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 text-left text-sm ${styles.headerCell}`}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                      style={{
                        borderColor: colors.primary[200],
                        borderTopColor: 'transparent',
                      }}
                    />
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <span className={`text-sm ${styles.empty}`}>{emptyText}</span>
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr
                  key={getRowKey(record, index)}
                  className={`${styles.row} ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(record)}
                >
                  {columns.map((column) => (
                    <td
                      key={`${getRowKey(record, index)}-${column.key}`}
                      className={`px-6 py-4 text-sm ${styles.cell}`}
                    >
                      {column.render
                        ? column.render(record)
                        : record[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {pagination && totalPages > 1 && (
        <div
          className={`flex items-center justify-between px-6 py-4 border-t ${
            themeConfig.name === 'V1 经典版'
              ? 'border-orange-100'
              : themeConfig.name === 'V2 科技版'
              ? isDark
                ? 'border-cyan-500/20'
                : 'border-gray-200'
              : 'border-blue-100/50'
          }`}
        >
          <span
            className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            共 {pagination.total} 条记录
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onChange(pagination.current - 1)}
              disabled={pagination.current === 1}
              className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                themeConfig.name === 'V1 经典版'
                  ? 'hover:bg-orange-50 text-gray-600 hover:text-orange-500'
                  : themeConfig.name === 'V2 科技版'
                  ? isDark
                    ? 'hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                  : 'hover:bg-blue-50 text-gray-600 hover:text-blue-500'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => pagination.onChange(page)}
                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pagination.current === page
                    ? themeConfig.name === 'V1 经典版'
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                      : themeConfig.name === 'V2 科技版'
                      ? isDark
                        ? 'bg-cyan-500 text-gray-900 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                        : 'bg-blue-600 text-white shadow-md'
                      : 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                    : themeConfig.name === 'V1 经典版'
                    ? 'hover:bg-orange-50 text-gray-600'
                    : themeConfig.name === 'V2 科技版'
                    ? isDark
                      ? 'hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400'
                      : 'hover:bg-gray-100 text-gray-600'
                    : 'hover:bg-blue-50 text-gray-600 hover:text-blue-500'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => pagination.onChange(pagination.current + 1)}
              disabled={pagination.current === totalPages}
              className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                themeConfig.name === 'V1 经典版'
                  ? 'hover:bg-orange-50 text-gray-600 hover:text-orange-500'
                  : themeConfig.name === 'V2 科技版'
                  ? isDark
                    ? 'hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                  : 'hover:bg-blue-50 text-gray-600 hover:text-blue-500'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
