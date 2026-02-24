import { useMemo, useState } from 'react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  isWeekend,
  isToday,
  differenceInDays,
  addDays,
  min,
  max,
  isSameDay,
  isBefore,
  isAfter,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { TaskDetail } from '../types/task';
import type { GanttTask, GanttColumn, GanttViewMode, GanttConfig } from '../types/gantt';
import { DEFAULT_GANTT_CONFIG } from '../types/gantt';

interface UseGanttOptions {
  tasks: TaskDetail[];
  config?: Partial<typeof DEFAULT_GANTT_CONFIG>;
  dependencies?: Map<string, { dependencies: any[]; dependents: any[] }>;
}

interface UseGanttReturn {
  ganttTasks: GanttTask[];
  columns: GanttColumn[];
  config: GanttConfig;
  dateRange: { start: Date; end: Date };
  viewMode: GanttViewMode;
  setViewMode: (mode: GanttViewMode) => void;
}

export function useGantt({ tasks, config, dependencies }: UseGanttOptions): UseGanttReturn {
  const [viewMode, setViewModeState] = useState<GanttViewMode>(config?.viewMode || 'week');
  const mergedConfig = { ...DEFAULT_GANTT_CONFIG, ...config };
  const { columnWidth } = mergedConfig;

  const ganttTasks = useMemo(() => {
    return tasks
      .filter((task) => task.start_date || task.due_date)
      .map((task) => {
        const taskDeps = dependencies?.get(task.id);
        
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        
        if (task.start_date) {
          startDate = new Date(task.start_date);
        }
        if (task.due_date) {
          endDate = new Date(task.due_date);
        }
        
        // 如果只有开始日期，默认持续3天
        if (startDate && !endDate) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 3);
        }
        
        // 如果只有截止日期，默认从3天前开始
        if (!startDate && endDate) {
          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 3);
        }
        
        return {
          id: task.id,
          title: task.title,
          startDate,
          endDate,
          progress: 0,
          status: task.status,
          priority: task.priority,
          assignees: task.assignees,
          dependencies: taskDeps?.dependencies.map(d => d.depends_on_task_id) || [],
        };
      });
  }, [tasks, dependencies]);

  const dateRange = useMemo(() => {
    if (ganttTasks.length === 0) {
      const now = new Date();
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    }

    const dates = ganttTasks.flatMap((task) => [
      task.startDate,
      task.endDate,
    ].filter(Boolean) as Date[]);

    const minDate = min(dates);
    const maxDate = max(dates);

    let start: Date;
    let end: Date;

    switch (viewMode) {
      case 'day':
        start = addDays(startOfWeek(minDate, { weekStartsOn: 1 }), -7);
        end = addDays(endOfWeek(maxDate, { weekStartsOn: 1 }), 7);
        break;
      case 'week':
        start = startOfMonth(startOfWeek(minDate, { weekStartsOn: 1 }));
        end = endOfWeek(endOfMonth(maxDate), { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(startOfMonth(minDate));
        end = endOfMonth(endOfMonth(maxDate));
        break;
      default:
        start = startOfWeek(minDate, { weekStartsOn: 1 });
        end = endOfWeek(maxDate, { weekStartsOn: 1 });
    }

    return { start, end };
  }, [ganttTasks, viewMode]);

  const columns = useMemo(() => {
    let columnDates: Date[] = [];

    switch (viewMode) {
      case 'day':
        columnDates = eachDayOfInterval(dateRange);
        break;
      case 'week':
        columnDates = eachWeekOfInterval(dateRange, { weekStartsOn: 1 });
        break;
      case 'month':
        columnDates = eachMonthOfInterval(dateRange);
        break;
    }

    const today = new Date();

    return columnDates.map((date) => {
      let label: string;
      switch (viewMode) {
        case 'day':
          label = format(date, 'MM/dd', { locale: zhCN });
          break;
        case 'week':
          label = format(date, 'MM/dd', { locale: zhCN });
          break;
        case 'month':
          label = format(date, 'yyyy年MM月', { locale: zhCN });
          break;
        default:
          label = format(date, 'MM/dd');
      }

      return {
        date,
        label,
        isWeekend: viewMode === 'day' && isWeekend(date),
        isToday: isSameDay(date, today),
        isFirstDayOfMonth: viewMode === 'day' && date.getDate() === 1,
      };
    });
  }, [dateRange, viewMode]);

  const setViewMode = (mode: GanttViewMode) => {
    setViewModeState(mode);
  };

  return {
    ganttTasks,
    columns,
    config: mergedConfig,
    dateRange,
    viewMode,
    setViewMode,
  };
}

export function getTaskBarPosition(
  task: GanttTask,
  columns: GanttColumn[],
  viewMode: GanttViewMode,
  columnWidth: number
): { left: number; width: number } | null {
  if (!task.startDate || !task.endDate || columns.length === 0) {
    return null;
  }

  const taskStart = new Date(task.startDate);
  const taskEnd = new Date(task.endDate);
  taskStart.setHours(0, 0, 0, 0);
  taskEnd.setHours(0, 0, 0, 0);

  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < columns.length; i++) {
    const colDate = new Date(columns[i].date);
    colDate.setHours(0, 0, 0, 0);

    if (startIndex === -1 && (isSameDay(colDate, taskStart) || colDate.getTime() >= taskStart.getTime())) {
      startIndex = i;
    }

    if (colDate.getTime() <= taskEnd.getTime()) {
      endIndex = i;
    }
  }

  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    return null;
  }

  const left = startIndex * columnWidth;
  const width = Math.max((endIndex - startIndex + 1) * columnWidth, columnWidth / 2);

  return { left, width };
}

export function getTodayColumnIndex(columns: GanttColumn[]): number {
  return columns.findIndex((col) => col.isToday);
}
