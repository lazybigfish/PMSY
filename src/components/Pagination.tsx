import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 20
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems || totalPages * pageSize);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      {/* 统计信息 */}
      {totalItems !== undefined && (
        <div className="text-sm text-dark-500">
          显示 <span className="font-medium text-dark-700">{startItem}-{endItem}</span> 条，
          共 <span className="font-medium text-dark-700">{totalItems}</span> 条
        </div>
      )}

      {/* 分页按钮 */}
      <div className="flex items-center gap-1">
        {/* 上一页 */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-dark-600 bg-white border border-dark-200 rounded-lg hover:bg-dark-50 hover:text-dark-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-dark-600 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          上一页
        </button>

        {/* 页码 */}
        <div className="flex items-center gap-1 mx-2">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className={`min-w-[36px] h-9 px-3 text-sm font-medium rounded-lg transition-all ${
                page === currentPage
                  ? 'bg-primary-600 text-white shadow-md'
                  : page === '...'
                  ? 'text-dark-400 cursor-default'
                  : 'text-dark-600 bg-white border border-dark-200 hover:bg-dark-50 hover:text-dark-800'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        {/* 下一页 */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-dark-600 bg-white border border-dark-200 rounded-lg hover:bg-dark-50 hover:text-dark-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-dark-600 transition-all"
        >
          下一页
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 跳转输入框 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-dark-500">跳至</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          defaultValue={currentPage}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const value = parseInt((e.target as HTMLInputElement).value);
              if (value >= 1 && value <= totalPages) {
                onPageChange(value);
              }
            }
          }}
          className="w-16 px-2 py-2 text-center border border-dark-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <span className="text-dark-500">页</span>
      </div>
    </div>
  );
}
