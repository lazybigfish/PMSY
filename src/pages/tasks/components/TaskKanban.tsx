import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Task, Profile, Project } from '../../../types';
import { Clock, AlertCircle } from 'lucide-react';
import { Avatar } from '../../../components/Avatar';
import { formatDateTime } from '../../../lib/utils';
import { taskService } from '../../../services/taskService';

export type KanbanGroupBy = 'status' | 'project' | 'priority' | 'assignee';

interface TaskWithDetails extends Task {
  project?: Project;
  assignees?: { user_id: string; is_primary: boolean; user: Profile }[];
  assignee_profiles?: Profile[];
}

interface TaskKanbanProps {
  tasks: TaskWithDetails[];
  groupBy: KanbanGroupBy;
  onGroupByChange: (groupBy: KanbanGroupBy) => void;
  onTaskClick: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  projects?: Project[];
  users?: Profile[];
}

const priorityLabels: Record<string, string> = {
  low: '低优先级',
  medium: '中优先级',
  high: '高优先级',
  urgent: '紧急'
};

const priorityColors: Record<string, string> = {
  low: 'bg-green-50 text-green-700 border-green-100',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  high: 'bg-red-50 text-red-700 border-red-100',
  urgent: 'bg-red-100 text-red-800 border-red-200'
};

const statusLabels: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  paused: '已暂停',
  canceled: '已取消',
  done: '已完成'
};

const statusColors: Record<string, string> = {
  todo: 'bg-gray-100 border-gray-200',
  in_progress: 'bg-blue-50 border-blue-200',
  paused: 'bg-yellow-50 border-yellow-200',
  canceled: 'bg-gray-50 border-gray-200',
  done: 'bg-green-50 border-green-200'
};

