import React from 'react';
import { Flag, CheckCircle, Clock, AlertCircle, Plus, Trash2 } from 'lucide-react';

interface Milestone {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  start_date: string;
  end_date: string;
  phase_order: number;
  progress: number;
  is_custom?: boolean;
}

interface MilestoneSidebarProps {
  milestones: Milestone[];
  selectedMilestoneId: string | null;
  onSelectMilestone: (milestone: Milestone) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onDeleteMilestone: (e: React.MouseEvent, milestone: Milestone) => void;
  onAddMilestone: () => void;
}

export function MilestoneSidebar({
  milestones,
  selectedMilestoneId,
  onSelectMilestone,
  onDeleteMilestone,
  onAddMilestone
}: MilestoneSidebarProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'in_progress':
        return '进行中';
      default:
        return '待开始';
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">项目阶段</h3>
          <button
            onClick={onAddMilestone}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="添加阶段"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {milestones.map((milestone, index) => (
          <div
            key={milestone.id}
            onClick={() => onSelectMilestone(milestone)}
            className={`p-3 rounded-lg cursor-pointer transition-all ${
              selectedMilestoneId === milestone.id
                ? 'bg-indigo-50 border-2 border-indigo-500'
                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(milestone.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">阶段 {index + 1}</span>
                  {milestone.is_custom && (
                    <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">自定义</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mt-1 truncate">{milestone.name}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${milestone.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{milestone.progress}%</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${
                    milestone.status === 'completed' ? 'text-green-600' :
                    milestone.status === 'in_progress' ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {getStatusText(milestone.status)}
                  </span>
                  {milestone.is_custom && (
                    <button
                      onClick={(e) => onDeleteMilestone(e, milestone)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {milestones.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Flag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无里程碑</p>
            <button
              onClick={onAddMilestone}
              className="mt-4 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              创建第一个阶段
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
