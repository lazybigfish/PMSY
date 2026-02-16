import React from 'react';
import { Trash2, PlayCircle, PauseCircle, CheckCircle2, UserPlus, X } from 'lucide-react';

interface BatchActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onChangeStatus: () => void;
  onAssign: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onDelete,
  onChangeStatus,
  onAssign,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-dark-200 px-6 py-4 flex items-center gap-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
        {/* 选中数量 */}
        <div className="flex items-center gap-2 pr-6 border-r border-dark-200">
          <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
            {selectedCount}
          </span>
          <span className="text-dark-700 font-medium">个任务已选择</span>
        </div>

        {/* 操作按钮组 */}
        <div className="flex items-center gap-2">
          {/* 修改状态 */}
          <button
            onClick={onChangeStatus}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-dark-700 hover:bg-dark-50 hover:text-primary-600 transition-colors"
            title="批量修改状态"
          >
            <PlayCircle className="w-4 h-4" />
            <span>修改状态</span>
          </button>

          {/* 分配处理人 */}
          <button
            onClick={onAssign}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-dark-700 hover:bg-dark-50 hover:text-violet-600 transition-colors"
            title="批量分配处理人"
          >
            <UserPlus className="w-4 h-4" />
            <span>分配处理人</span>
          </button>

          {/* 删除 */}
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-dark-700 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="批量删除"
          >
            <Trash2 className="w-4 h-4" />
            <span>删除</span>
          </button>
        </div>

        {/* 取消选择 */}
        <button
          onClick={onClearSelection}
          className="ml-2 p-2 rounded-xl text-dark-400 hover:bg-dark-50 hover:text-dark-600 transition-colors"
          title="取消选择"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