const isDueSoon = (task: Task): boolean => {
  if (!task.due_date || task.status === 'done') return false;
  const due = new Date(task.due_date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(now.getDate() + 3);
  threeDaysLater.setHours(23, 59, 59, 999);
  return due >= now && due <= threeDaysLater;
};

const isOverdue = (task: Task): boolean => {
  if (!task.due_date || task.status === 'done') return false;
  const due = new Date(task.due_date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return due < now;
};

const getTaskCardBorderClass = (task: Task): string => {
  if (isOverdue(task)) {
    return 'border-red-400 shadow-red-100';
  }
  if (isDueSoon(task)) {
    return 'border-yellow-400 shadow-yellow-100';
  }
  return 'border-gray-100';
};

const getDueDateDisplay = (task: Task) => {
  if (!task.due_date) return null;

  const isTaskOverdue = isOverdue(task);
  const isTaskDueSoon = isDueSoon(task);

  if (isTaskOverdue) {
    return (
      <div className="flex items-center text-xs text-red-600 font-semibold">
        <AlertCircle size={12} className="mr-1" />
        {new Date(task.due_date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
      </div>
    );
  }

  if (isTaskDueSoon) {
    return (
      <div className="flex items-center text-xs text-yellow-700 font-medium">
        <Clock size={12} className="mr-1" />
        {new Date(task.due_date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
      </div>
    );
  }

  return (
    <div className="flex items-center text-xs text-gray-400">
      <Clock size={12} className="mr-1" />
      {new Date(task.due_date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
    </div>
  );
};

const groupByOptions: { value: KanbanGroupBy; label: string }[] = [
  { value: 'status', label: '状态' },
  { value: 'project', label: '项目' },
  { value: 'priority', label: '优先级' },
  { value: 'assignee', label: '处理人' }
];

const defaultColumns = [
  { id: 'todo', label: '待办', color: 'bg-gray-100', borderColor: 'border-gray-200' },
  { id: 'in_progress', label: '进行中', color: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'paused', label: '已暂停', color: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  { id: 'done', label: '已完成', color: 'bg-green-50', borderColor: 'border-green-200' }
];

export const TaskKanban: React.FC<TaskKanbanProps> = ({
  tasks,
  groupBy,
  onGroupByChange,
  onTaskClick,
  onStatusChange,
  projects = [],
  users = []
}) => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState(tasks);

  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getGroupedColumns = () => {
    switch (groupBy) {
      case 'status':
        return defaultColumns.map(col => ({
          id: col.id,
          label: statusLabels[col.id] || col.id,
          color: statusColors[col.id] || 'bg-gray-100',
          borderColor: 'border-gray-200'
        }));
      
      case 'project':
        return projects.map(p => ({
          id: p.id,
          label: p.name,
          color: 'bg-purple-50',
          borderColor: 'border-purple-200'
        }));
      
      case 'priority':
        return ['urgent', 'high', 'medium', 'low'].map(p => ({
          id: p,
          label: priorityLabels[p],
          color: priorityColors[p],
          borderColor: 'border-gray-200'
        }));
      
      case 'assignee':
        const assigneeMap = new Map<string, { id: string; name: string }[]>();
        tasks.forEach(task => {
          task.assignees?.forEach(a => {
            if (!assigneeMap.has(a.user_id)) {
              assigneeMap.set(a.user_id, []);
            }
            assigneeMap.get(a.user_id)!.push({ id: a.user_id, name: a.user.full_name || '未知' });
          });
        });
        return Array.from(assigneeMap.entries()).map(([userId, userInfos]) => ({
          id: userId,
          label: userInfos[0]?.name || '未知',
          color: 'bg-indigo-50',
          borderColor: 'border-indigo-200'
        }));
      
      default:
        return defaultColumns;
    }
  };

  const getTasksForColumn = (columnId: string) => {
    switch (groupBy) {
      case 'status':
        return localTasks.filter(t => t.status === columnId);
      case 'project':
        return localTasks.filter(t => t.project_id === columnId);
      case 'priority':
        return localTasks.filter(t => t.priority === columnId);
      case 'assignee':
        return localTasks.filter(t => t.assignees?.some(a => a.user_id === columnId));
      default:
        return [];
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);

    if (!over) return;

    const taskId = active.id as string;
    const targetColumnId = over.id as string;

    if (groupBy === 'status') {
      const task = localTasks.find(t => t.id === taskId);
      if (task && task.status !== targetColumnId) {
        setLocalTasks(prev => 
          prev.map(t => t.id === taskId ? { ...t, status: targetColumnId as any } : t)
        );
        
        try {
          await taskService.updateTaskStatus(taskId, targetColumnId as any);
          onStatusChange?.(taskId, targetColumnId);
        } catch (error) {
          console.error('Failed to update task status:', error);
          setLocalTasks(tasks);
        }
      }
    } else if (groupBy === 'priority') {
      const task = localTasks.find(t => t.id === taskId);
      if (task && task.priority !== targetColumnId) {
        setLocalTasks(prev => 
          prev.map(t => t.id === taskId ? { ...t, priority: targetColumnId as any } : t)
        );
        
        try {
          await taskService.updateTask(taskId, { priority: targetColumnId as any });
        } catch (error) {
          console.error('Failed to update task priority:', error);
          setLocalTasks(tasks);
        }
      }
    }
  };

  const columns = getGroupedColumns();
  const activeTask = activeTaskId ? localTasks.find(t => t.id === activeTaskId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 p-4 border-b border-gray-200">
          <span className="text-sm text-gray-600">分栏:</span>
          <div className="flex gap-1">
            {groupByOptions.map(option => (
              <button
                key={option.value}
                onClick={() => onGroupByChange(option.value)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  groupBy === option.value
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full gap-4 p-4 min-w-max">
            {columns.map((col) => {
              const colTasks = getTasksForColumn(col.id);
              
              return (
                <DroppableColumn
                  key={col.id}
                  column={col}
                  tasks={colTasks}
                  groupBy={groupBy}
                  onTaskClick={onTaskClick}
                />
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90 transform rotate-3">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

interface DroppableColumnProps {
  column: { id: string; label: string; color: string; borderColor: string };
  tasks: TaskWithDetails[];
  groupBy: KanbanGroupBy;
  onTaskClick: (taskId: string) => void;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({
  column,
  tasks,
  groupBy,
  onTaskClick
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    disabled: groupBy !== 'status' && groupBy !== 'priority'
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 flex flex-col rounded-lg ${column.color} border ${column.borderColor} transition-colors ${isOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
    >
      <div className="p-3 font-semibold text-gray-700 flex justify-between items-center border-b border-white/50">
        {column.label}
        <span className="bg-white/50 px-2 py-0.5 rounded text-xs text-gray-600">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task.id)}
            groupBy={groupBy}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            暂无任务
          </div>
        )}
      </div>
    </div>
  );
};

import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableTaskCardProps {
  task: TaskWithDetails;
  onClick: () => void;
  groupBy: KanbanGroupBy;
}

const DraggableTaskCard: React.FC<DraggableTaskCardProps> = ({
  task,
  onClick,
  groupBy
}) => {
  const isDraggable = groupBy === 'status' || groupBy === 'priority';
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task.id,
    disabled: !isDraggable
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isDraggable ? listeners : {})}
      className={`bg-white p-3 rounded shadow-sm border-2 hover:shadow-md transition-all cursor-pointer ${getTaskCardBorderClass(task)} ${isDragging ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <TaskCardContent task={task} />
    </div>
  );
};

const TaskCard: React.FC<{ task: TaskWithDetails; onClick: () => void }> = ({ task, onClick }) => (
  <div
    className={`bg-white p-3 rounded shadow-md border-2 cursor-pointer ${getTaskCardBorderClass(task)}`}
    onClick={onClick}
  >
    <TaskCardContent task={task} />
  </div>
);

const TaskCardContent: React.FC<{ task: TaskWithDetails }> = ({ task }) => (
  <>
    <div className="flex justify-between items-start mb-2">
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border
        ${task.priority === 'high' || task.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-100' :
          task.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
          'bg-green-50 text-green-700 border-green-100'}`}>
        {priorityLabels[task.priority || 'medium']}
      </span>
      {task.is_public && (
        <span className="text-[10px] text-purple-600 font-medium bg-purple-50 px-1 rounded">
          公开
        </span>
      )}
    </div>

    <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{task.title}</h4>
    
    {task.created_at && (
      <div className="text-xs text-gray-400 mb-2">
        {formatDateTime(task.created_at)}
      </div>
    )}

    <div className="flex items-center justify-between mt-2">
      <div className="flex -space-x-2">
        {task.assignees?.slice(0, 3).map((a) => (
          <Avatar
            key={a.user_id}
            userId={a.user.id}
            avatarUrl={a.user.avatar_url}
            name={a.user.full_name}
            size="xs"
            className="border-2 border-white"
          />
        ))}
        {(!task.assignees || task.assignees.length === 0) && (
           <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">?</div>
        )}
        {(task.assignees?.length || 0) > 3 && (
          <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">
            +{(task.assignees?.length || 0) - 3}
          </div>
        )}
      </div>

      {getDueDateDisplay(task)}
    </div>
  </>
);
