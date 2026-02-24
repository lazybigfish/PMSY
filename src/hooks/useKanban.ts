import { useState, useMemo, useCallback } from 'react';
import type { Task, TaskStatus, TaskPriority } from '../types/task';
import { taskService } from '../services/taskService';
import {
  type KanbanGroupBy,
  type KanbanColumn,
  type KanbanTask,
  type KanbanGroup,
  DEFAULT_STATUS_COLUMNS,
  DEFAULT_PRIORITY_COLUMNS,
} from '../types/kanban';

interface UseKanbanOptions {
  projectId: string;
  tasks: Task[];
  onError?: (error: Error) => void;
}

interface UseKanbanReturn {
  columns: KanbanColumn[];
  groups: KanbanGroup[];
  groupBy: KanbanGroupBy;
  isLoading: boolean;
  setGroupBy: (groupBy: KanbanGroupBy) => void;
  moveTask: (taskId: string, targetValue: string) => Promise<void>;
}

export function useKanban({ tasks, onError }: UseKanbanOptions): UseKanbanReturn {
  const [groupBy, setGroupBy] = useState<KanbanGroupBy>('status');
  const [isLoading, setIsLoading] = useState(false);

  const columns = useMemo(() => {
    return groupBy === 'status' ? DEFAULT_STATUS_COLUMNS : DEFAULT_PRIORITY_COLUMNS;
  }, [groupBy]);

  const kanbanTasks = useMemo(() => {
    return tasks.map((task) => {
      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
      return {
        ...task,
        isOverdue,
      } as KanbanTask;
    });
  }, [tasks]);

  const groups = useMemo((): KanbanGroup[] => {
    return columns.map((column) => {
      const columnTasks = kanbanTasks.filter((task) => {
        if (groupBy === 'status') {
          return task.status === column.value;
        } else if (groupBy === 'priority') {
          return task.priority === column.value;
        }
        return false;
      });
      return {
        column,
        tasks: columnTasks,
      };
    });
  }, [columns, kanbanTasks, groupBy]);

  const moveTask = useCallback(async (taskId: string, targetValue: string) => {
    setIsLoading(true);
    try {
      let updateData: Partial<Task> = {};

      if (groupBy === 'status') {
        updateData = { status: targetValue as TaskStatus };
      } else if (groupBy === 'priority') {
        updateData = { priority: targetValue as TaskPriority };
      }

      await taskService.updateTask(taskId, updateData);
    } catch (error) {
      console.error('Failed to move task:', error);
      onError?.(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [groupBy, onError]);

  return {
    columns,
    groups,
    groupBy,
    isLoading,
    setGroupBy,
    moveTask,
  };
}
