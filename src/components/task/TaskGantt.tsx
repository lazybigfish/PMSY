import React, { useState, useMemo } from 'react';
import { useGantt, getTaskBarPosition, getTodayColumnIndex } from '../../hooks/useGantt';
import { GanttTimeline } from './GanttTimeline';
import { GanttTaskBar } from './GanttTaskBar';
import { GanttDependencyLines } from './GanttDependencyLines';
import type { Task } from '../../types/task';
import type { GanttTask, GanttViewMode, GanttColumn } from '../../types/gantt';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface TaskGanttProps {
  tasks: Task[];
  dependencies?: Map<string, { dependencies: any[]; dependents: any[] }>;
  onTaskClick?: (taskId: string) => void;
}

const viewModeOptions: { value: GanttViewMode; label: string }[] = [
  { value: 'day', label: '按日' },
  { value: 'week', label: '按周' },
  { value: 'month', label: '按月' },
];

export function TaskGantt({ tasks, dependencies, onTaskClick }: TaskGanttProps) {
  const [viewMode, setViewMode] = useState<GanttViewMode>('week');
  const [scrollLeft, setScrollLeft] = useState(0);

  const { ganttTasks, columns, config } = useGantt({
    tasks,
    config: { viewMode },
    dependencies,
  });

  const todayColumnIndex = getTodayColumnIndex(columns);

  const handlePrev = () => {
    setScrollLeft((prev) => Math.max(prev - 200, 0));
  };

  const handleNext = () => {
    setScrollLeft((prev) => prev + 200);
  };

  const handleTaskClick = (task: GanttTask) => {
    onTaskClick?.(task.id);
  };

  const tasksWithPositions = useMemo(() => {
    return ganttTasks.map((task) => ({
      task,
      position: getTaskBarPosition(task, columns, viewMode, config.columnWidth),
    }));
  }, [ganttTasks, columns, viewMode, config.columnWidth]);

  const validTasks = tasksWithPositions.filter((t) => t.position !== null);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">甘特图视图</h3>
          <span className="text-sm text-gray-500">({tasksWithPositions.length} 个任务)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex gap-1">
            {viewModeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setViewMode(option.value)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  viewMode === option.value
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {tasksWithPositions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无设置了日期的任务</p>
            <p className="text-sm mt-1">为任务设置开始日期或截止日期后，将在此显示甘特图</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <GanttTimeline columns={columns} viewMode={viewMode} columnWidth={config.columnWidth} />

          <div className="flex-1 overflow-auto">
            <div className="flex min-h-full">
              <div className="w-48 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
                {tasksWithPositions.map(({ task }) => (
                  <div
                    key={task.id}
                    className="h-12 px-3 flex items-center border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => handleTaskClick(task)}
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>

              <div className="relative" style={{ width: columns.length * config.columnWidth }}>
                {validTasks.map(({ task, position }) => (
                  <div
                    key={task.id}
                    className="h-12 border-b border-gray-100 dark:border-gray-800 relative"
                  >
                    {position && (
                      <GanttTaskBar
                        task={task}
                        position={position}
                        columnWidth={config.columnWidth}
                        viewMode={viewMode}
                        onClick={handleTaskClick}
                      />
                    )}
                  </div>
                ))}

                <GanttDependencyLines
                  tasks={ganttTasks}
                  columns={columns}
                  columnWidth={config.columnWidth}
                  rowHeight={48}
                  viewMode={viewMode}
                />

                {todayColumnIndex >= 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                    style={{ left: todayColumnIndex * config.columnWidth + config.columnWidth / 2 }}
                  >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskGantt;
