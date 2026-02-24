import React from 'react';
import type { GanttColumn, GanttViewMode } from '../../types/gantt';

interface GanttTimelineProps {
  columns: GanttColumn[];
  viewMode: GanttViewMode;
  columnWidth: number;
}

export function GanttTimeline({ columns, viewMode, columnWidth }: GanttTimelineProps) {
  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
      <div className="w-48 flex-shrink-0 px-3 py-2 border-r border-gray-200 dark:border-gray-700 font-medium text-sm text-gray-600 dark:text-gray-400">
        任务名称
      </div>
      <div className="flex">
        {columns.map((col, index) => (
          <div
            key={index}
            className={`
              flex-shrink-0 px-2 py-2 text-center text-xs border-r border-gray-200 dark:border-gray-700
              ${col.isWeekend ? 'bg-gray-100 dark:bg-gray-700' : ''}
              ${col.isToday ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
              ${col.isFirstDayOfMonth ? 'border-l-2 border-primary-300' : ''}
            `}
            style={{ width: columnWidth }}
          >
            <div className={`font-medium ${col.isToday ? 'text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}>
              {col.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GanttTimeline;
