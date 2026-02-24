import React, { useMemo } from 'react';
import type { GanttTask, GanttColumn, GanttViewMode } from '../../types/gantt';

interface GanttDependencyLinesProps {
  tasks: GanttTask[];
  columns: GanttColumn[];
  columnWidth: number;
  rowHeight: number;
  viewMode: GanttViewMode;
}

export function GanttDependencyLines({
  tasks,
  columns,
  columnWidth,
  rowHeight,
  viewMode,
}: GanttDependencyLinesProps) {
  const lines = useMemo(() => {
    const taskMap = new Map<string, { task: GanttTask; index: number }>();
    tasks.forEach((task, index) => {
      taskMap.set(task.id, { task, index });
    });

    const result: Array<{
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
    }> = [];

    tasks.forEach((task, taskIndex) => {
      if (!task.dependencies || task.dependencies.length === 0) return;
      if (!task.startDate) return;

      const toX = task.startDate.getTime();
      const toY = taskIndex * rowHeight + rowHeight / 2;

      task.dependencies.forEach((depId) => {
        const fromTask = taskMap.get(depId);
        if (!fromTask || !fromTask.task.endDate) return;

        const fromX = fromTask.task.endDate.getTime();
        const fromY = fromTask.index * rowHeight + rowHeight / 2;

        const toDateX = task.startDate!.getTime();
        const toDateY = taskIndex * rowHeight + rowHeight / 2;

        let startCol = -1;
        let endCol = -1;

        for (let i = 0; i < columns.length; i++) {
          const colDate = new Date(columns[i].date).getTime();
          if (colDate <= fromX && (!columns[i + 1] || new Date(columns[i + 1].date).getTime() > fromX)) {
            startCol = i;
          }
          if (colDate <= toDateX && (!columns[i + 1] || new Date(columns[i + 1].date).getTime() > toDateX)) {
            endCol = i;
            break;
          }
        }

        if (startCol === -1 || endCol === -1) return;

        const x1 = startCol * columnWidth + columnWidth;
        const x2 = endCol * columnWidth;

        result.push({
          fromX: x1,
          fromY: fromY,
          toX: x2,
          toY: toDateY,
        });
      });
    });

    return result;
  }, [tasks, columns, columnWidth, rowHeight]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        width: columns.length * columnWidth,
        height: tasks.length * rowHeight,
      }}
    >
      {lines.map((line, i) => {
        const midX = (line.fromX + line.toX) / 2;
        const path = `
          M ${line.fromX} ${line.fromY}
          L ${line.fromX + 15} ${line.fromY}
          L ${line.fromX + 15} ${line.toY}
          L ${line.toX - 5} ${line.toY}
        `;

        return (
          <g key={i}>
            <path
              d={path}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="4 2"
              opacity={0.7}
            />
            <polygon
              points={`${line.toX},${line.toY} ${line.toX - 8},${line.toY - 4} ${line.toX - 8},${line.toY + 4}`}
              fill="#8b5cf6"
              opacity={0.7}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default GanttDependencyLines;
