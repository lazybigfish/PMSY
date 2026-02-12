import React from 'react';
import { Task, Profile, Project } from '../../../types';
import { Clock } from 'lucide-react';

interface TaskWithDetails extends Task {
  project?: Project;
  assignees?: { user_id: string; is_primary: boolean; user: Profile }[];
  assignee_profiles?: Profile[];
}

interface TaskKanbanProps {
  tasks: TaskWithDetails[];
  onTaskClick: (taskId: string) => void;
}

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100', borderColor: 'border-gray-200' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'paused', label: 'Paused', color: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  { id: 'canceled', label: 'Canceled', color: 'bg-gray-50', borderColor: 'border-gray-200' },
  { id: 'done', label: 'Done', color: 'bg-green-50', borderColor: 'border-green-200' },
];

export const TaskKanban: React.FC<TaskKanbanProps> = ({ tasks, onTaskClick }) => {
  return (
    <div className="flex h-full overflow-x-auto gap-4 pb-4">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        
        return (
          <div key={col.id} className={`flex-shrink-0 w-80 flex flex-col rounded-lg ${col.color} border ${col.borderColor}`}>
            <div className="p-3 font-semibold text-gray-700 flex justify-between items-center border-b border-white/50">
              {col.label}
              <span className="bg-white/50 px-2 py-0.5 rounded text-xs text-gray-600">
                {colTasks.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {colTasks.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  className="bg-white p-3 rounded shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border
                      ${task.priority === 'high' ? 'bg-red-50 text-red-700 border-red-100' : 
                        task.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 
                        'bg-green-50 text-green-700 border-green-100'}`}>
                      {task.priority.toUpperCase()}
                    </span>
                    {task.is_public && (
                      <span className="text-[10px] text-purple-600 font-medium bg-purple-50 px-1 rounded">
                        PUB
                      </span>
                    )}
                  </div>
                  
                  <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{task.title}</h4>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex -space-x-2">
                      {task.assignees?.map((a) => (
                        <div key={a.user_id} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 overflow-hidden" title={a.user.full_name}>
                          {a.user.avatar_url ? (
                            <img src={a.user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            a.user.full_name?.[0] || 'U'
                          )}
                        </div>
                      ))}
                      {(!task.assignees || task.assignees.length === 0) && (
                         <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">?</div>
                      )}
                    </div>
                    
                    {task.due_date && (
                      <div className={`flex items-center text-xs ${new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        <Clock size={12} className="mr-1" />
                        {new Date(task.due_date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
