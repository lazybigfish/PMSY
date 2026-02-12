import React from 'react';
import { ChevronDown, ChevronRight, Edit2, Trash2, ArrowUp, ArrowDown, Plus, FileText } from 'lucide-react';

interface OutputDocument {
  name: string;
  required: boolean;
}

interface MilestoneTaskTemplate {
  id: string;
  milestone_template_id: string;
  name: string;
  description: string;
  is_required: boolean;
  output_documents: OutputDocument[];
}

interface MilestoneTemplate {
  id: string;
  version_id: string;
  name: string;
  description: string;
  phase_order: number;
  tasks?: MilestoneTaskTemplate[];
}

interface MilestoneTemplateListProps {
  milestones: MilestoneTemplate[];
  expandedMilestones: Set<string>;
  onToggleExpand: (milestoneId: string) => void;
  onEditMilestone: (milestone: MilestoneTemplate) => void;
  onDeleteMilestone: (milestone: MilestoneTemplate) => void;
  onMoveMilestone: (milestone: MilestoneTemplate, direction: 'up' | 'down') => void;
  onAddTask: (milestone: MilestoneTemplate) => void;
  onEditTask: (task: MilestoneTaskTemplate) => void;
  onDeleteTask: (task: MilestoneTaskTemplate) => void;
  canMoveUp: (milestone: MilestoneTemplate) => boolean;
  canMoveDown: (milestone: MilestoneTemplate) => boolean;
}

export function MilestoneTemplateList({
  milestones,
  expandedMilestones,
  onToggleExpand,
  onEditMilestone,
  onDeleteMilestone,
  onMoveMilestone,
  onAddTask,
  onEditTask,
  onDeleteTask,
  canMoveUp,
  canMoveDown
}: MilestoneTemplateListProps) {
  if (milestones.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>暂无里程碑模板</p>
        <p className="text-sm mt-1">点击上方按钮添加里程碑</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {milestones.map((milestone, index) => {
        const isExpanded = expandedMilestones.has(milestone.id);
        const tasks = milestone.tasks || [];

        return (
          <div
            key={milestone.id}
            className="bg-white border rounded-lg overflow-hidden"
          >
            {/* Milestone Header */}
            <div className="flex items-center p-4 hover:bg-gray-50">
              <button
                onClick={() => onToggleExpand(milestone.id)}
                className="mr-3 text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">阶段 {index + 1}</span>
                  <h3 className="font-medium text-gray-900">{milestone.name}</h3>
                </div>
                {milestone.description && (
                  <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onMoveMilestone(milestone, 'up')}
                  disabled={!canMoveUp(milestone)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="上移"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onMoveMilestone(milestone, 'down')}
                  disabled={!canMoveDown(milestone)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="下移"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEditMilestone(milestone)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600"
                  title="编辑"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteMilestone(milestone)}
                  className="p-1.5 text-gray-400 hover:text-red-600"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tasks List */}
            {isExpanded && (
              <div className="border-t bg-gray-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    任务模板 ({tasks.length})
                  </h4>
                  <button
                    onClick={() => onAddTask(milestone)}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-4 h-4" />
                    添加任务
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    暂无任务模板
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-white border rounded-lg p-3 flex items-start justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-gray-900">{task.name}</h5>
                            {task.is_required && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                必填
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                          )}
                          {task.output_documents && task.output_documents.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {task.output_documents.map((doc, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
                                    doc.required
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  <FileText className="w-3 h-3" />
                                  {doc.name}
                                  {doc.required && <span className="text-orange-500">*</span>}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => onEditTask(task)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteTask(task)}
                            className="p-1.5 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
